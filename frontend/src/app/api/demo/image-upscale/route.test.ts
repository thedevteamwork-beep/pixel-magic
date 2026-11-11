import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_UPSCALE_BODY_BYTES } from "@/lib/image-upscaler/limits";
import { defaultUpscaleSettings } from "@/lib/image-upscaler/models";
import type { UpscaleRequest } from "@/lib/image-upscaler/types";
import { POST } from "./route";

const endpoint = "https://pixel.example/api/demo/image-upscale";
const settings = { ...defaultUpscaleSettings, upscale_factor: 4 as const };
const metadata: UpscaleRequest = { ...settings, source: { width: 800, height: 600, contentType: "image/png", size: 12_000 } };
const fetchSpy = vi.fn();
const request = (body: unknown = metadata) => new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });

beforeEach(() => { fetchSpy.mockReset(); vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { expect(fetchSpy).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

describe("local upscale metadata API", () => {
  it("returns exact free output dimensions and MIME without pixel uploads or external requests", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ demo: true, creditsCharged: 0, settings, output: { width: 3200, height: 2400, contentType: "image/png", format: "png" } });
  });

  it("rejects extra URLs/file data and outputs beyond the local allocation limit", async () => {
    for (const body of [
      { ...metadata, image_url: "https://outside.example/image.png" },
      { ...metadata, output_format: "png" },
      { ...metadata, source: { ...metadata.source, file: "data:image/png;base64,private" } },
      { ...metadata, source: { ...metadata.source, width: 4096, height: 3072 } },
    ]) {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
  });

  it("rejects file/multipart requests and malformed JSON explicitly", async () => {
    const wrongType = await POST(new Request(endpoint, { method: "POST", headers: { "Content-Type": "image/png" }, body: "pixels" }));
    expect(wrongType.status).toBe(415);
    const broken = await POST(new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken" }));
    expect(broken.status).toBe(400);
    expect(await broken.json()).toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it("bounds both declared and actual UTF-8 bytes even with a false length header", async () => {
    for (const options of [
      { length: MAX_UPSCALE_BODY_BYTES + 1, body: "{}" },
      { length: 1, body: JSON.stringify({ image: "é".repeat(MAX_UPSCALE_BODY_BYTES / 2) }) },
    ]) {
      const response = await POST(new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": String(options.length) }, body: options.body }));
      expect(response.status).toBe(413);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
    }
  });
});
