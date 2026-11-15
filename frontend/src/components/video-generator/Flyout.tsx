"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Flyout.module.css";

type FlyoutProps = {
  /** Accessible name of the trigger, e.g. "Model: Seedance 2.5". */
  label: string;
  trigger: ReactNode;
  triggerClassName: string;
  /** "right" opens beside the trigger on wide screens and falls back to below. */
  placement: "below" | "right";
  /** Panel width in px; "trigger" matches the trigger's width. */
  width: number | "trigger";
  panelLabel: string;
  role?: "listbox" | "dialog";
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
};

const GAP = 8;
const EDGE = 8;

/** Native popover: top layer, light dismiss, Escape and focus return come from the platform. */
export function Flyout({ label, trigger, triggerClassName, placement, width, panelLabel, role = "dialog", disabled = false, children }: FlyoutProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    function place(event: Event) {
      const toggle = event as ToggleEvent;
      const anchor = triggerRef.current;
      if (toggle.newState !== "open" || !anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = Math.min(width === "trigger" ? rect.width : width, viewportWidth - EDGE * 2);
      const style = panel.style;
      style.width = `${panelWidth}px`;
      style.top = style.bottom = style.left = "auto";
      let side = placement;
      if (side === "right" && viewportWidth - rect.right - GAP - EDGE < panelWidth) side = "below";
      if (side === "right") {
        style.left = `${rect.right + GAP}px`;
        const below = viewportHeight - rect.top - EDGE;
        if (below >= 340) { style.top = `${rect.top}px`; style.maxHeight = `${below}px`; }
        else { style.bottom = `${viewportHeight - rect.bottom}px`; style.maxHeight = `${rect.bottom - EDGE}px`; }
      } else {
        style.left = `${Math.min(Math.max(rect.left, EDGE), viewportWidth - panelWidth - EDGE)}px`;
        const below = viewportHeight - rect.bottom - GAP - EDGE;
        const above = rect.top - GAP - EDGE;
        if (below >= 280 || below >= above) { style.top = `${rect.bottom + GAP}px`; style.maxHeight = `${below}px`; }
        else { style.bottom = `${viewportHeight - rect.top + GAP}px`; style.maxHeight = `${above}px`; }
      }
      panel.dataset.side = side;
    }
    function toggled(event: Event) {
      const isOpen = (event as ToggleEvent).newState === "open";
      setOpen(isOpen);
      if (isOpen) requestAnimationFrame(() => {
        const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>('[aria-selected="true"]') ?? panel?.querySelector<HTMLElement>("button:not(:disabled), input");
        target?.focus();
      });
    }
    panel.addEventListener("beforetoggle", place);
    panel.addEventListener("toggle", toggled);
    return () => { panel.removeEventListener("beforetoggle", place); panel.removeEventListener("toggle", toggled); };
  }, [placement, width]);

  // A fixed panel would drift from its trigger, so close it when the page moves.
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.type === "scroll" && event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      panelRef.current?.hidePopover();
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [open]);

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
    items[next].scrollIntoView({ block: "nearest" });
  }

  return <>
    <button ref={triggerRef} type="button" className={triggerClassName} popoverTarget={id} disabled={disabled}
      aria-haspopup={role} aria-expanded={open} aria-label={label} data-open={open}>
      {trigger}
    </button>
    <div ref={panelRef} id={id} popover="auto" className={styles.panel} role={role} aria-label={panelLabel} onKeyDown={navigate}>
      {open && children(() => document.getElementById(id)?.hidePopover())}
    </div>
  </>;
}
