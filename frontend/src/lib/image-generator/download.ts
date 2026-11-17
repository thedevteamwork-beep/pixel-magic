import type { ImageResult } from "@/types/image-generator";
import { downloadName } from "./results";

/**
 * Saves a result under a readable name. Signed storage URLs are on another
 * origin, where `<a download>` is ignored, so the bytes are fetched first;
 * if that fails the image opens in a new tab instead.
 */
export async function downloadResult(item: ImageResult): Promise<void> {
  try {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const url = URL.createObjectURL(await response.blob());
    const link = Object.assign(document.createElement("a"), { href: url, download: downloadName(item) });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    window.open(item.url, "_blank", "noopener");
  }
}

/** Fetches a result as a file, to use it as a reference image. */
export async function resultAsFile(item: ImageResult, signal?: AbortSignal): Promise<File> {
  const response = await fetch(item.url, { signal });
  if (!response.ok) throw new Error(`Image unavailable (${response.status})`);
  const blob = await response.blob();
  return new File([blob], downloadName(item), { type: blob.type || item.mimeType });
}
