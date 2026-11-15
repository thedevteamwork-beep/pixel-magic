"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Extra classes for the dialog box, for example a feature's own width. */
  className?: string;
};

const dialogClasses = cn(
  "fixed inset-0 m-auto max-h-[90dvh] w-[min(960px,calc(100%-32px))] overflow-auto overscroll-contain p-0",
  "rounded-[var(--radius-panel)] border border-border-strong bg-surface text-foreground",
  "shadow-[0_30px_100px_color-mix(in_srgb,var(--shadow-color)_45%,transparent)]",
  "backdrop:bg-[color-mix(in_srgb,var(--media-ink)_88%,transparent)] backdrop:backdrop-blur-[10px]",
  "max-[600px]:w-[calc(100%-24px)] max-[600px]:rounded-[var(--radius-card)]",
);

/** Native dialog provides focus trapping, Escape and focus restoration. */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(dialogClasses, className)}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      {open && (
        <>
          <div className="flex items-center justify-between gap-5 border-b border-border px-5 py-[17px] max-[600px]:px-3.5 max-[600px]:py-3">
            <h2 id={titleId} className="m-0 text-[13px] font-medium">
              {title}
            </h2>
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-raised text-foreground hover:border-primary hover:text-primary"
              onClick={onClose}
              aria-label="Close preview"
              autoFocus
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
