"use client";

import { ChevronDown } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import styles from "./main.module.css";

export type AccordionContextValue = {
  activeEventKey: string | null;
  animated: boolean;
  setActiveEventKey: (eventKey: string | null) => void;
};

export const AccordionContext = createContext<AccordionContextValue | null>(null);

/** Groups related accordion items into a consistent vertical stack. */
export function Accordion({
  children,
  className,
  activeEventKey,
  defaultActiveEventKey = null,
  onActiveEventKeyChange,
  onToggle,
  animated = true,
}: {
  children: ReactNode;
  className?: string;
  activeEventKey?: string | null;
  defaultActiveEventKey?: string | null;
  onActiveEventKeyChange?: (eventKey: string | null) => void;
  onToggle?: (eventKey: string | null) => void;
  animated?: boolean;
}) {
  const [internalActiveEventKey, setInternalActiveEventKey] = useState(defaultActiveEventKey);
  const currentActiveEventKey = activeEventKey === undefined ? internalActiveEventKey : activeEventKey;
  const setActiveEventKey = useCallback(
    (eventKey: string | null) => {
      if (activeEventKey === undefined) setInternalActiveEventKey(eventKey);
      onActiveEventKeyChange?.(eventKey);
      onToggle?.(eventKey);
    },
    [activeEventKey, onActiveEventKeyChange, onToggle],
  );

  return (
    <AccordionContext.Provider value={{ activeEventKey: currentActiveEventKey, setActiveEventKey, animated }}>
      <div className={[styles.accordion, className].filter(Boolean).join(" ")}>{children}</div>
    </AccordionContext.Provider>
  );
}

/** A native, keyboard-accessible disclosure item for use inside an Accordion. */
export function AccordionItem({
  eventKey,
  title,
  description,
  count,
  leadingIcon,
  trailingContent,
  showChevron = true,
  variant = "default",
  className,
  summaryClassName,
  bodyClassName,
  bodyContentClassName,
  summaryProps,
  defaultOpen = false,
  children,
}: {
  eventKey: string;
  title: ReactNode;
  description?: string;
  count?: number;
  leadingIcon?: ReactNode;
  trailingContent?: ReactNode;
  showChevron?: boolean;
  variant?: "default" | "plain";
  className?: string;
  summaryClassName?: string;
  bodyClassName?: string;
  bodyContentClassName?: string;
  summaryProps?: Omit<ComponentPropsWithoutRef<"summary">, "children">;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const context = useContext(AccordionContext);
  const isOpen = context ? context.activeEventKey === eventKey : defaultOpen;
  const animated = context?.animated ?? false;

  return (
    <details
      className={[styles.item, variant === "plain" && styles.plainItem, !animated && styles.noAnimation, className]
        .filter(Boolean)
        .join(" ")}
      open={isOpen}
      onToggle={(event) => {
        if (!context) return;
        if (event.currentTarget.open) {
          if (context.activeEventKey !== eventKey) context.setActiveEventKey(eventKey);
        } else if (context.activeEventKey === eventKey) {
          context.setActiveEventKey(null);
        }
      }}
    >
      <summary
        {...summaryProps}
        className={[summaryClassName, summaryProps?.className].filter(Boolean).join(" ") || undefined}
      >
        {leadingIcon}
        <span className={styles.heading}>
          <span className={styles.titleLine}>
            {title}
            {count !== undefined && <small className={styles.count}> · {count}</small>}
          </span>
          {description && <span className={styles.description}>{description}</span>}
        </span>
        {trailingContent}
        {showChevron && <ChevronDown size={15} className={styles.chevron} aria-hidden="true" />}
      </summary>
      <div className={[styles.body, bodyClassName].filter(Boolean).join(" ")}>
        <div
          className={[styles.bodyContent, variant === "plain" && styles.plainBodyContent, bodyContentClassName]
            .filter(Boolean)
            .join(" ")}
          inert={!isOpen}
        >
          {children}
        </div>
      </div>
    </details>
  );
}
