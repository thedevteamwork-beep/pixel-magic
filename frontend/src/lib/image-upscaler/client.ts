import { hasExactKeys, isRecord, validateUpscaleRequest } from "./validation";
import { UPSCALE_SETTING_KEYS } from "./models";
import type { UpscalePlan, UpscaleRequest, UpscaleSettings } from "./types";

export class UpscalePreviewError extends Error {
  constructor(message: string, public readonly fields: Record<string, string> = {}) {
    super(message);
    this.name = "UpscalePreviewError";
  }
}

function isAbort(error: unknown, signal: AbortSignal) {
  return signal.aborted || (error instanceof Error && error.name === "AbortError");
}

/** Requests dimensions only. Source image bytes are never transmitted. */
export async function requestUpscalePreview(request: UpscaleRequest, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<UpscalePlan> {
  if (signal.aborted) throw new DOMException("Upscale preview canceled.", "AbortError");
  const validation = validateUpscaleRequest(request);
  if (!validation.ok) throw new UpscalePreviewError(validation.error.message, validation.error.fields);
  let response: Response;
  try {
    response = await fetcher("/api/demo/image-upscale", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", cache: "no-store",
      body: JSON.stringify(validation.data), signal,
    });
  } catch (error) {
    if (isAbort(error, signal)) throw error;
    throw new UpscalePreviewError("We couldn’t prepare the resize. Check your connection and try again.");
  }
  let result: unknown;
  try { result = await response.json(); }
  catch (error) { if (isAbort(error, signal)) throw error; }
  if (signal.aborted) throw new DOMException("Upscale preview canceled.", "AbortError");
  if (!response.ok) {
    const details = isRecord(result) && isRecord(result.error) ? result.error : {};
    const message = typeof details.message === "string" && details.message.trim() ? details.message : "The resize couldn’t be prepared. Please try again.";
    const fields = isRecord(details.fields) ? Object.fromEntries(Object.entries(details.fields).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
    throw new UpscalePreviewError(message, fields);
  }
  const expected = validation.output;
  const settings = Object.fromEntries(UPSCALE_SETTING_KEYS.map((key) => [key, validation.data[key]])) as UpscaleSettings;
  const echoedSettings = isRecord(result) ? result.settings : undefined;
  if (!isRecord(result) || !hasExactKeys(result, ["demo", "creditsCharged", "settings", "output"]) || result.demo !== true || result.creditsCharged !== 0
    || !isRecord(echoedSettings) || !hasExactKeys(echoedSettings, UPSCALE_SETTING_KEYS) || !UPSCALE_SETTING_KEYS.every((key) => echoedSettings[key] === settings[key])
    || !isRecord(result.output) || !hasExactKeys(result.output, ["width", "height", "contentType", "format"])
    || result.output.width !== expected.width || result.output.height !== expected.height
    || result.output.contentType !== expected.contentType || result.output.format !== expected.format) {
    throw new UpscalePreviewError("The resize returned unexpected settings or dimensions. Please try again.");
  }
  return result as UpscalePlan;
}
