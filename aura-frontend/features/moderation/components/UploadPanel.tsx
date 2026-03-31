"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { uploadAndScan } from "../api/uploadApi";

type UploadStep = "presigning" | "uploading" | "queuing";
type UploadState =
  | { status: "idle" }
  | { status: "uploading"; step: UploadStep; filename: string }
  | { status: "done"; imageId: string; filename: string }
  | { status: "error"; message: string; filename: string };

const STEP_LABEL: Record<UploadStep, string> = {
  presigning: "Requesting upload URL…",
  uploading: "Uploading to storage…",
  queuing: "Queuing for scan…",
};

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";

export const UploadPanel = () => {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setState({ status: "error", message: "Only image files are supported.", filename: file.name });
      return;
    }

    setState({ status: "uploading", step: "presigning", filename: file.name });

    try {
      const { imageId } = await uploadAndScan(file, (step) => {
        setState({ status: "uploading", step, filename: file.name });
      });
      setState({ status: "done", imageId, filename: file.name });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
        filename: file.name,
      });
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // reset so same file can be re-uploaded
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const reset = () => setState({ status: "idle" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload image for scan</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload image drop zone"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
            dragOver
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-white/15 bg-white/3 hover:border-white/25 hover:bg-white/5",
            state.status === "uploading" && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus className="h-8 w-8 text-slate-400" aria-hidden />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">Drop an image or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP, GIF</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          aria-hidden
          onChange={onInputChange}
        />

        {/* Status feedback */}
        {state.status === "uploading" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" aria-hidden />
            <span>
              <span className="font-medium text-slate-100">{state.filename}</span>
              {" — "}
              {STEP_LABEL[state.step]}
            </span>
          </div>
        )}

        {state.status === "done" && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">{state.filename}</span> queued for scan.
                Result will appear in the dashboard below.
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0 text-xs">
              Upload another
            </Button>
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">{state.filename}</span>: {state.message}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0 text-xs">
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
