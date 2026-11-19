import type { ImageResult } from "@/types/image-generator";
import { downloadFile } from "@/lib/download";
import { downloadName } from "./results";

/** Saves a result under a readable name. */
export function downloadResult(item: ImageResult): Promise<void> {
  return downloadFile(item.url, downloadName(item));
}

/** Fetches a result as a file, to use it as a reference image. */
export async function resultAsFile(item: ImageResult, signal?: AbortSignal): Promise<File> {
  const response = await fetch(item.url, { signal });
  if (!response.ok) throw new Error(`Image unavailable (${response.status})`);
  const blob = await response.blob();
  return new File([blob], downloadName(item), { type: blob.type || item.mimeType });
}
