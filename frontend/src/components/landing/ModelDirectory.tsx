"use client";

import { ArrowUpRight } from "lucide-react";
import type { LandingModel } from "@/types/landing";
import { useTemplateFilters } from "./LandingProvider";
import styles from "./LandingSections.module.css";

export function ModelDirectory({ models }: { models: readonly LandingModel[] }) {
  const { setFilters } = useTemplateFilters();
  return <section id="models" className="landing-section" aria-labelledby="models-title">
    <div className={styles.sectionHead}>
      <div><p className="section-eyebrow">Pick your creative engine</p>
        <h2 id="models-title" className="section-title">Different models. Endless directions.</h2>
        <p className="section-description">Explore each model’s own collection of starting points.</p>
      </div>
      <span className={styles.directoryNote}>A world of creative possibilities <span aria-hidden="true">↙</span></span>
    </div>
    <ul className={styles.modelGrid}>
      {models.map((model) => <li key={model.name}>
        <a href="#templates" onClick={() => setFilters({ category: model.category, model: model.name })}>
          <span className={styles.modelSymbol} aria-hidden="true">{model.symbol}</span>
          <span><strong>{model.name}</strong><small>{model.description}</small></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </li>)}
    </ul>
  </section>;
}
