"use client";

import { ArrowDown, ArrowUpRight, ChevronDown, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { discoveryTemplates, templateModels } from "@/constants/landing-templates";
import type { TemplateCategory } from "@/types/landing";
import { useTemplateFilters } from "./LandingProvider";
import { TemplateGrid } from "./TemplateGrid";
import styles from "./TemplateDiscovery.module.css";

const categories: readonly { key: TemplateCategory; label: string }[] = [
  { key: "all", label: "For you" },
  { key: "video", label: "Video" },
  { key: "image", label: "Image" },
  { key: "marketing", label: "Ads" },
  { key: "portraits", label: "Portraits" },
];

export function DiscoveryGallery() {
  const { filters, setFilters } = useTemplateFilters();
  const [expanded, setExpanded] = useState(false);
  const filtered = useMemo(() => discoveryTemplates.filter((item) => (
    (filters.category === "all" || item.categories.includes(filters.category))
    && (filters.model === "all" || item.model === filters.model)
  )), [filters.category, filters.model]);
  const shown = expanded ? filtered : filtered.slice(0, 10);

  function showAll() {
    setFilters({ category: "all", model: "all" });
    setExpanded(true);
  }

  return (
    <section className={`landing-section ${styles.section}`} id="templates" aria-labelledby="templates-heading">
      <div className={styles.heading}>
        <div>
          <p className="section-eyebrow">Trending video templates</p>
          <h2 className="section-title" id="templates-heading">Start with a spark.</h2>
          <p className="section-description">A look you love. Your face, your product, your story.</p>
        </div>
        <button className={styles.textButton} type="button" onClick={showAll}>Explore all templates <ArrowUpRight size={16} /></button>
      </div>

      <div className={styles.filters}>
        <div className={styles.categories} role="group" aria-label="Template category">
          {categories.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              aria-pressed={filters.category === key}
              onClick={() => { setFilters({ ...filters, category: key }); setExpanded(false); }}
            >{label}</button>
          ))}
        </div>
        <label className={styles.modelFilter}>
          <span className={styles.srOnly}>Filter templates by model</span>
          <select value={filters.model} onChange={(event) => { setFilters({ ...filters, model: event.target.value }); setExpanded(false); }}>
            <option value="all">All models</option>
            {templateModels.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
      </div>

      {shown.length ? (
        <TemplateGrid items={shown} label="Discover template previews" />
      ) : (
        <div className={styles.empty}>
          <SearchX size={28} aria-hidden="true" />
          <h3>A different direction?</h3>
          <p>There are no looks in this combination yet. Explore another model or the full collection.</p>
          <button className="button-secondary" type="button" onClick={showAll}>Show all templates <ArrowUpRight size={15} /></button>
        </div>
      )}

      <div className={styles.footer}>
        <p className={styles.count} aria-live="polite" aria-atomic="true">
          {shown.length === filtered.length ? `${filtered.length} curated ${filtered.length === 1 ? "look" : "looks"}` : `${shown.length} of ${filtered.length} curated looks`}
        </p>
        {!expanded && filtered.length > shown.length && (
          <button className={styles.textButton} type="button" onClick={() => setExpanded(true)}>Keep exploring <ArrowDown size={14} /></button>
        )}
      </div>
    </section>
  );
}
