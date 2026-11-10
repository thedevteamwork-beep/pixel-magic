import type { ImageModel, ImageSettings, InspirationItem } from "@/types/image-generator";

/** Preview capabilities are centralized here for the later provider integration. */
export const imageModels: readonly ImageModel[] = [
  { id: "gpt_image_2", name: "GPT Image 2", maker: "OpenAI", symbol: "✳", tag: "Featured", description: "Art direction, product imagery, and expressive detail." },
  { id: "nano_banana_pro", name: "Nano Banana Pro", maker: "Google", symbol: "✦", description: "Reference-led compositions and visual ideas." },
  { id: "flux_2", name: "FLUX 2", maker: "Black Forest Labs", symbol: "ƒ", description: "A starting point for photographic worlds." },
  { id: "seedream_5", name: "Seedream 5", maker: "ByteDance", symbol: "❋", description: "Rich scenes, textures, and campaign concepts." },
  { id: "soul_2", name: "Soul 2.0", maker: "Higgsfield", symbol: "◉", description: "Portrait and fashion direction." },
  { id: "gpt_image_1_5", name: "GPT Image 1.5", maker: "OpenAI", symbol: "✳", description: "Explore an alternative creative direction." },
];

export const aspectRatios = ["Auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"] as const;
export const resolutions = ["1K", "2K", "4K"] as const;
export const qualities = ["Low", "Medium", "High"] as const;
export const imageCounts = [1, 2, 3, 4] as const;
export const imageStyles = ["None", "Editorial", "Cinematic", "Product", "Analog", "Illustration", "3D render", "Minimal"] as const;
export const MAX_PROMPT_LENGTH = 5000;
export const MAX_REFERENCE_IMAGES = 16;
export const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
export const REFERENCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const defaultImageSettings: Readonly<ImageSettings> = {
  model: "gpt_image_2", prompt: "", mode: "create", aspectRatio: "9:16", resolution: "2K", quality: "High", count: 1,
  queue: "credits", style: "None", seed: null, negativePrompt: "", enhancePrompt: false, private: true, format: "png", background: "auto",
};

export const imageInspirations: readonly InspirationItem[] = [
  { id: "object-study", title: "Objects of affection", category: "Product", asset: "product", aspectRatio: "3:4", prompt: "A sculptural wavy glass perfume bottle filled with amber fragrance, a brushed gold cap, and a rough travertine pedestal. Warm late-afternoon light, soft olive-leaf shadows on a beige plaster background, realistic glass and stone detail." },
  { id: "bloom-study", title: "A softer kind of bold", category: "Botanical", asset: "flowers", aspectRatio: "1:1", prompt: "A close-up study of blush pink roses, delicate petals, soft morning light, tactile detail and an understated botanical editorial feeling." },
  { id: "character-study", title: "After the last light", category: "Portrait", asset: "portrait", aspectRatio: "3:4", prompt: "A close-up editorial portrait of an adult woman with curly dark hair and a gold hoop earring, chin gently raised, natural skin texture, magenta light from the left and cyan light from the right, against a deep purple background." },
  { id: "architecture-study", title: "A different angle", category: "Architecture", asset: "architecture", aspectRatio: "4:3", prompt: "A minimalist cream travertine villa with a cantilevered concrete roof, tall dark-framed windows, broad stone steps and an olive tree. Low golden sunlight, crisp architectural shadows, pale blue sky and realistic natural materials." },
  { id: "runner-study", title: "Made for the next move", category: "Campaign", asset: "sneakers", aspectRatio: "4:3", prompt: "An editorial sneaker campaign with orange and white runners, rich tactile materials, bold composition, directional studio lighting and a premium independent magazine feeling." },
  { id: "coastal-study", title: "A little out of office", category: "Landscape", asset: "ocean", aspectRatio: "16:9", prompt: "An aerial view of turquoise waves meeting a sunlit coastline, organic textures, natural light, calm composition and a sense of open possibility." },
  { id: "desert-study", title: "Somewhere in between", category: "Cinema", asset: "desert", aspectRatio: "16:9", prompt: "A cinematic desert landscape of terracotta-orange sand dunes at sunset, layered violet mountains on the horizon, peach clouds, warm sunlit ridges and deep dune shadows. No people, vehicles or structures." },
  { id: "monochrome-study", title: "Quiet by design", category: "Design", asset: "architecture", aspectRatio: "1:1", prompt: "A minimal architectural study in concrete and sky, carefully balanced shapes, deep geometric shadows, monochrome editorial mood and striking negative space." },
];
