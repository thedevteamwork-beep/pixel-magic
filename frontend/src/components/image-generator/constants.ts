import architectureArt from "@/assets/images/image-studio/architecture.png";
import cinematicArt from "@/assets/images/image-studio/cinematic.png";
import portraitArt from "@/assets/images/image-studio/portrait.png";
import productArt from "@/assets/images/image-studio/product.png";
import type { ImageSettings, InspirationItem, ModelPresentation } from "@/types/image-generator";
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

/** Display details the backend doesn't carry. A model missing here still works, with a generic look. */
export const modelPresentation: Readonly<Record<string, ModelPresentation>> = {
  fluxSchnell_generate: { maker: "Black Forest Labs", symbol: "ƒ", tag: "Fast" },
  flux2Pro_generate: { maker: "Black Forest Labs", symbol: "ƒ" },
  nanoBananaPro_generate: { maker: "Google", symbol: "✦", tag: "Featured" },
  nanoBanana2_generate: { maker: "Google", symbol: "✦" },
  gpt2_generate: { maker: "OpenAI", symbol: "✳", tag: "Featured" },
  seedream5Pro_generate: { maker: "ByteDance", symbol: "❋" },
  qwen3_generate: { maker: "Alibaba", symbol: "◈" },
  grokImagineImage_generate: { maker: "xAI", symbol: "✕" },
  krea2_generate: { maker: "Krea", symbol: "◐" },
};

export const defaultImageSettings: Readonly<ImageSettings> = {
  model: null,
  prompt: "",
  style: "None",
  ratio: "3:4",
  options: {},
};

/** How often a running job is checked. Image jobs usually finish in seconds. */
export const IMAGE_POLL_INTERVAL_MS = 2500;
/**
 * How long the studio waits on one job, from its creation. Past the backend's
 * 10-minute image timeout a job should have ended; if not, stop polling and
 * let it appear in History whenever it does.
 */
export const IMAGE_WAIT_LIMIT_MS = 12 * 60_000;
/** How many recent image jobs the history loads. */
export const HISTORY_PAGE_SIZE = 30;

export const imageInspirations: readonly InspirationItem[] = [
  {
    id: "object-study",
    title: "Objects of affection",
    category: "Product",
    asset: "product",
    aspectRatio: "3:4",
    prompt:
      "A sculptural wavy glass perfume bottle filled with amber fragrance, a brushed gold cap, and a rough travertine pedestal. Warm late-afternoon light, soft olive-leaf shadows on a beige plaster background, realistic glass and stone detail.",
  },
  {
    id: "bloom-study",
    title: "A softer kind of bold",
    category: "Botanical",
    asset: "flowers",
    aspectRatio: "1:1",
    prompt:
      "A close-up study of blush pink roses, delicate petals, soft morning light, tactile detail and an understated botanical editorial feeling.",
  },
  {
    id: "character-study",
    title: "After the last light",
    category: "Portrait",
    asset: "portrait",
    aspectRatio: "3:4",
    prompt:
      "A close-up editorial portrait of an adult woman with curly dark hair and a gold hoop earring, chin gently raised, natural skin texture, magenta light from the left and cyan light from the right, against a deep purple background.",
  },
  {
    id: "architecture-study",
    title: "A different angle",
    category: "Architecture",
    asset: "architecture",
    aspectRatio: "4:3",
    prompt:
      "A minimalist cream travertine villa with a cantilevered concrete roof, tall dark-framed windows, broad stone steps and an olive tree. Low golden sunlight, crisp architectural shadows, pale blue sky and realistic natural materials.",
  },
  {
    id: "runner-study",
    title: "Made for the next move",
    category: "Campaign",
    asset: "sneakers",
    aspectRatio: "4:3",
    prompt:
      "An editorial sneaker campaign with orange and white runners, rich tactile materials, bold composition, directional studio lighting and a premium independent magazine feeling.",
  },
  {
    id: "coastal-study",
    title: "A little out of office",
    category: "Landscape",
    asset: "ocean",
    aspectRatio: "16:9",
    prompt:
      "An aerial view of turquoise waves meeting a sunlit coastline, organic textures, natural light, calm composition and a sense of open possibility.",
  },
  {
    id: "desert-study",
    title: "Somewhere in between",
    category: "Cinema",
    asset: "desert",
    aspectRatio: "16:9",
    prompt:
      "A cinematic desert landscape of terracotta-orange sand dunes at sunset, layered violet mountains on the horizon, peach clouds, warm sunlit ridges and deep dune shadows. No people, vehicles or structures.",
  },
  {
    id: "monochrome-study",
    title: "Quiet by design",
    category: "Design",
    asset: "architecture",
    aspectRatio: "1:1",
    prompt:
      "A minimal architectural study in concrete and sky, carefully balanced shapes, deep geometric shadows, monochrome editorial mood and striking negative space.",
  },
];
