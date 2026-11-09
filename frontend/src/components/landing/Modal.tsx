"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";
type ModalProps = { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string };

/** Native dialog provides focus trapping, Escape and focus restoration. */
export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);

  return <dialog ref={dialogRef} className={`${styles.dialog} ${className}`} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    {open && <><div className={styles.header}><h2 id={titleId}>{title}</h2>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close preview" autoFocus><X size={17} aria-hidden="true" /></button>
    </div>{children}</>}
  </dialog>;
}
