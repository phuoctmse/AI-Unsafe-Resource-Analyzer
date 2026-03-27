"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AlertTriangle, CheckCircle2, Clock, RefreshCcw, ShieldAlert } from "lucide-react";

import type { ApiResponse, ImageLog, ScanStatus, TopLabel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const getBackendUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const getSocketUrl = () => process.env.NEXT_PUBLIC_SOCKET_URL ?? getBackendUrl();

const statusMeta = (status: ScanStatus) => {
  switch (status) {
    case "SAFE":
      return { label: "SAFE", badge: "success" as const, icon: CheckCircle2 };
    case "UNSAFE":
      return { label: "UNSAFE", badge: "danger" as const, icon: ShieldAlert };
    case "ERROR":
      return { label: "ERROR", badge: "warning" as const, icon: AlertTriangle };
    case "PENDING":
    default:
      return { label: "PENDING", badge: "muted" as const, icon: Clock };
  }
};

const upsertByIdDesc = (prev: ImageLog[], next: ImageLog): ImageLog[] => {
  const existingIdx = prev.findIndex((x) => x.id === next.id);
  if (existingIdx >= 0) {
    const copy = prev.slice();
    copy[existingIdx] = next;
    return copy;
  }
  return [next, ...prev].slice(0, 200);
};

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
    const r = item as Record<string, unknown>;
    if (typeof r.label !== "string") continue;
    if (typeof r.score !== "number" || !Number.isFinite(r.score)) continue;
    labels.push({ label: r.label, score: r.score });
  }
  return labels.length ? labels.slice(0, 3) : null;
};

export const DashboardClient = () => {
  const [images, setImages] = useState<ImageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const socketUrl = useMemo(() => getSocketUrl(), []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/images?limit=50`, { cache: "no-store" });
      if (!res.ok) {
        setError(`Network error: ${res.status} ${res.statusText}`);
        return;
      }

      const json = (await res.json()) as ApiResponse<ImageLog[]>;
      if (json.success) {
        setImages(
          json.data.map((img) => ({
            ...img,
            createdAt: typeof img.createdAt === "string" ? img.createdAt : new Date(img.createdAt).toISOString(),
            topLabels: normalizeTopLabels((img as unknown as Record<string, unknown>).topLabels),
          })),
        );
        setError(null);
      } else {
        setError("Failed to load images");
      }
    } catch (err) {
      // swallow and log to avoid unhandled promise rejection noise
      // eslint-disable-next-line no-console
      console.error("Failed to refresh images", err);
      setError(err instanceof Error ? err.message : String(err));
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

    socket.on("connected", () => {
      setSocketState("connected");
    });

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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Aura Dashboard</h1>
          <p className="text-sm text-slate-300">
            Live moderation stream via <span className="font-medium text-slate-200">Socket.io</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={socketState === "connected" ? "success" : socketState === "connecting" ? "muted" : "warning"}>
            {socketState}
          </Badge>
          {error ? (
            <Badge variant="danger" className="max-w-xs truncate">
              {error}
            </Badge>
          ) : null}
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent images</CardTitle>
          <div className="text-xs text-slate-400">{loading ? "Loading…" : `${images.length} items`}</div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Image</th>
                <th className="px-2 py-2">Scores</th>
                <th className="px-2 py-2">Processed</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => {
                const meta = statusMeta(img.status);
                const Icon = meta.icon;
                return (
                  <tr key={img.id} className="border-t border-white/10 text-sm">
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge variant={meta.badge}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </Badge>
                        {img.topLabels && img.topLabels.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {img.topLabels.slice(0, 3).map((l) => (
                              <Badge key={l.label} variant="muted" className="font-mono">
                                {l.label} {l.score.toFixed(2)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="font-mono text-xs text-slate-300">{img.id}</div>
                        <a
                          className="line-clamp-1 text-sm text-indigo-200 hover:text-indigo-100"
                          href={img.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {img.imageUrl}
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-300">
                      <div className="flex flex-col gap-1">
                        <div>nsfw: {img.nsfwScore ?? "—"}</div>
                        <div>violence: {img.violenceScore ?? "—"}</div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-300">
                      {img.processedTimeMs != null ? `${img.processedTimeMs}ms` : "—"}
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-300">
                      {new Date(img.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {!loading && images.length === 0 ? (
                <tr>
                  <td className="px-2 py-10 text-center text-sm text-slate-400" colSpan={5}>
                    No images yet. Upload one and call <span className="font-mono">/uploads/complete</span> to enqueue.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
};

