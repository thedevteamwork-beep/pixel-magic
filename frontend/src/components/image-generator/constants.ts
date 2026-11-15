import architectureArt from "@/assets/images/image-studio/architecture.png";
import cinematicArt from "@/assets/images/image-studio/cinematic.png";
import portraitArt from "@/assets/images/image-studio/portrait.png";
import productArt from "@/assets/images/image-studio/product.png";
import type { MediaId, LandingAsset } from "@/types/landing";

/** Prompt guidance for the prototype, not provider-native capability declarations. */
export const stylePresets: readonly {
  value: string;
  name: string;
  description: string;
  instruction: string;
  asset: MediaId;
}[] = [
  {
    value: "Editorial",
    name: "Editorial",
    description: "Considered composition. A little unexpected.",
    instruction: "Use an editorial photography style with a considered composition and tactile, natural detail.",
    asset: "portrait",
  },
  {
    value: "Cinematic",
    name: "Cinematic",
    description: "Atmospheric light. A story in every frame.",
    instruction:
      "Use a cinematic composition with atmospheric lighting and a restrained film-inspired color treatment.",
    asset: "desert",
  },
  {
    value: "Product",
    name: "Product",
    description: "Your subject, in its best light.",
    instruction:
      "Use commercial product photography with a clear subject, considered lighting and realistic material detail.",
    asset: "product",
  },
  {
    value: "Analog",
    name: "Analog",
    description: "Soft grain. A feeling you can almost touch.",
    instruction: "Use an analog photography aesthetic with subtle film grain and gently softened contrast.",
    asset: "flowers",
  },
];

export const lightingOptions: readonly { value: string; label: string; instruction: string }[] = [
  { value: "none", label: "Follow my prompt", instruction: "" },
  { value: "natural", label: "Natural daylight", instruction: "Light the scene with soft, natural daylight." },
  {
    value: "golden-hour",
    label: "Golden hour",
    instruction: "Use warm, low-angle golden-hour light with gentle shadows.",
  },
  {
    value: "studio",
    label: "Soft studio light",
    instruction: "Use soft studio lighting with controlled highlights and gentle shadows.",
  },
  {
    value: "dramatic",
    label: "Dramatic light",
    instruction: "Use directional lighting with distinct highlights and deep, expressive shadows.",
  },
];

export const paletteOptions: readonly {
  value: string;
  label: string;
  instruction: string;
  swatches?: readonly string[];
}[] = [
  { value: "none", label: "Follow my prompt", instruction: "" },
  {
    value: "warm",
    label: "Warm & sunlit",
    instruction: "Favor a warm palette of cream, terracotta and soft golden tones.",
    swatches: ["var(--art-paper)", "var(--art-peach)", "var(--art-plum)"],
  },
  {
    value: "neutral",
    label: "Quiet neutrals",
    instruction: "Favor a restrained palette of warm whites, stone and charcoal.",
    swatches: ["var(--art-paper)", "var(--gray-400)", "var(--gray-800)"],
  },
  {
    value: "cool",
    label: "Cool & understated",
    instruction: "Favor a cool palette of soft sage, muted violet and deep green.",
    swatches: ["var(--art-sage)", "var(--violet-400)", "var(--art-forest)"],
  },
  {
    value: "earthy",
    label: "Earthy & organic",
    instruction: "Favor an earthy palette of sand, olive green and natural clay.",
    swatches: ["var(--art-paper)", "var(--art-sage)", "var(--art-peach)"],
  },
];

/** Generator card artwork is independent of the landing page's video posters. */
export const imageTemplateArtwork: Readonly<Partial<Record<string, Pick<LandingAsset, "image" | "alt">>>> = {
  "object-study": {
    image: productArt.src,
    alt: "An amber perfume bottle with sculptural glass and a gold cap, on sunlit travertine",
  },
  "character-study": {
    image: portraitArt.src,
    alt: "A close-up portrait of a curly-haired woman in magenta and cyan light",
  },
  "desert-study": {
    image: cinematicArt.src,
    alt: "Terracotta sand dunes and distant violet mountains beneath a glowing sunset",
  },
  "architecture-study": {
    image: architectureArt.src,
    alt: "A minimalist stone villa with an olive tree and broad steps in golden-hour light",
  },
};
