import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultVideoSettings } from "@/constants/video-generator";
import { landingAssets } from "@/constants/landing-media";
import type { VideoGenerationResponse } from "@/types/video-generator";
import { POST } from "./route";

const endpoint = "http://localhost:3000/api/demo/video-generation";
const fetchSpy = vi.fn();
const request = (patch: Record<string, unknown> = {}) => new Request(endpoint, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...defaultVideoSettings, prompt: "Turquoise waves meeting the shore", frames: { start: null, end: null }, ...patch }),
});

beforeEach(() => { fetchSpy.mockReset().mockRejectedValue(new Error("External requests are forbidden in the demo")); vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { expect(fetchSpy).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

describe("public video generation demo API", () => {
  it("returns labeled, free local sample clips with an indicative estimate", async () => {
    const response = await POST(request({ count: 3, seed: 7, resolution: "1080p", duration: 10, audio: true }));
    const body = await response.json() as VideoGenerationResponse;
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({ demo: true, creditsCharged: 0, estimatedCredits: 600 });
    expect(body.videos).toHaveLength(3);
    expect(body.videos[0].url).toBe(landingAssets.ocean.video);
    for (const video of body.videos) {
      expect(video).toMatchObject({ batchId: body.id, seed: 7, resolution: "1080p", duration: 10, audio: true, demo: true, favorite: false });
      expect(video.url).toMatch(/^\/media\/landing\/[a-z]+\.mp4$/);
      expect(video.poster).toMatch(/^\/media\/landing\/[a-z]+\.jpg$/);
      expect(video.alt).toContain("not a generated result");
    }
  });

  it("matches prompt subjects and animates frames without a prompt", async () => {
    const product = await (await POST(request({ prompt: "A glass perfume bottle turning slowly" }))).json() as VideoGenerationResponse;
    expect(product.videos[0].url).toBe(landingAssets.product.video);
    const animated = await POST(request({ prompt: "", mode: "image", frames: { start: { id: "frame-1", mimeType: "image/jpeg", size: 100 }, end: null } }));
    expect(animated.status).toBe(200);
  });

  it("rejects invalid JSON, invalid settings and oversized bodies", async () => {
    expect((await POST(new Request(endpoint, { method: "POST", body: "{broken" }))).status).toBe(400);
    const invalid = await POST(request({ model: "kling_2_1", resolution: "480p" }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", fields: { resolution: expect.any(String) } } });
    const large = await POST(new Request(endpoint, { method: "POST", headers: { "Content-Length": "1" }, body: JSON.stringify({ prompt: "é".repeat(40_000) }) }));
    expect(large.status).toBe(413);
  });
});
