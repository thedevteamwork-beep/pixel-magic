"use client";

import { useState } from "react";
import { communitySection } from "@/components/landing/constants";
import { imageTemplates } from "@/constants/image-templates";
import { ActionPill } from "../ActionPill";
import { FadeEnding } from "../FadeEnding";
import { SectionIntro } from "../SectionIntro";
import { TemplateGrid } from "../TemplateGrid";

/** Finished pictures in their own shapes. Opening one starts the same look with the user's photo. */
export function CommunityShowcase() {
  const [expanded, setExpanded] = useState(false);
  const collapsed = !expanded && imageTemplates.length > communitySection.previewCount;
  const shown = collapsed ? imageTemplates.slice(0, communitySection.previewCount) : imageTemplates;

  return (
    <section className="landing-section" id="community" aria-labelledby="community-heading">
      <SectionIntro
        eyebrow={communitySection.eyebrow}
        heading={communitySection.heading}
        description={communitySection.description}
        headingId="community-heading"
      />
      <FadeEnding
        expanded={!collapsed}
        maxHeight={communitySection.fadeHeight}
        action={<ActionPill onClick={() => setExpanded(true)}>{communitySection.cta}</ActionPill>}
      >
        <TemplateGrid items={shown} label="Pictures made with Pixel Magic" fullImages />
      </FadeEnding>
    </section>
  );
}
