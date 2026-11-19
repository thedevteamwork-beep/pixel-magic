/**
 * Passing an image from one studio to another (a generated image to the
 * video studio or the upscaler). The sender stores it for this tab and
 * navigates; the receiving page picks it up once, on arrival.
 */

/** Where an image can be sent. */
export type HandoffTarget = "image" | "video" | "upscale";

export type ImageHandoff = {
  target: HandoffTarget;
  url: string;
  /** File name for the image once fetched. */
  name: string;
  mimeType: string;
  /** The prompt that made it, if it was generated. */
  prompt?: string;
  /** When it was sent; old handoffs are ignored. */
  sentAt: number;
};

const STORAGE_KEY = "pixelmagic:image-handoff";
/** Long enough for a slow page load, short enough that a stale image never appears later. */
export const HANDOFF_MAX_AGE_MS = 5 * 60_000;

export const handoffPaths: Record<HandoffTarget, string> = { image: "/image", video: "/video", upscale: "/upscale" };

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

export function sendImage(
  image: Omit<ImageHandoff, "sentAt">,
  storage: Storage = sessionStorage,
  now = Date.now(),
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...image, sentAt: now } satisfies ImageHandoff));
}

/** The image waiting for `target`, if one was sent recently. Leaves it in place; see `clearImage`. */
export function peekImage(target: HandoffTarget, storage: Storage = sessionStorage, now = Date.now()) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const handoff = parsed as Partial<ImageHandoff>;
  if (
    handoff.target !== target ||
    typeof handoff.url !== "string" ||
    typeof handoff.name !== "string" ||
    typeof handoff.mimeType !== "string" ||
    typeof handoff.sentAt !== "number" ||
    now - handoff.sentAt > HANDOFF_MAX_AGE_MS ||
    handoff.sentAt > now
  )
    return null;
  return handoff as ImageHandoff;
}

export function clearImage(storage: Storage = sessionStorage): void {
  storage.removeItem(STORAGE_KEY);
}

/** Fetches the sent image as a file, ready for an upload control. */
export async function imageFile(handoff: ImageHandoff, signal?: AbortSignal): Promise<File> {
  const response = await fetch(handoff.url, { signal });
  if (!response.ok) throw new Error(`Image unavailable (${response.status})`);
  const blob = await response.blob();
  return new File([blob], handoff.name, { type: blob.type || handoff.mimeType });
}
