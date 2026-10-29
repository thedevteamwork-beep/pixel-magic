import type { CSSProperties, RefObject } from "react";
import type { TemplateItem } from "@/types/landing";
import { TemplateCard } from "./TemplateCard";
import styles from "./MasonryGrid.module.css";

type MasonryStyle = CSSProperties & Record<`--${string}`, string | number>;
type Placement = { column: number; height: number; gaps: number };

// Every layout is calculated during rendering, so the server reserves the exact
// space and CSS can switch column counts without moving or duplicating the DOM.
const cardRatios = [9 / 16, 4 / 3, 16 / 9, 16 / 9, 16 / 9, 16 / 9, 16 / 9, 4 / 3];

function getLayout(length: number, columnCount: number) {
  const columns = Array.from({ length: columnCount }, () => ({ height: 0, items: 0 }));
  const placements: Placement[] = [];

  for (let index = 0; index < length; index += 1) {
    const weights = columns.map(({ height, items }) => height + items * 0.025);
    const column = index < columnCount ? index : weights.indexOf(Math.min(...weights));
    const previous = columns[column];

    placements.push({ column, height: previous.height, gaps: previous.items });
    previous.height += 1 / (cardRatios[index] ?? 16 / 9);
    previous.items += 1;
  }

  const height = `max(${columns.map((column) => (
    `calc(${column.height} * var(--column-width) + ${Math.max(0, column.items - 1)} * var(--masonry-gap))`
  )).join(", ")})`;

  return { placements, height };
}

type MasonryGridProps = {
  items: readonly TemplateItem[];
  onPreview: (item: TemplateItem) => void;
  label: string;
  horizontal?: boolean;
  viewportId?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
};

export function MasonryGrid({ items, onPreview, label, horizontal = false, viewportId, viewportRef }: MasonryGridProps) {
  const counts = horizontal ? [6] : [4, 3, 2];
  const layouts = counts.map((count) => ({ count, ...getLayout(items.length, count) }));
  const canvasStyle: MasonryStyle = {};

  for (const layout of layouts) canvasStyle[`--height-${layout.count}`] = layout.height;

  return (
    <div className={`${styles.frame} ${horizontal ? styles.horizontal : ""}`}>
      <div
        className={styles.viewport}
        id={viewportId}
        ref={viewportRef}
        tabIndex={horizontal ? 0 : undefined}
        role={horizontal ? "region" : undefined}
        aria-label={horizontal ? label : undefined}
      >
        <div className={styles.canvas} style={canvasStyle} role="list" aria-label={label}>
          {items.map((item, index) => {
            const style: MasonryStyle = { aspectRatio: cardRatios[index] ?? 16 / 9 };

            for (const { count, placements } of layouts) {
              const { column, height, gaps } = placements[index];
              style[`--column-${count}`] = column;
              style[`--top-${count}`] = `calc(${height} * var(--column-width) + ${gaps} * var(--masonry-gap))`;
            }

            return (
              <div className={styles.item} style={style} key={item.id} role="listitem">
                <TemplateCard item={item} onPreview={onPreview} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
