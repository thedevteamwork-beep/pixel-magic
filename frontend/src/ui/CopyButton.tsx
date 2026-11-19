"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type CopyButtonProps = {
  text: string;
  /** e.g. "Copy prompt". */
  label?: string;
  className?: string;
};

const COPIED_MS = 1_600;

/** Copies `text` to the clipboard and confirms it for a moment. */
export function CopyButton({ text, label = "Copy", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => setState("idle"), COPIED_MS);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] text-muted transition-colors hover:bg-overlay-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        state === "copied" && "text-primary hover:text-primary",
        className,
      )}
    >
      {state === "copied" ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Couldn’t copy" : label}</span>
    </button>
  );
}
