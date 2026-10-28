import type { CommunityGalleryProps } from "@/widgets/CommunityGallery";
import type { FeatureBentoGridProps } from "@/widgets/FeatureBentoGrid";
import type { FeatureTagCloudProps } from "@/widgets/FeatureTagCloud";
import type { HeroBannerProps } from "@/widgets/HeroBanner";
import type { HorizontalCarouselSliceProps } from "@/widgets/HorizontalCarouselSlice";
import type { ModelGalleryProps } from "@/widgets/ModelGallery";
import type { PromoBannerProps } from "@/widgets/PromoBanner";

/** Every widget type and the props its content must provide. Add new widgets here and in the registry. */
export type WidgetPropsMap = {
  HorizontalCarouselSlice: HorizontalCarouselSliceProps;
  FeatureBentoGrid: FeatureBentoGridProps;
  HeroBanner: HeroBannerProps;
  CommunityGallery: CommunityGalleryProps;
  ModelGallery: ModelGalleryProps;
  PromoBanner: PromoBannerProps;
  FeatureTagCloud: FeatureTagCloudProps;
};

export type WidgetType = keyof WidgetPropsMap;

/** One entry in a page's widget list. `props` is checked against the chosen `type`. */
export type WidgetConfig = {
  [K in WidgetType]: { id: string; type: K; props: WidgetPropsMap[K] };
}[WidgetType];
