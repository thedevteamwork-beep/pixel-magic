import { FRAME_MIME_TYPES, MAX_FRAME_BYTES } from "@/components/video-generator/constants";
import type { FrameImage } from "@/types/video-generator";

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
