import type { MediaAsset } from "@/ui/Media";

/**
 * Placeholder media, hotlinked from higgsfield.ai: one asset per row, repeated.
 * The carousel and galleries share one ~14 MB clip so the browser fetches it once.
 * Replace every entry with Pixel Magic's own media before launch.
 * Image hosts are allowed in `images.remotePatterns` in next.config.ts; videos load directly.
 */
export const placeholderMedia = {
  carousel: {
    kind: "video",
    src: "https://cdn.higgsfield.ai/card_preview/video_input/ae3e4266-4ec6-42ab-a20d-8a5733bb1052/compressed_hq.mp4",
    alt: "Sample AI-generated video",
  },
  bento: {
    kind: "image",
    src: "https://static-public-media.higgsfield.ai/cards/e00fa340-fd99-47d6-ae8f-9bdd20f9393e.webp",
    alt: "Sample AI-generated image",
  },
  hero: {
    kind: "image",
    src: "https://static.higgsfield.ai/public/promotions/seedance-2-5-sale-hero-poster.jpg",
    alt: "Still from an AI-generated video",
  },
  community: {
    kind: "image",
    src: "https://static.higgsfield.ai/kling-4.0/explore-banner-v2/streetwear.webp",
    alt: "Community creation",
  },
  gallery: {
    kind: "video",
    src: "https://cdn.higgsfield.ai/card_preview/video_input/ae3e4266-4ec6-42ab-a20d-8a5733bb1052/compressed_hq.mp4",
    alt: "Sample generation from this model",
  },
  promo: {
    kind: "image",
    src: "https://static.higgsfield.ai/spc-banner/bg-spc-banner.png",
    alt: "",
  },
} satisfies Record<string, MediaAsset>;
