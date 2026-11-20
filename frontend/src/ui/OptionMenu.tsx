"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type MenuOption<T extends string> = { value: T; label: string; icon?: ReactNode; hint?: string };

type OptionMenuProps<T extends string> = {
  /** What the choice is, e.g. "Aspect ratio": the button's name and the menu's title. */
  label: string;
  /** Shown before the value in the button. */
  icon?: ReactNode;
  value: T;
  options: readonly MenuOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Lay options out as a grid of tiles (icon above label) with this many columns; a list otherwise. */
  columns?: number;
  className?: string;
};

const GAP = 8;
const EDGE = 12;

/**
 * A compact chip showing a choice ("◇ High") that opens a menu of the other
 * options above it. The menu is fixed-positioned, so it is never cut off by a
 * scrolling parent. Escape, an outside click or scrolling close it.
 */
export function OptionMenu<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
  disabled = false,
  columns,
  className,
}: OptionMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [left, setLeft] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  function toggle() {
    if (open) return close(false);
    setAnchor(buttonRef.current?.getBoundingClientRect() ?? null);
    setOpen(true);
  }

  // Keep the menu on screen, then put focus on the current choice.
  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) return;
    const width = menuRef.current.offsetWidth;
    setLeft(Math.max(EDGE, Math.min(anchor.left, window.innerWidth - width - EDGE)));
    menuRef.current.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    const away = () => close(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [open, close]);

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close(true);
      return;
    }
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in keys) && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = columns && (event.key === "ArrowDown" || event.key === "ArrowUp") ? columns : 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : Math.min(items.length - 1, Math.max(0, current + keys[event.key] * step));
    items[next]?.focus();
  }

  if (!selected) return null;
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label}: ${selected.label}`}
        title={label}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-transparent bg-overlay-hover px-3",
          "text-[length:var(--fs-md)] whitespace-nowrap text-foreground transition-colors",
          "hover:border-border-strong aria-expanded:border-[color-mix(in_srgb,var(--primary)_55%,transparent)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
          className,
        )}
      >
        {icon && <span className="grid place-items-center text-muted">{icon}</span>}
        {selected.label}
        <ChevronDown size={13} aria-hidden="true" className="-mr-1 text-muted" />
      </button>
      {open && anchor && (
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-label={label}
          onKeyDown={onMenuKey}
          style={{ left, bottom: window.innerHeight - anchor.top + GAP }}
          className={cn(
            "fixed z-50 max-h-[min(420px,60dvh)] overflow-y-auto rounded-[var(--radius-card)] border border-border-strong bg-surface-raised p-1.5",
            "shadow-[0_18px_50px_color-mix(in_srgb,var(--shadow-color)_45%,transparent)]",
          )}
        >
          <p className="m-0 px-2.5 pt-1.5 pb-2 text-[length:var(--fs-2xs)] font-semibold tracking-[0.14em] text-muted uppercase">
            {label}
          </p>
          <div
            className={columns ? "grid gap-1" : "grid min-w-44 gap-0.5"}
            style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(64px, 1fr))` } : undefined}
          >
            {options.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => {
                    onChange(option.value);
                    close(true);
                  }}
                  className={cn(
                    "rounded-lg text-[length:var(--fs-md)] text-subtle transition-colors hover:bg-overlay-hover hover:text-foreground",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                    "aria-selected:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] aria-selected:text-primary",
                    columns
                      ? "grid justify-items-center gap-1.5 px-2 pt-3 pb-2"
                      : "flex items-center gap-2.5 px-2.5 py-2 text-left",
                  )}
                >
                  {option.icon && <span className="grid place-items-center">{option.icon}</span>}
                  <span className={columns ? "text-[length:var(--fs-xs)]" : "flex-1"}>
                    {option.label}
                    {option.hint && !columns && (
                      <span className="block text-[length:var(--fs-xs)] text-muted">{option.hint}</span>
                    )}
                  </span>
                  {!columns && (
                    <Check size={14} aria-hidden="true" className={isSelected ? "opacity-100" : "opacity-0"} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
