import { describe, expect, it } from "vitest";
import { clearImage, HANDOFF_MAX_AGE_MS, peekImage, sendImage } from "./image";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const image = { target: "video" as const, url: "https://example.com/a.png", name: "a.png", mimeType: "image/png" };

describe("image handoff", () => {
  it("delivers a sent image to its target", () => {
    const storage = memoryStorage();
    sendImage({ ...image, prompt: "A bottle" }, storage, 1_000);
    expect(peekImage("video", storage, 2_000)).toEqual({ ...image, prompt: "A bottle", sentAt: 1_000 });
  });

  it("ignores an image sent elsewhere", () => {
    const storage = memoryStorage();
    sendImage(image, storage, 1_000);
    expect(peekImage("upscale", storage, 2_000)).toBeNull();
  });

  it("ignores an old image", () => {
    const storage = memoryStorage();
    sendImage(image, storage, 1_000);
    expect(peekImage("video", storage, 1_001 + HANDOFF_MAX_AGE_MS)).toBeNull();
  });

  it("is gone once cleared", () => {
    const storage = memoryStorage();
    sendImage(image, storage, 1_000);
    clearImage(storage);
    expect(peekImage("video", storage, 2_000)).toBeNull();
  });

  it("ignores anything malformed", () => {
    const storage = memoryStorage();
    storage.setItem("pixelmagic:image-handoff", "{not json");
    expect(peekImage("video", storage)).toBeNull();
    storage.setItem("pixelmagic:image-handoff", JSON.stringify({ target: "video", url: 7 }));
    expect(peekImage("video", storage)).toBeNull();
  });
});
