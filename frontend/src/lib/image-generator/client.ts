import { aspectRatios, imageModels, imageStyles, qualities, resolutions } from "@/constants/image-generator";
import { landingAssets } from "@/constants/landing-media";
import type { ImageGenerationRequest, ImageGenerationResponse, ImageResult } from "@/types/image-generator";

const samplePaths = new Set(Object.values(landingAssets).map((asset) => asset.image));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSampleResult(value: unknown): value is ImageResult {
  if (!isRecord(value)) return false;
  const textFields = ["id", "url", "alt", "prompt", "model", "aspectRatio", "resolution", "quality", "createdAt", "style", "format"] as const;
  if (!textFields.every((key) => typeof value[key] === "string" && (value[key] as string).length > 0)) return false;
  return value.demo === true && typeof value.favorite === "boolean"
    && samplePaths.has(value.url as string)
    && imageModels.some((model) => model.id === value.model)
    && aspectRatios.some((ratio) => ratio === value.aspectRatio)
    && resolutions.some((resolution) => resolution === value.resolution)
    && qualities.some((quality) => quality === value.quality)
    && imageStyles.some((style) => style === value.style)
    && ["png", "jpeg", "webp"].includes(value.format as string)
    && Number.isFinite(Date.parse(value.createdAt as string))
    && typeof value.seed === "number" && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 4294967295;
}

function isAborted(error: unknown, signal: AbortSignal) {
  return signal.aborted || (error instanceof Error && error.name === "AbortError");
}

export class ImagePreviewError extends Error {
  constructor(message: string, public readonly fields: Record<string, string> = {}) { super(message); this.name = "ImagePreviewError"; }
}

/** This preview transport deliberately does not use the real generation client. */
export async function requestImagePreview(request: ImageGenerationRequest, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<ImageGenerationResponse> {
  let response: Response;
  try {
    response = await fetcher("/api/demo/image-generation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal,
    });
  } catch (error) {
    if (isAborted(error, signal)) throw error;
    throw new ImagePreviewError("We couldn’t reach the preview. Check your connection and try again.");
  }
  let result: unknown;
  try { result = await response.json(); }
  catch (error) { if (isAborted(error, signal)) throw error; }
  if (!response.ok) {
    const details = isRecord(result) && isRecord(result.error) ? result.error : {};
    const message = typeof details.message === "string" && details.message.trim() ? details.message : "The preview couldn’t be created. Please try again.";
    const fields = isRecord(details.fields) ? Object.fromEntries(Object.entries(details.fields).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
    throw new ImagePreviewError(message, fields);
  }
  if (!isRecord(result) || typeof result.id !== "string" || !result.id || result.demo !== true || result.creditsCharged !== 0
    || !Array.isArray(result.images) || result.images.length !== request.count || !result.images.every(isSampleResult)) {
    throw new ImagePreviewError("The preview returned an unexpected response. Please try again.");
  }
  return result as ImageGenerationResponse;
}
