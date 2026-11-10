import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultImageSettings } from "@/constants/image-generator";
import { landingAssets } from "@/constants/landing-media";
import type { ImageGenerationRequest, ImageGenerationResponse, ImageResult } from "@/types/image-generator";
import { ImagePreviewError, requestImagePreview } from "./client";

const settings: ImageGenerationRequest = {
  ...defaultImageSettings,
  prompt: "A sculptural perfume bottle",
  count: 2,
  seed: 42,
  negativePrompt: "blurry",
  enhancePrompt: true,
  references: [{ id: "reference-1", mimeType: "image/png", size: 1024 }],
};

function image(index: number): ImageResult {
  return {
    id: `sample-${index}`,
    url: landingAssets.product.image,
    alt: "Sample preview: A sculptural perfume bottle",
    prompt: settings.prompt,
    model: settings.model,
    aspectRatio: settings.aspectRatio,
    resolution: settings.resolution,
    quality: settings.quality,
    createdAt: "2026-11-10T12:00:00.000Z",
    favorite: false,
    seed: settings.seed!,
    style: settings.style,
    format: "jpeg",
    demo: true,
  };
}

function preview(): ImageGenerationResponse {
  return { id: "demo-request", demo: true, creditsCharged: 0, images: [image(1), image(2)] };
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function fetchReturning(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

beforeEach(() => {
  // The preview transport must work independently of real API/Supabase configuration.
  vi.stubEnv("NEXT_PUBLIC_API_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("image preview transport", () => {
  it("posts complete settings and reference descriptors only to the local demo endpoint", async () => {
    const result = preview();
    const fetcher = fetchReturning(jsonResponse(result));
    const controller = new AbortController();
    const original = structuredClone(settings);

    await expect(requestImagePreview(settings, controller.signal, fetcher)).resolves.toEqual(result);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetcher.mock.calls[0];
    expect(endpoint).toBe("/api/demo/image-generation");
    expect(options?.method).toBe("POST");
    expect(options?.signal).toBe(controller.signal);
    const headers = new Headers(options?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    for (const name of ["Authorization", "X-API-Key", "apikey", "Idempotency-Key"]) expect(headers.has(name)).toBe(false);
    const body = JSON.parse(options?.body as string);
    expect(body).toEqual(settings);
    expect(body.references).toEqual([{ id: "reference-1", mimeType: "image/png", size: 1024 }]);
    expect(body.references[0]).not.toHaveProperty("url");
    expect(body.references[0]).not.toHaveProperty("data");
    expect(body.references[0]).not.toHaveProperty("file");
    expect(settings).toEqual(original);
  });

  it("preserves structured validation messages and field errors", async () => {
    const fields = { prompt: "Add an idea.", "references.0.size": "This reference is too large." };
    const fetcher = fetchReturning(jsonResponse({ ok: false, error: { code: "VALIDATION_ERROR", message: "Check your image settings.", fields } }, 400));
    const error = await requestImagePreview(settings, new AbortController().signal, fetcher).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ImagePreviewError);
    expect(error).toMatchObject({ message: "Check your image settings.", fields });
  });

  it("gives a useful fallback for non-JSON HTTP failures", async () => {
    const fetcher = fetchReturning(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(requestImagePreview(settings, new AbortController().signal, fetcher)).rejects.toMatchObject({
      name: "ImagePreviewError", message: "The preview couldn’t be created. Please try again.", fields: {},
    });
  });

  it("turns network failures into a friendly connection message", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Internal transport detail"));
    await expect(requestImagePreview(settings, new AbortController().signal, fetcher)).rejects.toMatchObject({
      name: "ImagePreviewError", message: "We couldn’t reach the preview. Check your connection and try again.",
    });
  });

  it("preserves cancellation while the request is in flight", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(abort);
    await expect(requestImagePreview(settings, new AbortController().signal, fetcher)).rejects.toBe(abort);
  });

  it("preserves cancellation while the response body is being read", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const response = jsonResponse(preview());
    vi.spyOn(response, "json").mockRejectedValue(abort);
    await expect(requestImagePreview(settings, new AbortController().signal, fetchReturning(response))).rejects.toBe(abort);
  });

  it.each([1, -1, "0", null])("rejects responses that do not explicitly charge zero credits: %j", async (creditsCharged) => {
    const fetcher = fetchReturning(jsonResponse({ ...preview(), creditsCharged }));
    await expect(requestImagePreview(settings, new AbortController().signal, fetcher)).rejects.toBeInstanceOf(ImagePreviewError);
  });

  it.each([
    null,
    {},
    { ...preview(), id: undefined },
    { ...preview(), demo: false },
    { ...preview(), images: {} },
    { ...preview(), images: [] },
    { ...preview(), images: [image(1)] },
    { ...preview(), images: [image(1), image(2), image(3)] },
    { ...preview(), images: [{}, {}] },
  ])("rejects a malformed success body", async (body) => {
    await expect(requestImagePreview(settings, new AbortController().signal, fetchReturning(jsonResponse(body)))).rejects.toBeInstanceOf(ImagePreviewError);
  });

  it.each([
    { url: "https://outside.example/image.jpg" },
    { url: "data:image/png;base64,abc" },
    { url: "/media/landing/../../private-image.jpg" },
    { demo: false },
    { id: "" },
    { prompt: null },
    { seed: "42" },
    { favorite: "false" },
  ])("rejects malformed image metadata or untrusted sample URLs: %j", async (patch) => {
    const body = { ...preview(), images: [{ ...image(1), ...patch }, image(2)] };
    await expect(requestImagePreview(settings, new AbortController().signal, fetchReturning(jsonResponse(body)))).rejects.toBeInstanceOf(ImagePreviewError);
  });

  it("rejects an invalid JSON success response", async () => {
    const fetcher = fetchReturning(new Response("{broken", { status: 200 }));
    await expect(requestImagePreview(settings, new AbortController().signal, fetcher)).rejects.toBeInstanceOf(ImagePreviewError);
  });

  it("sanitizes malformed error fields before exposing them to the UI", async () => {
    const response = jsonResponse({ error: { message: 7, fields: { prompt: { detail: "Invalid" }, queue: "Choose a queue.", count: 4 } } }, 400);
    await expect(requestImagePreview(settings, new AbortController().signal, fetchReturning(response))).rejects.toMatchObject({
      name: "ImagePreviewError", message: "The preview couldn’t be created. Please try again.", fields: { queue: "Choose a queue." },
    });
  });
});
