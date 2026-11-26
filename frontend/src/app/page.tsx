import { BeforeAfterShowcase } from "@/components/landing/BeforeAfterShowcase";
import { CollectionShortcuts } from "@/components/landing/CollectionShortcuts";
import { CommunityShowcase } from "@/components/landing/CommunityShowcase";
import { ExploreBanner } from "@/components/landing/ExploreBanner";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { InfluencerShowcase } from "@/components/landing/InfluencerShowcase";
import { MarketingShowcase } from "@/components/landing/MarketingShowcase";
import { ModelMarquee } from "@/components/landing/ModelMarquee";
import { StudioCarousel } from "@/components/landing/StudioCarousel";
import { DiscoveryGallery } from "@/components/landing/TemplateDiscovery";

/**
 * The home page, top to bottom. Each section is its own component in `components/landing/`, with its words and
 * pictures in `components/landing/constants.ts`: reorder, remove or swap a section here.
 */
export default function Home() {
  return (
    <main id="main-content" className="page-container" tabIndex={-1}>
      <div id="top" aria-hidden="true" />
      <StudioCarousel />
      <HeroShowcase />
      <CollectionShortcuts />
      <DiscoveryGallery />
      <BeforeAfterShowcase />
      <MarketingShowcase />
      <InfluencerShowcase />
      <ModelMarquee />
      <CommunityShowcase />
      <ExploreBanner />
    </main>
  );
}
