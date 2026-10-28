import type { ComponentType } from "react";
import { CommunityGallery } from "@/widgets/CommunityGallery";
import { FeatureBentoGrid } from "@/widgets/FeatureBentoGrid";
import { FeatureTagCloud } from "@/widgets/FeatureTagCloud";
import { HeroBanner } from "@/widgets/HeroBanner";
import { HorizontalCarouselSlice } from "@/widgets/HorizontalCarouselSlice";
import { ModelGallery } from "@/widgets/ModelGallery";
import { PromoBanner } from "@/widgets/PromoBanner";
import type { WidgetPropsMap, WidgetType } from "@/widgets/types";

/** Maps each widget `type` to the component that renders it. */
export const widgetRegistry: { [K in WidgetType]: ComponentType<WidgetPropsMap[K]> } = {
  HorizontalCarouselSlice,
  FeatureBentoGrid,
  HeroBanner,
  CommunityGallery,
  ModelGallery,
  PromoBanner,
  FeatureTagCloud,
};
