"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { ImageLog, ScanStatus, TopLabel } from "../types";
import { fetchRecentImages } from "../api/moderationApi";

const getBackendUrl = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const getSocketUrl = (): string => process.env.NEXT_PUBLIC_SOCKET_URL ?? getBackendUrl();

const isScanStatus = (value: unknown): value is ScanStatus => {
  return value === "PENDING" || value === "SAFE" || value === "UNSAFE" || value === "ERROR";
};

const isImageLog = (value: unknown): value is ImageLog => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.id === "string" &&
    typeof v.imageUrl === "string" &&
    isScanStatus(v.status) &&
    typeof v.createdAt === "string" &&
    (v.nsfwScore === null || typeof v.nsfwScore === "number" || v.nsfwScore === undefined) &&
    (v.violenceScore === null || typeof v.violenceScore === "number" || v.violenceScore === undefined) &&
    (v.processedTimeMs === null || typeof v.processedTimeMs === "number" || v.processedTimeMs === undefined)
  );
};

const normalizeTopLabels = (value: unknown): TopLabel[] | null => {
  if (!Array.isArray(value)) return null;

  const labels: TopLabel[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.label !== "string") continue;
    if (typeof record.score !== "number" || !Number.isFinite(record.score)) continue;
    labels.push({ label: record.label, score: record.score });
  }

  return labels.length > 0 ? labels.slice(0, 3) : null;
};

const upsertByIdDesc = (prev: ImageLog[], next: ImageLog): ImageLog[] => {
  const existingIndex = prev.findIndex((item) => item.id === next.id);
  if (existingIndex >= 0) {
    const copy = prev.slice();
    copy[existingIndex] = next;
    return copy;
  }

  return [next, ...prev].slice(0, 200);
};

export type ModerationSocketState = "connecting" | "connected" | "disconnected";

export type ModerationDashboardState = {
  images: ImageLog[];
  loading: boolean;
  error: string | null;
  socketState: ModerationSocketState;
  refresh: () => Promise<void>;
};

export const useModerationDashboard = (): ModerationDashboardState => {
  const [images, setImages] = useState<ImageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<ModerationSocketState>("connecting");

  const backendUrl = useMemo(() => getBackendUrl(), []);
  const socketUrl = useMemo(() => getSocketUrl(), []);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextImages = await fetchRecentImages(50);
      setImages(
        nextImages.map((image) => ({
          ...image,
          createdAt: typeof image.createdAt === "string" ? image.createdAt : new Date(image.createdAt).toISOString(),
          topLabels: normalizeTopLabels((image as unknown as Record<string, unknown>).topLabels),
        })),
      );
      setError(null);
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error("Failed to refresh images", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSocketState("connecting");

    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => setSocketState("connected"));
    socket.on("disconnect", () => setSocketState("disconnected"));
    socket.on("connected", () => setSocketState("connected"));

    socket.on("image:processed", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;

      const parsed = payload as { success?: unknown; data?: unknown };
      const data = parsed.data;

      if (parsed.success !== true || !isImageLog(data)) return;

      setImages((prev) =>
        upsertByIdDesc(prev, {
          ...data,
          createdAt: data.createdAt,
          topLabels: normalizeTopLabels((data as unknown as Record<string, unknown>).topLabels),
        }),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [socketUrl]);

  return {
    images,
    loading,
    error,
    socketState,
    refresh,
  };
};
