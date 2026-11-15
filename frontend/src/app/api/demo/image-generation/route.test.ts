import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultImageSettings } from "@/constants/image-generator";
import { landingAssets } from "@/constants/landing-media";
import type { ImageGenerationResponse } from "@/types/image-generator";
import { POST } from "./route";

const endpoint = "http://localhost:3000/api/demo/image-generation";
const fetchSpy = vi.fn();

function request(patch: Record<string, unknown> = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...defaultImageSettings, prompt: "A sculptural perfume bottle", references: [], ...patch }),
  });
}

beforeEach(() => {
  fetchSpy.mockReset().mockRejectedValue(new Error("External requests are forbidden in the demo"));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
});

afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("public image generation demo API", () => {
  it("returns the requested quantity of explicitly labeled, free local samples", async () => {
    const response = await POST(request({ count: 4, seed: 0, resolution: "4K", quality: "High", format: "webp" }));
    const body = (await response.json()) as ImageGenerationResponse;
    const allowedImages = new Set(Object.values(landingAssets).map((asset) => asset.image));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({ demo: true, creditsCharged: 0 });
    expect(body.id).toMatch(/^demo-/);
    expect(body.images).toHaveLength(4);
    expect(new Set(body.images.map((image) => image.id)).size).toBe(4);
    for (const image of body.images) {
      expect(allowedImages.has(image.url)).toBe(true);
      expect(image.url).toMatch(/^\/_next\/static\/media\/[a-z]+\.jpg$/);
      expect(image).toMatchObject({
        demo: true,
        seed: 0,
        resolution: "4K",
        quality: "High",
        format: "jpeg",
        favorite: false,
      });
      expect(image.alt).toContain("Sample preview");
      expect(Number.isNaN(Date.parse(image.createdAt))).toBe(false);
    }
  });

  it("matches a prompt category while generating bounded random seed metadata", async () => {
    const response = await POST(request({ prompt: "Soft pink roses and delicate petals", seed: null }));
    const body = (await response.json()) as ImageGenerationResponse;

    expect(body.images[0].url).toBe(landingAssets.flowers.image);
    expect(Number.isInteger(body.images[0].seed)).toBe(true);
    expect(body.images[0].seed).toBeGreaterThanOrEqual(0);
    expect(body.images[0].seed).toBeLessThanOrEqual(4_294_967_295);
  });

  it("uses style as a sample-selection hint and accepts reference metadata without uploads", async () => {
    const response = await POST(
      request({
        prompt: "An expressive arrangement",
        style: "Product",
        mode: "edit",
        queue: "unlimited",
        references: [{ id: "reference-1", mimeType: "image/png", size: 1024 }],
      }),
    );
    const body = (await response.json()) as ImageGenerationResponse;

    expect(response.status).toBe(200);
    expect(body.images[0].url).toBe(landingAssets.product.image);
    expect(body.creditsCharged).toBe(0);
  });

  it("uses non-keyword styles as hints while keeping prompt subjects first", async () => {
    const analog = await POST(request({ prompt: "An expressive arrangement", style: "Analog" }));
    const analogBody = (await analog.json()) as ImageGenerationResponse;
    expect(analogBody.images[0].url).toBe(landingAssets.portrait.image);

    const botanical = await POST(request({ prompt: "Soft pink roses and delicate petals", style: "Analog" }));
    const botanicalBody = (await botanical.json()) as ImageGenerationResponse;
    expect(botanicalBody.images[0].url).toBe(landingAssets.flowers.image);
  });

  it("returns structured errors for invalid JSON", async () => {
    const response = await POST(new Request(endpoint, { method: "POST", body: "{broken" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "INVALID_JSON" } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    { model: "unknown-model" },
    { prompt: " " },
    { count: 5 },
    { count: 1.5 },
    { seed: -1 },
    { private: "true" },
    { format: "svg" },
    { mode: "edit" },
    { references: [{ id: "reference-1", mimeType: "image/png", size: 10, url: "https://example.com/photo.png" }] },
  ])("rejects invalid generation settings without provider work: %j", async (patch) => {
    const response = await POST(request(patch));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("rejects oversized declared bodies before reading them", async () => {
    const response = await POST(
      new Request(endpoint, {
        method: "POST",
        headers: { "Content-Length": String(128 * 1024 + 1) },
        body: "{}",
      }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "PAYLOAD_TOO_LARGE" } });
  });

  it("bounds actual bytes despite an inaccurate length header", async () => {
    const response = await POST(
      new Request(endpoint, {
        method: "POST",
        headers: { "Content-Length": "1" },
        body: JSON.stringify({ prompt: "é".repeat(70_000) }),
      }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "PAYLOAD_TOO_LARGE" } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
