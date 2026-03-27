"use client";

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "danger" | "muted";
};

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  const variantClass =
    variant === "success"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
      : variant === "warning"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
        : variant === "danger"
          ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
          : variant === "muted"
            ? "border-white/10 bg-white/5 text-slate-300"
            : "border-indigo-500/30 bg-indigo-500/15 text-indigo-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClass,
        className,
      )}
      {...props}
    />
  );
};

