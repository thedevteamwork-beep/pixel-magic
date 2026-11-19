import { isSupportedUpscaleContentType, isWithinUpscaleLimits, MAX_UPSCALE_BYTES } from "./limits";
import type { LoadedUpscaleFile } from "./types";

function canceled(): DOMException {
  return new DOMException("Image processing canceled.", "AbortError");
}
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw canceled();
}

/** Image decoding/encoding cannot always be stopped; dispose late results after cancellation. */
function waitFor<T>(task: Promise<T>, signal?: AbortSignal, disposeLate?: (value: T) => void): Promise<T> {
  if (!signal) return task;
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      reject(canceled());
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    task.then(
      (value) => {
        if (settled) {
          disposeLate?.(value);
          return;
        }
        settled = true;
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function matchesImageHeader(bytes: Uint8Array, type: string): boolean {
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp")
    return (
      [82, 73, 70, 70].every((byte, index) => bytes[index] === byte) &&
      [87, 69, 66, 80].every((byte, index) => bytes[index + 8] === byte)
    );
  return false;
}

async function verifyImageFile(file: Blob, signal?: AbortSignal) {
  checkAbort(signal);
  if (!isSupportedUpscaleContentType(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (!file.size || file.size > MAX_UPSCALE_BYTES) throw new Error("Choose a nonempty image no larger than 20 MiB.");
  const bytes = new Uint8Array(await waitFor(file.slice(0, 12).arrayBuffer(), signal));
  checkAbort(signal);
  if (!matchesImageHeader(bytes, file.type))
    throw new Error("This file doesn’t match its image type. Choose a valid JPG, PNG, or WebP image.");
}

type DecodedImage = { image: CanvasImageSource; width: number; height: number; close: () => void };

async function decodeImage(file: Blob, signal?: AbortSignal): Promise<DecodedImage> {
  checkAbort(signal);
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await waitFor(createImageBitmap(file, { imageOrientation: "from-image" }), signal, (late) =>
        late.close(),
      );
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    }
    // Keep a native-image fallback for browsers without ImageBitmap support.
    const image = new Image();
    const url = URL.createObjectURL(file);
    const close = () => {
      image.src = "";
      URL.revokeObjectURL(url);
    };
    try {
      image.decoding = "async";
      image.src = url;
      await waitFor(image.decode(), signal);
      return { image, width: image.naturalWidth, height: image.naturalHeight, close };
    } catch (error) {
      close();
      throw error;
    }
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new Error("We couldn’t open that image. Choose another JPG, PNG, or WebP file.");
  }
}

/** Decodes and validates locally. The caller owns the returned preview object URL. */
export async function loadUpscaleFile(file: File, signal?: AbortSignal): Promise<LoadedUpscaleFile> {
  await verifyImageFile(file, signal);
  const decoded = await decodeImage(file, signal);
  try {
    checkAbort(signal);
    if (!isWithinUpscaleLimits(decoded.width, decoded.height))
      throw new Error("Choose an image up to 8,192 pixels per side and 32 megapixels.");
    const url = URL.createObjectURL(file);
    if (signal?.aborted) {
      URL.revokeObjectURL(url);
      throw canceled();
    }
    return { file, url, width: decoded.width, height: decoded.height };
  } finally {
    decoded.close();
  }
}
