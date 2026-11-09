"use client";

import { useState, type RefObject } from "react";
import type { TemplateItem } from "@/types/landing";
import { MasonryGrid } from "./MasonryGrid";
import { TemplatePreview } from "./TemplatePreview";

type TemplateGridProps = {
  items: readonly TemplateItem[];
  label: string;
  horizontal?: boolean;
  viewportId?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
};

export function TemplateGrid(props: TemplateGridProps) {
  const [selected, setSelected] = useState<TemplateItem | null>(null);

  return (
    <>
      <MasonryGrid {...props} onPreview={setSelected} />
      <TemplatePreview item={selected} items={props.items} onClose={() => setSelected(null)} onSelect={setSelected} />
    </>
  );
}
