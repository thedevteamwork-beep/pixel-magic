import type { LandingAsset } from "@/types/landing";

/** Generator card artwork is independent of the landing page's video posters. */
export const imageTemplateArtwork: Readonly<Partial<Record<string, Pick<LandingAsset, "image" | "alt">>>> = {
  "object-study": {
    image: "/media/image-studio/product.png",
    alt: "An amber perfume bottle with sculptural glass and a gold cap, on sunlit travertine",
  },
  "character-study": {
    image: "/media/image-studio/portrait.png",
    alt: "A close-up portrait of a curly-haired woman in magenta and cyan light",
  },
  "desert-study": {
    image: "/media/image-studio/cinematic.png",
    alt: "Terracotta sand dunes and distant violet mountains beneath a glowing sunset",
  },
  "architecture-study": {
    image: "/media/image-studio/architecture.png",
    alt: "A minimalist stone villa with an olive tree and broad steps in golden-hour light",
  },
};
