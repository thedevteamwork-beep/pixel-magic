import { MAX_UPSCALE_BODY_BYTES } from "@/lib/image-upscaler/limits";
import { validateUpscaleRequest } from "@/lib/image-upscaler/validation";
import { UPSCALE_SETTING_KEYS } from "@/lib/image-upscaler/models";
import type { UpscalePlan, UpscaleSettings } from "@/lib/image-upscaler/types";

const noStore = { "Cache-Control": "no-store" };
class BodyTooLargeError extends Error {}

function failure(code: string, message: string, status = 400, fields?: Record<string, string>) {
  return Response.json({ ok: false, error: { code, message, ...(fields ? { fields } : {}) } }, { status, headers: noStore });
}

async function readJSON(request: Request): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > MAX_UPSCALE_BODY_BYTES) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_UPSCALE_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new BodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  return JSON.parse(text);
}

/** Public, stateless metadata planner. Pixels are resized locally by the browser. */
export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return failure("UNSUPPORTED_MEDIA_TYPE", "Send JSON image metadata only.", 415);
  }
  let input: unknown;
  try { input = await readJSON(request); }
  catch (error) {
    if (error instanceof BodyTooLargeError) return failure("PAYLOAD_TOO_LARGE", "Send image metadata only, under 4 KiB.", 413);
    return failure("INVALID_JSON", "Send valid JSON image metadata.");
  }
  const result = validateUpscaleRequest(input);
  if (!result.ok) return failure(result.error.code, result.error.message, 400, result.error.fields);
  const settings = Object.fromEntries(UPSCALE_SETTING_KEYS.map((key) => [key, result.data[key]])) as UpscaleSettings;
  const plan: UpscalePlan = { demo: true, creditsCharged: 0, settings, output: result.output };
  return Response.json(plan, { headers: noStore });
}
