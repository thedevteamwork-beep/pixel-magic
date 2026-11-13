import {
  calculateUpscaleOutput,
  CONTENT_TYPE_BY_FORMAT,
  isSupportedUpscaleContentType,
  isWithinUpscaleLimits,
  MAX_UPSCALE_BYTES,
  UPSCALE_FORMATS,
} from "./limits";
import type { LoadedUpscaleFile, UpscaleFactor, UpscaleOutput } from "./types";

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

function validateOutput(output: UpscaleOutput) {
  if (
    !output ||
    !UPSCALE_FORMATS.some((format) => format === output.format) ||
    output.contentType !== CONTENT_TYPE_BY_FORMAT[output.format] ||
    !isWithinUpscaleLimits(output.width, output.height)
  ) {
    throw new Error("Choose supported output dimensions and a PNG, JPG, or WebP format.");
  }
}

function encodeCanvas(canvas: HTMLCanvasElement, output: UpscaleOutput): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("The browser couldn’t export this image. Try a smaller output."));
        else if (blob.type !== output.contentType)
          reject(new Error(`Your browser couldn’t export ${output.format.toUpperCase()}. Choose PNG and try again.`));
        else resolve(blob);
      },
      output.contentType,
      output.format === "png" ? undefined : 0.92,
    );
  });
}

/** Local high-quality canvas interpolation; this does not call an AI provider. */
export async function resizeUpscaleImage(sourceUrl: string, output: UpscaleOutput, signal: AbortSignal): Promise<Blob> {
  checkAbort(signal);
  validateOutput(output);
  let source: URL;
  try {
    source = new URL(sourceUrl);
  } catch {
    throw new Error("Choose an image from your device first.");
  }
  if (source.protocol !== "blob:" || source.origin !== window.location.origin)
    throw new Error("Choose a local image preview to resize.");
  const response = await fetch(source.href, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("That image preview is no longer available. Add the image again.");
  const file = await waitFor(response.blob(), signal);
  await verifyImageFile(file, signal);
  const decoded = await decodeImage(file, signal);
  let canvas: HTMLCanvasElement | undefined;
  try {
    checkAbort(signal);
    const factor = output.width / decoded.width;
    const expected = calculateUpscaleOutput(decoded, factor as UpscaleFactor, output.format);
    if (output.height !== expected.height)
      throw new Error("The source image changed. Select the image again before resizing.");
    canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d", { alpha: output.format !== "jpg" });
    if (!context) throw new Error("Your browser couldn’t start the resize. Try a smaller output.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    if (output.format === "jpg") {
      context.fillStyle = "white";
      context.fillRect(0, 0, output.width, output.height);
    }
    context.drawImage(decoded.image, 0, 0, output.width, output.height);
    checkAbort(signal);
    const blob = await waitFor(encodeCanvas(canvas, output), signal);
    checkAbort(signal);
    return blob;
  } finally {
    decoded.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
