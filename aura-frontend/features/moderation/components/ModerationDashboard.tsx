"use client";

import { AlertTriangle, CheckCircle2, Clock, RefreshCcw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ImageLog, ScanStatus } from "../types";
import { useModerationDashboard } from "../hooks/useModerationDashboard";

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

const renderTopLabels = (image: ImageLog) => {
  if (!image.topLabels || image.topLabels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {image.topLabels.slice(0, 3).map((label) => (
        <Badge key={label.label} variant="muted" className="font-mono">
          {label.label} {label.score.toFixed(2)}
        </Badge>
      ))}
    </div>
  );
};

export const ModerationDashboard = () => {
  const { images, loading, error, socketState, refresh } = useModerationDashboard();

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
          <table className="w-full min-w-180 border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Image</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Scores</th>
                <th className="px-2 py-2">Processed</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image) => {
                const meta = statusMeta(image.status);
                const Icon = meta.icon;

                return (
                  <tr key={image.id} className="border-t border-white/10 text-sm">
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge variant={meta.badge}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </Badge>
                        {renderTopLabels(image)}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="font-mono text-xs text-slate-300">{image.id}</div>
                        <a
                          className="line-clamp-1 text-sm text-indigo-200 hover:text-indigo-100"
                          href={image.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {image.imageUrl}
                        </a>
                      </div>
                    </td>
                    <td className="max-w-55 px-2 py-3 text-xs leading-snug text-slate-300">
                      <div className="line-clamp-3">{image.reasonShort ?? "—"}</div>
                      {image.modelVersion ? (
                        <div className="mt-1 font-mono text-[10px] text-slate-500">
                          {image.modelVersion}
                          {image.thresholdsVersion ? ` · ${image.thresholdsVersion}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-300">
                      <div className="flex flex-col gap-1">
                        <div>nsfw: {image.nsfwScore ?? "—"}</div>
                        <div>violence: {image.violenceScore ?? "—"}</div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-300">
                      {image.processedTimeMs != null ? `${image.processedTimeMs}ms` : "—"}
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-300">{new Date(image.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}

              {!loading && images.length === 0 ? (
                <tr>
                  <td className="px-2 py-10 text-center text-sm text-slate-400" colSpan={6}>
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
