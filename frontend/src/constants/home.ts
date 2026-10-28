import { placeholderMedia as media } from "@/constants/placeholderMedia";
import type { MediaAsset } from "@/ui/Media";
import type { GalleryItem } from "@/ui/MasonryGrid";
import type { WidgetConfig } from "@/widgets/types";

const masonryRatios = ["3/4", "4/5", "1/1", "9/16", "4/3", "2/3"];

/** `count` tiles of the same asset, with varied ratios so the masonry reads. */
function galleryItems(prefix: string, asset: MediaAsset, count: number): GalleryItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    media: asset,
    aspectRatio: masonryRatios[index % masonryRatios.length],
  }));
}

/** Homepage, top to bottom. Section order mirrors higgsfield.ai. */
export const homeWidgets: WidgetConfig[] = [
  {
    id: "featured",
    type: "HorizontalCarouselSlice",
    props: {
      label: "Featured",
      items: [
        {
          id: "studio",
          title: "Pixel Magic Studio",
          description: "Turn a single prompt into a finished video.",
          href: "#studio",
          media: media.carousel,
        },
        {
          id: "image-to-video",
          title: "Image to Video",
          description: "Bring any still to life with natural, cinematic motion.",
          href: "#image-to-video",
          media: media.carousel,
        },
        {
          id: "upscale",
          title: "Upscale",
          description: "Sharpen any image or clip up to 4K in seconds.",
          href: "#upscale",
          media: media.carousel,
        },
        {
          id: "avatars",
          title: "AI Avatars",
          description: "Create one consistent character and use it in every scene.",
          href: "#ai-avatars",
          media: media.carousel,
        },
      ],
    },
  },
  {
    id: "tools",
    type: "FeatureBentoGrid",
    props: {
      promo: {
        title: "Pixel Magic API",
        description: "Generate images and videos from your own app.",
        action: { label: "Get API key", href: "#api" },
        media: media.bento,
        eager: true,
      },
      tiles: [
        {
          id: "text-to-image",
          title: "Text to Image",
          description: "Any style, from one prompt",
          href: "#ai-image",
          icon: "image",
          badge: "New",
        },
        {
          id: "text-to-video",
          title: "Text to Video",
          description: "Cinematic clips in minutes",
          href: "#ai-video",
          icon: "video",
        },
        {
          id: "image-to-video",
          title: "Image to Video",
          description: "Animate any still",
          href: "#image-to-video",
          icon: "play",
        },
        {
          id: "kling",
          title: "Kling",
          description: "Now available on Pixel Magic",
          href: "#kling",
          icon: "bolt",
          media: media.bento,
        },
        {
          id: "upscale",
          title: "Upscale",
          description: "Up to 4K, in seconds",
          href: "#upscale",
          icon: "sparkle",
        },
        {
          id: "lip-sync",
          title: "Lip Sync",
          description: "Match any voice to any face",
          href: "#lip-sync",
          icon: "mic",
        },
      ],
    },
  },
  {
    id: "kling-hero",
    type: "HeroBanner",
    props: {
      eyebrow: "Now on Pixel Magic",
      title: "Kling Video",
      description: "Kling's newest video generation model, ready to use on Pixel Magic.",
      action: { label: "Explore Kling", href: "#kling" },
      media: media.hero,
    },
  },
  {
    id: "community",
    type: "CommunityGallery",
    props: {
      title: "Made by the Pixel Magic community",
      description: "See what creators are making, then remix it with your own characters, places and products.",
      actions: [
        { label: "Start generating", href: "#get-started" },
        { label: "Learn more", href: "#community" },
      ],
      items: galleryItems("community", media.community, 12),
    },
  },
  {
    id: "seedance",
    type: "ModelGallery",
    props: {
      title: "Seedance",
      description: "Cinematic AI video with smooth, natural motion.",
      items: galleryItems("seedance", media.gallery, 10),
      viewAll: { label: "View all Seedance", href: "#seedance" },
    },
  },
  {
    id: "magic-agent",
    type: "PromoBanner",
    props: {
      variant: "spotlight",
      title: "Magic Agent",
      description: "One AI agent for your entire creative workflow.",
      action: { label: "Try Magic Agent", href: "#agent" },
      media: media.promo,
    },
  },
  {
    id: "flux",
    type: "ModelGallery",
    props: {
      title: "Flux",
      description: "Photoreal images with sharp, readable text.",
      items: galleryItems("flux", media.gallery, 10),
      viewAll: { label: "View all Flux", href: "#flux" },
    },
  },
  {
    id: "canvas",
    type: "PromoBanner",
    props: {
      variant: "split",
      eyebrow: "New feature",
      title: "One canvas. Every workflow.",
      description: "Build moodboards, chain workflows and share with your team, all on one canvas.",
      action: { label: "Try Canvas", href: "#canvas" },
      media: media.hero,
    },
  },
  {
    id: "marketing-studio",
    type: "ModelGallery",
    props: {
      title: "Marketing Studio",
      description: "See what creators and brands are making with Marketing Studio.",
      items: galleryItems("marketing", media.gallery, 10),
      viewAll: { label: "View all Marketing Studio", href: "#marketing-studio" },
    },
  },
  {
    id: "kling",
    type: "ModelGallery",
    props: {
      title: "Kling",
      description: "Browse top video generations from the Pixel Magic community.",
      items: galleryItems("kling", media.gallery, 10),
      viewAll: { label: "View all Kling", href: "#kling" },
    },
  },
  {
    id: "photo-sets",
    type: "PromoBanner",
    props: {
      variant: "split",
      reverse: true,
      eyebrow: "Photo sets",
      title: "Different scenes. Same star.",
      description: "Build your character once, then place them in any scene.",
      action: { label: "Try Photo sets", href: "#photo-sets" },
      media: media.community,
    },
  },
  {
    id: "nano-banana",
    type: "ModelGallery",
    props: {
      title: "Nano Banana",
      description: "Edit images in plain words while keeping every detail.",
      items: galleryItems("nano-banana", media.gallery, 10),
      viewAll: { label: "View all Nano Banana", href: "#nano-banana" },
    },
  },
  {
    id: "veo",
    type: "ModelGallery",
    props: {
      title: "Veo",
      description: "Video with native sound, from a single prompt.",
      items: galleryItems("veo", media.gallery, 10),
      viewAll: { label: "View all Veo", href: "#veo" },
    },
  },
  {
    id: "explore-more",
    type: "FeatureTagCloud",
    props: {
      title: "Explore more AI features",
      tags: [
        "Text to Video",
        "Image to Video",
        "Text to Image",
        "Upscale",
        "Lip Sync",
        "AI Avatars",
        "Face Swap",
        "Background Remover",
        "Inpaint",
        "Outpaint",
        "Style Transfer",
        "Product Shots",
        "Kling",
        "Seedance",
        "Veo",
        "Wan",
        "Flux",
        "Nano Banana",
        "Ideogram",
        "Prompt Guide",
      ].map((label) => ({ label, href: `#${label.toLowerCase().replaceAll(" ", "-")}` })),
    },
  },
];
