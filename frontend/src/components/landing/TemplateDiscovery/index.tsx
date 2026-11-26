"use client";

import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { allTemplates, discoveryTemplates, templateSection, templateTabs } from "@/components/landing/constants";
import { ActionPill } from "../ActionPill";
import { FadeEnding } from "../FadeEnding";
import { useTemplateFilters } from "../LandingProvider";
import { PillTabs } from "../PillTabs";
import { SectionIntro } from "../SectionIntro";
import { TemplateGrid } from "../TemplateGrid";
import styles from "./main.module.css";

const videoTemplates = discoveryTemplates.filter((item) => item.mediaType === "video");

/** The video template gallery: tabs, then a masonry grid that fades out under "Explore all templates". */
export function DiscoveryGallery() {
  const { filters, setFilters } = useTemplateFilters();
  const [expanded, setExpanded] = useState(false);
  // Links elsewhere may ask for "video" or "image"; anything that isn't a tab here shows every video.
  const category = templateTabs.some((tab) => tab.key === filters.category) ? filters.category : "all";
  const filtered = useMemo(
    () =>
      videoTemplates.filter(
        (item) =>
          (category === "all" || item.categories.includes(category)) &&
          (filters.model === "all" || item.model === filters.model),
      ),
    [category, filters.model],
  );
  const collapsed = !expanded && filtered.length > templateSection.previewCount;
  const shown = collapsed ? filtered.slice(0, templateSection.previewCount) : filtered;

  return (
    <section className={`landing-section ${styles.section}`} id="templates" aria-labelledby="templates-heading">
      <SectionIntro
        eyebrow={templateSection.eyebrow}
        heading={templateSection.heading}
        description={templateSection.description}
        headingId="templates-heading"
      />
      <div className={styles.toolbar}>
        <PillTabs
          label="Video template category"
          options={templateTabs}
          value={category}
          onChange={(category) => {
            setFilters({ category, model: "all" });
            setExpanded(false);
          }}
        />
      </div>

      {shown.length ? (
        <FadeEnding
          expanded={!collapsed}
          maxHeight={1180}
          note={templateSection.fadeNote}
          action={<ActionPill onClick={() => setExpanded(true)}>Explore all templates</ActionPill>}
        >
          <TemplateGrid items={shown} label="Video template previews" />
        </FadeEnding>
      ) : (
        <div className={styles.empty}>
          <SearchX size={28} aria-hidden="true" />
          <h3>A different direction?</h3>
          <p>There are no looks in this combination yet. Try another category or the full collection.</p>
          <ActionPill onClick={() => setFilters(allTemplates)}>Show all templates</ActionPill>
        </div>
      )}
    </section>
  );
}
