import { CollectionBanners } from "@/components/landing/CollectionBanners";
import { CollectionShortcuts } from "@/components/landing/CollectionShortcuts";
import { ExploreBanner } from "@/components/landing/ExploreBanner";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { ImageTemplateCollection } from "@/components/landing/ImageTemplateCollection";
import { ModelDirectory } from "@/components/landing/ModelDirectory";
import { MarketingCollection, SeedanceCollection } from "@/components/landing/StudioCollection";
import { DiscoveryGallery } from "@/components/landing/TemplateDiscovery";
import { ToolCarousel } from "@/components/landing/ToolCarousel";
import { templateModels } from "@/constants/landing-templates";

/** Static page composition; client boundaries are limited to interactions. */
export default function Home() {
  return (
    <main id="main-content" className="page-container" tabIndex={-1}>
      <div id="top" aria-hidden="true" />
      <ToolCarousel />
      <HeroShowcase />
      <CollectionShortcuts />
      <DiscoveryGallery />
      <MarketingCollection />
      <CollectionBanners />
      <SeedanceCollection />
      <ImageTemplateCollection />
      <ModelDirectory models={templateModels} />
      <ExploreBanner />
    </main>
  );
}
