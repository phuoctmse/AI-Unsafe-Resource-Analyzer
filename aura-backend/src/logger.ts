import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogBase = {
  ts: string;
  level: LogLevel;
  service: "aura-backend";
  event: string;
  requestId?: string;
};

export const getRequestId = (maybeHeader: string | undefined): string => {
  if (maybeHeader && maybeHeader.trim().length > 0) return maybeHeader.trim();
  return randomUUID();
};

export const log = (level: LogLevel, event: string, fields: Record<string, unknown> = {}) => {
  const base: LogBase = {
    ts: new Date().toISOString(),
    level,
    service: "aura-backend",
    event,
  };

  // Single-line JSON for Loki-friendly ingestion.
  // Avoid logging secrets (presigned URLs, keys, tokens).
  console.log(JSON.stringify({ ...base, ...fields }));
};

