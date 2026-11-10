import { describe, expect, it } from "vitest";
import {
  aspectRatios,
  defaultImageSettings,
  imageModels,
  imageStyles,
  MAX_PROMPT_LENGTH,
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_IMAGES,
  qualities,
  REFERENCE_MIME_TYPES,
  resolutions,
} from "@/constants/image-generator";
import { validateImageGenerationRequest } from "./validation";

function validRequest() {
  return { ...defaultImageSettings, prompt: "An editorial photograph of a perfume bottle", references: [] };
}

function invalidField(patch: Record<string, unknown>, field: string) {
  const result = validateImageGenerationRequest({ ...validRequest(), ...patch });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected invalid settings");
  expect(result.error.code).toBe("VALIDATION_ERROR");
  expect(result.error.fields?.[field]).toBeDefined();
}

describe("image demo request validation", () => {
  it("normalizes prompt whitespace and returns a complete settings whitelist", () => {
    const result = validateImageGenerationRequest({ ...validRequest(), prompt: "  A pink rose  ", negativePrompt: "  blurry  " });
    expect(result).toEqual({ ok: true, data: { ...validRequest(), prompt: "A pink rose", negativePrompt: "blurry" } });
  });

  it.each([null, [], "prompt", 1, true])("rejects a non-object request: %j", (input) => {
    expect(validateImageGenerationRequest(input).ok).toBe(false);
  });

  it("requires settings rather than silently applying defaults", () => {
    const result = validateImageGenerationRequest({ prompt: "A pink rose", references: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.fields?.model).toBeDefined();
      expect(result.error.fields?.count).toBeDefined();
      expect(result.error.fields?.private).toBeDefined();
      expect(result.error.fields?.seed).toBeDefined();
    }
  });

  it.each(["", " \n\t ", "a".repeat(MAX_PROMPT_LENGTH + 1)])("rejects an empty or excessive prompt", (prompt) => {
    invalidField({ prompt }, "prompt");
  });

  it("accepts the prompt length boundary", () => {
    expect(validateImageGenerationRequest({ ...validRequest(), prompt: "a".repeat(MAX_PROMPT_LENGTH) }).ok).toBe(true);
  });

  it.each([
    ["model", "unknown-model"], ["mode", "inpaint"], ["aspectRatio", "37:1"], ["resolution", "8K"],
    ["quality", "unsupported-quality"], ["quality", "Extra High"], ["quality", "Max"], ["queue", "priority"], ["style", "unsupported-style"],
    ["format", "svg"], ["background", "checkerboard"], ["enhancePrompt", "true"], ["private", 1],
  ])("rejects unsupported %s", (field, value) => invalidField({ [field as string]: value }, field as string));

  it("tracks the shared option catalog", () => {
    const catalogs = {
      model: imageModels.map((model) => model.id), aspectRatio: aspectRatios, resolution: resolutions,
      quality: qualities, style: imageStyles, queue: ["credits", "unlimited"],
      format: ["png", "jpeg", "webp"], background: ["auto", "opaque", "transparent"],
    };
    for (const [field, options] of Object.entries(catalogs)) {
      for (const value of options) expect(validateImageGenerationRequest({ ...validRequest(), [field]: value }).ok).toBe(true);
    }
  });

  it.each([0, 5, 1.5, "2", null, Number.NaN])("rejects count %j", (count) => invalidField({ count }, "count"));

  it.each([-1, 4_294_967_296, 1.5, "42", Number.NaN])("rejects seed %j", (seed) => invalidField({ seed }, "seed"));

  it.each([null, 0, 4_294_967_295])("accepts a null or bounded integer seed %j", (seed) => {
    expect(validateImageGenerationRequest({ ...validRequest(), seed }).ok).toBe(true);
  });

  it("limits negative prompts and keeps strict boolean settings", () => {
    invalidField({ negativePrompt: "a".repeat(1001) }, "negativePrompt");
    expect(validateImageGenerationRequest({ ...validRequest(), negativePrompt: "a".repeat(1000), enhancePrompt: true, private: false }).ok).toBe(true);
  });

  it("requires a reference for edit mode", () => invalidField({ mode: "edit" }, "references"));

  it("accepts supported metadata at reference count and size boundaries", () => {
    const references = Array.from({ length: MAX_REFERENCE_IMAGES }, (_, index) => ({
      id: `reference-${index}`, mimeType: REFERENCE_MIME_TYPES[index % REFERENCE_MIME_TYPES.length], size: MAX_REFERENCE_BYTES,
    }));
    expect(validateImageGenerationRequest({ ...validRequest(), mode: "edit", references }).ok).toBe(true);
    invalidField({ references: [...references, { id: "extra", mimeType: "image/png", size: 10 }] }, "references");
  });

  it.each([
    { id: "image", mimeType: "image/gif", size: 10 },
    { id: "image", mimeType: "image/png", size: MAX_REFERENCE_BYTES + 1 },
    { id: "image", mimeType: "image/png", size: 0 },
    { id: "image", mimeType: "image/png", size: 1.5 },
    { id: "a".repeat(129), mimeType: "image/png", size: 10 },
    { id: "https://example.com/image.jpg", mimeType: "image/png", size: 10 },
    { id: "data:image/png;base64,abc", mimeType: "image/png", size: 10 },
  ])("rejects invalid reference metadata: %j", (reference) => {
    const result = validateImageGenerationRequest({ ...validRequest(), references: [reference] });
    expect(result.ok).toBe(false);
  });

  it("rejects reference URLs, file bytes, unknown settings and duplicate IDs", () => {
    const reference = { id: "reference-1", mimeType: "image/png", size: 10 };
    invalidField({ references: [{ ...reference, url: "https://example.com/image.png" }] }, "references.0");
    invalidField({ references: [{ ...reference, data: "data:image/png;base64,abc" }] }, "references.0");
    invalidField({ references: [reference, reference] }, "references.1.id");
    invalidField({ inputUrl: "https://example.com/image.png" }, "request");
    invalidField({ references: "https://example.com/image.png" }, "references");
  });
});
