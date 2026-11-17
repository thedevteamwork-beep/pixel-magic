import { describe, expect, it } from "vitest";
import { defineFalModel, imageUrls } from "../../src/models/falModel.js";
import {
  OutputInvalidError,
  type ModelSchema,
} from "../../src/models/types.js";
import { FakeFal } from "../fakes/fal.js";

const schema: ModelSchema = {
  info: {
    name: "demo_generate",
    displayName: "Demo",
    kind: "image",
    category: ["text-to-image"],
    description: "A test model.",
  },
  input: {
    prompt: { type: "string", description: "Prompt", required: true },
    images: {
      type: "image",
      description: "References",
      required: false,
      maxItems: 3,
      supportedContentTypes: ["image/png"],
    },
    size: {
      type: "string",
      description: "Size",
      enum: ["s", "l"],
      default: "s",
    },
  },
  output: { description: "Images", mimeTypes: ["image/png"] },
  billing: { units: ["images"] },
};

const edit = defineFalModel({
  plugin: "demo",
  operation: "generate",
  schema,
  endpoint: (input) =>
    imageUrls(input.images).length ? "owner/demo/edit" : "owner/demo",
  app: "owner/demo",
  payload: (input) => ({
    prompt: input.prompt,
    image_urls: imageUrls(input.images),
  }),
  output: "images",
});

describe("defineFalModel", () => {
  it("describes the model from its schema", () => {
    expect(edit).toMatchObject({
      plugin: "demo",
      operation: "generate",
      key: "demo_generate",
      kind: "image",
      uploads: { field: "images", min: 0, max: 3 },
      timeoutMinutes: 10,
    });
    expect(edit.input.parse({ prompt: "a" })).toEqual({
      prompt: "a",
      images: [],
      size: "s",
    });
  });

  it("submits to the endpoint the input picks and follows up through the fal app", async () => {
    const fal = new FakeFal();
    fal.statuses.set("req_1", "COMPLETED");
    fal.results.set("req_1", { ok: true, data: {} });
    const { requestId } = await edit.requestPrediction({
      fal,
      input: { prompt: "a", images: ["https://x/1.png", "https://x/2.png"] },
      webhook: "https://hook",
    });
    await edit.checkPredictionStatus({ fal, requestId, hasImage: true });
    await edit.getPredictionResult({ fal, requestId, hasImage: true });
    await edit.cancelPrediction({ fal, requestId, hasImage: true });
    expect(fal.calls.map((call) => [call.method, call.args[0]])).toEqual([
      ["submit", "owner/demo/edit"],
      ["status", "owner/demo"],
      ["result", "owner/demo"],
      ["cancel", "owner/demo"],
    ]);
    expect(fal.calls[0]!.args[1]).toEqual({
      prompt: "a",
      image_urls: ["https://x/1.png", "https://x/2.png"],
    });
  });

  it("needs the fal app when the endpoint is a function", () => {
    expect(() =>
      defineFalModel({
        plugin: "demo",
        operation: "generate",
        schema,
        endpoint: () => "x/y",
        payload: () => ({}),
        output: "images",
      }),
    ).toThrow(/needs its fal app/);
  });

  it("prices on the options and whether there are uploads by default", () => {
    expect(
      edit.billingInputs({ options: { size: "l" }, uploadCount: 2 }),
    ).toEqual({ size: "l", image: true });
  });

  it("drops images fal's safety checker flagged and reads videos", () => {
    expect(
      edit.parseOutput({
        images: [
          { url: "https://fal.media/a.png" },
          { url: "https://fal.media/b.png", content_type: "image/jpeg" },
        ],
        has_nsfw_concepts: [true, false],
      }),
    ).toEqual({
      outputs: [{ url: "https://fal.media/b.png", mimeType: "image/jpeg" }],
      blockedCount: 1,
    });
    expect(() =>
      edit.parseOutput({ video: { url: "https://fal.media/v.mp4" } }),
    ).toThrow(OutputInvalidError);
    const clip = defineFalModel({
      plugin: "demo",
      operation: "generate",
      schema: { ...schema, info: { ...schema.info, kind: "video" } },
      endpoint: "owner/demo",
      payload: () => ({}),
      output: "video",
    });
    expect(
      clip.parseOutput({ video: { url: "https://fal.media/v.mp4" } }),
    ).toEqual({
      outputs: [{ url: "https://fal.media/v.mp4", mimeType: "video/mp4" }],
      blockedCount: 0,
    });
    expect(clip.timeoutMinutes).toBe(60);
  });

  it("reads one image or a list as a list", () => {
    expect(imageUrls("https://x/a.png")).toEqual(["https://x/a.png"]);
    expect(imageUrls(["https://x/a.png", 3])).toEqual(["https://x/a.png"]);
    expect(imageUrls(undefined)).toEqual([]);
  });
});
