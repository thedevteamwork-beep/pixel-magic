import {
  CLIP_MIME_TYPES,
  FRAME_MIME_TYPES,
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  MAX_FRAME_BYTES,
  MIN_CLIP_SECONDS,
} from "@/components/video-generator/constants";
import type { FrameImage, MotionClip } from "@/types/video-generator";

export class FrameError extends Error {}

async function decode(url: string): Promise<{ width: number; height: number }> {
  const image = new window.Image();
  image.src = url;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new FrameError("Unreadable image");
  return { width: image.naturalWidth, height: image.naturalHeight };
}

/** Decode a local file into a frame. The object URL is owned by the caller. */
export async function loadFrameFile(file: File): Promise<FrameImage> {
  if (!FRAME_MIME_TYPES.some((type) => type === file.type))
    throw new FrameError(`${file.name}: choose a JPG, PNG, or WebP image.`);
  if (!file.size || file.size > MAX_FRAME_BYTES)
    throw new FrameError(`${file.name}: choose an image smaller than 20 MB.`);
  const url = URL.createObjectURL(file);
  try {
    const size = await decode(url);
    return {
      id: crypto.randomUUID(),
      url,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      source: "upload",
      ...size,
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new FrameError(`${file.name} couldn’t be opened. Try another image.`);
  }
}

/** Use one of the bundled sample stills as a frame. */
export async function loadSampleFrame(url: string, name: string, signal?: AbortSignal): Promise<FrameImage> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new FrameError("That sample couldn’t be added. Please try again.");
  const blob = await response.blob();
  const size = await decode(url);
  return {
    id: crypto.randomUUID(),
    url,
    name,
    mimeType: blob.type || "image/jpeg",
    size: blob.size,
    source: "sample",
    ...size,
  };
}

/** Grab the frame currently shown by a same-origin video. The object URL is owned by the caller. */
export async function captureVideoFrame(video: HTMLVideoElement, name: string): Promise<FrameImage> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new FrameError("The video isn’t ready yet. Try again in a moment.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new FrameError("That frame couldn’t be captured. Please try again.");
  return {
    id: crypto.randomUUID(),
    url: URL.createObjectURL(blob),
    name,
    mimeType: "image/jpeg",
    size: blob.size,
    source: "capture",
    width,
    height,
  };
}

/**
 * The last frame of a video at `url`, to continue a shot from where it ends.
 * Remote videos must allow CORS (storage URLs do). The object URL is owned by the caller.
 */
export async function captureLastFrame(url: string, name: string): Promise<FrameImage> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "auto";
  video.src = url;
  const once = (event: string) =>
    new Promise<void>((resolve, reject) => {
      video.addEventListener(event, () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new FrameError("That video couldn’t be read.")), { once: true });
    });
  try {
    await once("loadeddata");
    video.currentTime = Math.max(0, video.duration - 0.1);
    await once("seeked");
    return await captureVideoFrame(video, name);
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

/** Read a local motion clip's length and shape. The object URL is owned by the caller. */
export async function loadClipFile(file: File): Promise<MotionClip> {
  if (!CLIP_MIME_TYPES.some((type) => type === file.type))
    throw new FrameError(`${file.name}: choose an MP4 or MOV clip.`);
  if (!file.size || file.size > MAX_CLIP_BYTES)
    throw new FrameError(`${file.name}: choose a clip smaller than 100 MB.`);
  const url = URL.createObjectURL(file);
  try {
    const meta = await new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () =>
        resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => reject(new FrameError("Unreadable clip"));
      video.src = url;
    });
    if (!Number.isFinite(meta.duration) || !meta.width)
      throw new FrameError(`${file.name} couldn’t be opened. Try another clip.`);
    if (meta.duration < MIN_CLIP_SECONDS || meta.duration > MAX_CLIP_SECONDS) {
      throw new FrameError(
        `Use a clip between ${MIN_CLIP_SECONDS} and ${MAX_CLIP_SECONDS} seconds; this one is ${Math.round(meta.duration)}s.`,
      );
    }
    return { id: crypto.randomUUID(), url, name: file.name, mimeType: file.type, size: file.size, ...meta };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error instanceof FrameError && !error.message.startsWith("Unreadable")
      ? error
      : new FrameError(`${file.name} couldn’t be opened. Try another clip.`);
  }
}
