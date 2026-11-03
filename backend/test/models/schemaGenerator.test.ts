import { describe, expect, it } from "vitest";
import {
  optionsValidator,
  promptRule,
  publicInput,
  uploadRule,
} from "../../src/models/schemaGenerator.js";
import { schema as flux } from "../../src/models/flux-schnell/schema.js";
import { schema as kling } from "../../src/models/kling21/schema.js";

describe("optionsValidator", () => {
  it("applies defaults", () => {
    expect(optionsValidator(flux).parse({})).toEqual({
      image_size: "landscape_4_3",
      num_images: 1,
    });
    expect(optionsValidator(kling).parse({})).toEqual({
      duration: "5",
      aspect_ratio: "16:9",
    });
  });

  it("rejects values outside an enum or a range", () => {
    expect(optionsValidator(kling).safeParse({ duration: "7" }).success).toBe(
      false,
    );
    expect(optionsValidator(flux).safeParse({ num_images: 5 }).success).toBe(
      false,
    );
    expect(optionsValidator(flux).safeParse({ num_images: 0 }).success).toBe(
      false,
    );
    expect(optionsValidator(flux).safeParse({ num_images: 1.5 }).success).toBe(
      false,
    );
  });

  it("leaves out the prompt and the image", () => {
    expect(Object.keys(optionsValidator(kling).shape)).toEqual([
      "duration",
      "aspect_ratio",
    ]);
  });
});

describe("promptRule", () => {
  it("reads required and maxLength", () => {
    expect(promptRule(flux)).toEqual({ required: true, maxLength: 2000 });
    expect(promptRule(kling)).toEqual({ required: true, maxLength: 2500 });
  });
});

describe("uploadRule", () => {
  it("is 0/0/[] without an image field", () => {
    expect(uploadRule(flux)).toEqual({
      min: 0,
      max: 0,
      supportedContentTypes: [],
    });
  });

  it("is optional (min 0) for an optional image field", () => {
    expect(uploadRule(kling)).toEqual({
      min: 0,
      max: 1,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
      ],
    });
  });

  it("is min 1 for a required image field", () => {
    const required = {
      ...kling,
      input: {
        ...kling.input,
        image: { ...kling.input.image!, required: true },
      },
    };
    expect(uploadRule(required).min).toBe(1);
  });
});

describe("publicInput", () => {
  it("keeps descriptions, enums and defaults", () => {
    const input = publicInput(kling);
    expect(input.prompt?.description).toBe(
      "Text description of what you want to generate",
    );
    expect(input.duration).toMatchObject({
      type: "string",
      enum: ["5", "10"],
      default: "5",
    });
  });
});
