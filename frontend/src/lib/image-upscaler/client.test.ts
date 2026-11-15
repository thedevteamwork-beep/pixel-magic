import { describe, expect, it, vi } from "vitest";
import { requestUpscalePreview, UpscalePreviewError } from "./client";
import { defaultUpscaleSettings } from "./models";
import type { UpscalePlan, UpscaleRequest } from "./types";

const settings = { ...defaultUpscaleSettings, upscale_factor: 2 as const };
const request: UpscaleRequest = {
  ...settings,
  source: { width: 1200, height: 800, contentType: "image/jpeg", size: 100_000 },
};
const plan: UpscalePlan = {
  demo: true,
  creditsCharged: 0,
  settings,
  output: { width: 2400, height: 1600, contentType: "image/png", format: "png" },
};
const returning = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));

describe("upscale preview transport", () => {
  it("sends only metadata to the local planner, without credentials or provider configuration", async () => {
    const fetcher = returning(plan);
    const controller = new AbortController();
    await expect(requestUpscalePreview(request, controller.signal, fetcher)).resolves.toEqual(plan);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetcher.mock.calls[0];
    expect(endpoint).toBe("/api/demo/image-upscale");
    expect(options).toMatchObject({
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    expect(JSON.parse(options?.body as string)).toEqual(request);
    expect(JSON.parse(options?.body as string)).not.toHaveProperty("output_format");
    expect([...new Headers(options?.headers).keys()]).toEqual(["content-type"]);
  });

  it("rejects invalid metadata before any request starts", async () => {
    const fetcher = returning(plan);
    await expect(
      requestUpscalePreview(
        { ...request, source: { ...request.source, size: 0 } },
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toBeInstanceOf(UpscalePreviewError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...plan, demo: false },
    { ...plan, creditsCharged: 1 },
    { ...plan, creditsCharged: "0" },
    { ...plan, url: "https://outside.example/result.webp" },
    { ...plan, output: { ...plan.output, width: 4800 } },
    { ...plan, output: { ...plan.output, height: 2400 } },
    { ...plan, output: { ...plan.output, format: "jpg" } },
    { ...plan, output: { ...plan.output, contentType: "image/jpeg" } },
    { ...plan, output: { ...plan.output, url: "blob:unexpected" } },
    { ...plan, settings: { ...settings, sharpness: 60 } },
    { ...plan, settings: { ...settings, face_enhancement: true } },
    { ...plan, settings: { ...settings, preset: "High Fidelity V3" } },
    { ...plan, settings: { ...settings, upscale_factor: 4 } },
    { ...plan, settings: { ...settings, model: "topaz-generative" } },
    { ...plan, settings: { ...settings, output_format: "png" } },
  ])("rejects mismatched plans, unexpected data, and non-free results: %j", async (result) => {
    await expect(
      requestUpscalePreview(request, new AbortController().signal, returning(result)),
    ).rejects.toBeInstanceOf(UpscalePreviewError);
  });

  it("preserves safe field errors and handles non-JSON failures", async () => {
    const fields = { upscale_factor: "Choose a smaller factor.", source: { private: "diagnostic" } };
    await expect(
      requestUpscalePreview(
        request,
        new AbortController().signal,
        returning({ error: { message: "Check your settings.", fields } }, 400),
      ),
    ).rejects.toMatchObject({
      message: "Check your settings.",
      fields: { upscale_factor: "Choose a smaller factor." },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(requestUpscalePreview(request, new AbortController().signal, fetcher)).rejects.toMatchObject({
      name: "UpscalePreviewError",
      message: "The resize couldn’t be prepared. Please try again.",
    });
  });

  it("gives connection guidance without exposing a network diagnostic", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Private endpoint diagnostic"));
    await expect(requestUpscalePreview(request, new AbortController().signal, fetcher)).rejects.toMatchObject({
      name: "UpscalePreviewError",
      message: "We couldn’t prepare the resize. Check your connection and try again.",
    });
  });

  it("does no work when already canceled and preserves cancellation during body parsing", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = returning(plan);
    await expect(requestUpscalePreview(request, controller.signal, fetcher)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetcher).not.toHaveBeenCalled();

    const response = Response.json(plan);
    const abort = new DOMException("Canceled", "AbortError");
    vi.spyOn(response, "json").mockRejectedValue(abort);
    await expect(
      requestUpscalePreview(request, new AbortController().signal, vi.fn<typeof fetch>().mockResolvedValue(response)),
    ).rejects.toBe(abort);
  });
});
