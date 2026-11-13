import { landingAssets } from "@/constants/landing-media";
import { motionPresets, videoModels } from "@/constants/video-generator";
import type { VideoGenerationRequest, VideoGenerationResponse, VideoResult } from "@/types/video-generator";

const sampleVideos = new Set(Object.values(landingAssets).flatMap((asset) => asset.video ? [asset.video] : []));
const samplePosters = new Set(Object.values(landingAssets).map((asset) => asset.image));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSampleVideo(value: unknown, batchId: string): value is VideoResult {
  if (!isRecord(value)) return false;
  const textFields = ["id", "batchId", "url", "poster", "alt", "model", "mode", "aspectRatio", "resolution", "motion", "createdAt"] as const;
  if (!textFields.every((key) => typeof value[key] === "string" && (value[key] as string).length > 0)) return false;
  return value.demo === true && value.batchId === batchId && typeof value.favorite === "boolean" && typeof value.audio === "boolean"
    && typeof value.prompt === "string"
    && sampleVideos.has(value.url as string) && samplePosters.has(value.poster as string)
    && videoModels.some((model) => model.id === value.model)
    && motionPresets.some((preset) => preset.id === value.motion)
    && ["text", "image", "frames"].includes(value.mode as string)
    && ["480p", "720p", "1080p"].includes(value.resolution as string)
    && typeof value.duration === "number" && Number.isInteger(value.duration) && value.duration > 0
    && Number.isFinite(Date.parse(value.createdAt as string))
    && typeof value.seed === "number" && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 4294967295;
}

function isAborted(error: unknown, signal: AbortSignal) {
  return signal.aborted || (error instanceof Error && error.name === "AbortError");
}

export class VideoPreviewError extends Error {
  constructor(message: string, public readonly fields: Record<string, string> = {}) { super(message); this.name = "VideoPreviewError"; }
}

/** This preview transport deliberately does not use the real generation client. */
export async function requestVideoPreview(request: VideoGenerationRequest, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<VideoGenerationResponse> {
  let response: Response;
  try {
    response = await fetcher("/api/demo/video-generation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal,
    });
  } catch (error) {
    if (isAborted(error, signal)) throw error;
    throw new VideoPreviewError("We couldn’t reach the preview. Check your connection and try again.");
  }
  let result: unknown;
  try { result = await response.json(); }
  catch (error) { if (isAborted(error, signal)) throw error; }
  if (!response.ok) {
    const details = isRecord(result) && isRecord(result.error) ? result.error : {};
    const message = typeof details.message === "string" && details.message.trim() ? details.message : "The preview couldn’t be created. Please try again.";
    const fields = isRecord(details.fields) ? Object.fromEntries(Object.entries(details.fields).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
    throw new VideoPreviewError(message, fields);
  }
  if (!isRecord(result) || typeof result.id !== "string" || !result.id || result.demo !== true || result.creditsCharged !== 0
    || typeof result.estimatedCredits !== "number" || !Array.isArray(result.videos) || result.videos.length !== request.count
    || !result.videos.every((video) => isSampleVideo(video, result.id as string))) {
    throw new VideoPreviewError("The preview returned an unexpected response. Please try again.");
  }
  return result as VideoGenerationResponse;
}
