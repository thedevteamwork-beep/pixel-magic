"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./main.module.css";

type PillTabsProps<K extends string> = {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /** Names the group for screen readers. */
  label: string;
};

/** A row of pill buttons with a highlight that slides to the chosen one. */
export function PillTabs<K extends string>({ options, value, onChange, label }: PillTabsProps<K>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const measure = () => {
      const active = group.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={groupRef} className={styles.tabs} role="group" aria-label={label}>
      {indicator && (
        <span
          className={styles.indicator}
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
          aria-hidden="true"
        />
      )}
      {options.map((option) => (
        <button
          type="button"
          key={option.key}
          className={styles.tab}
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
