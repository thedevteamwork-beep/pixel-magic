import { landingAssets } from "@/constants/landing-media";
import { videoInspirations, videoSampleAssets } from "@/components/video-generator/constants";
import { estimateCredits } from "@/lib/video-generator/settings";
import { validateVideoGenerationRequest } from "@/lib/video-generator/validation";
import type { MediaId } from "@/types/landing";
import type { VideoGenerationRequest, VideoGenerationResponse } from "@/types/video-generator";

const MAX_BODY_BYTES = 64 * 1024;
const noStore = { "Cache-Control": "no-store" };
class BodyTooLargeError extends Error {}

function failure(code: string, message: string, status = 400, fields?: Record<string, string>) {
  return Response.json(
    { ok: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status, headers: noStore },
  );
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

const sampleKeywords: Record<MediaId, readonly string[]> = {
  desert: ["desert", "dune", "sand", "car", "road", "mountain", "sunset", "cinema", "film", "drive"],
  ocean: ["ocean", "sea", "wave", "beach", "coast", "water", "aerial", "drone", "surf", "tide"],
  portrait: ["portrait", "woman", "man", "person", "face", "smile", "character", "fashion", "neon", "dance"],
  product: ["product", "perfume", "bottle", "glass", "cosmetic", "fragrance", "packaging", "pedestal", "brand"],
  flowers: [],
  architecture: [],
  sneakers: [],
};

/** Choose from a fixed local sample catalog; this does not generate or edit any footage. */
function samplesFor(settings: VideoGenerationRequest): readonly MediaId[] {
  const words = settings.prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const motionHint = videoInspirations.find((item) => item.motion === settings.motion)?.asset;
  const ranked = videoSampleAssets
    .map((asset, index) => ({
      asset,
      index,
      score:
        sampleKeywords[asset].filter((keyword) => words.some((word) => word.startsWith(keyword))).length * 4 +
        (asset === motionHint ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.map((entry) => entry.asset);
}

/** Public, stateless demonstration. Never contacts a provider, stores frames, or charges credits. */
export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await readJSON(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return failure("PAYLOAD_TOO_LARGE", "Keep the request under 64 KiB. Send frame metadata only.", 413);
    return failure("INVALID_JSON", "Send a valid JSON request.");
  }
  const result = validateVideoGenerationRequest(input);
  if (!result.ok) return failure(result.error.code, result.error.message, 400, result.error.fields);

  const settings = result.data;
  const samples = samplesFor(settings);
  const batchId = `demo-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const response: VideoGenerationResponse = {
    id: batchId,
    demo: true,
    creditsCharged: 0,
    estimatedCredits: estimateCredits(settings),
    videos: Array.from({ length: settings.count }, (_, index) => {
      const media = landingAssets[samples[index % samples.length]];
      return {
        id: `sample-${crypto.randomUUID()}`,
        batchId,
        url: media.video!,
        poster: media.image,
        alt: `Sample preview: ${media.alt}. This is a pre-existing clip, not a generated result.`,
        prompt: settings.prompt,
        model: settings.model,
        mode: settings.mode,
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        duration: settings.duration,
        motion: settings.motion,
        audio: settings.audio,
        seed: settings.seed ?? crypto.getRandomValues(new Uint32Array(1))[0],
        createdAt,
        favorite: false,
        demo: true,
      };
    }),
  };
  return Response.json(response, { headers: noStore });
}
