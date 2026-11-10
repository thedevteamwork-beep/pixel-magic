import { imageInspirations } from "@/constants/image-generator";
import { landingAssets } from "@/constants/landing-media";
import { validateImageGenerationRequest } from "@/lib/image-generator/validation";
import type { ImageGenerationRequest, ImageGenerationResponse, InspirationItem } from "@/types/image-generator";

const MAX_BODY_BYTES = 128 * 1024;
const noStore = { "Cache-Control": "no-store" };
class BodyTooLargeError extends Error {}

function failure(code: string, message: string, status = 400, fields?: Record<string, string>) {
  return Response.json({ ok: false, error: { code, message, ...(fields ? { fields } : {}) } }, { status, headers: noStore });
}

/** Bound the actual stream, including requests with missing or inaccurate length headers. */
async function readJSON(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new BodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(text);
}

const sampleKeywords: Record<string, readonly string[]> = {
  Product: ["product", "perfume", "bottle", "cosmetic", "fragrance", "packaging"],
  Botanical: ["flower", "rose", "petal", "botanical", "bloom", "garden"],
  Portrait: ["portrait", "person", "woman", "man", "face", "character", "fashion", "neon"],
  Architecture: ["architecture", "building", "concrete", "geometric", "interior"],
  Campaign: ["sneaker", "shoe", "runner", "campaign", "brand"],
  Landscape: ["ocean", "coast", "beach", "wave", "sea", "water"],
  Cinema: ["desert", "mountain", "road", "car", "cinema", "film"],
  Design: ["minimal", "design", "monochrome", "abstract", "shape"],
};
const styleCategories: Record<string, readonly string[]> = {
  Editorial: ["Portrait", "Product", "Campaign"],
  Cinematic: ["Cinema", "Landscape"],
  Product: ["Product", "Campaign"],
  Analog: ["Portrait", "Cinema"],
  Illustration: ["Botanical", "Design"],
  "3D render": ["Product", "Architecture"],
  Minimal: ["Design", "Architecture"],
};

/** Choose from a fixed local sample catalog; this does not generate or edit pixels. */
function samplesFor(settings: ImageGenerationRequest): readonly InspirationItem[] {
  const words = settings.prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const preferredCategories = styleCategories[settings.style] ?? [];
  const ranked = imageInspirations.map((item, index) => ({
    item,
    index,
    score: (sampleKeywords[item.category] ?? []).filter((keyword) => words.some((word) => word.startsWith(keyword))).length * 4
      + (preferredCategories.includes(item.category) ? 1 : 0),
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const matches = ranked.filter((entry) => entry.score > 0);
  return (matches.length ? matches : ranked).map((entry) => entry.item);
}

/** Public, stateless demonstration. Never contacts a provider, stores uploads, or charges credits. */
export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await readJSON(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return failure("PAYLOAD_TOO_LARGE", "Keep the request under 128 KiB. Send reference metadata only.", 413);
    return failure("INVALID_JSON", "Send a valid JSON request.");
  }
  const result = validateImageGenerationRequest(input);
  if (!result.ok) return failure(result.error.code, result.error.message, 400, result.error.fields);

  const settings = result.data;
  const samples = samplesFor(settings);
  const createdAt = new Date().toISOString();
  const response: ImageGenerationResponse = {
    id: `demo-${crypto.randomUUID()}`,
    demo: true,
    creditsCharged: 0,
    images: Array.from({ length: settings.count }, (_, index) => {
      const sample = samples[index % samples.length];
      const media = landingAssets[sample.asset];
      return {
        id: `sample-${crypto.randomUUID()}`,
        url: media.image,
        alt: `Sample preview: ${media.alt}. This is a pre-existing image, not a generated result.`,
        prompt: settings.prompt,
        model: settings.model,
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        quality: settings.quality,
        createdAt,
        favorite: false,
        seed: settings.seed ?? crypto.getRandomValues(new Uint32Array(1))[0],
        style: settings.style,
        // Local previews are JPEGs; requested format/background are not applied to sample pixels.
        format: "jpeg",
        demo: true,
      };
    }),
  };
  return Response.json(response, { headers: noStore });
}
