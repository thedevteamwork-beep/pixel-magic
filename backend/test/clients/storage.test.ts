import { beforeEach, describe, expect, it } from "vitest";
import { StorageError } from "../../src/clients/storage.js";
import { FakeStorage } from "../fakes/storage.js";

describe("FakeStorage contract", () => {
  let fake: FakeStorage;
  beforeEach(() => {
    fake = new FakeStorage();
  });

  it("returns null info for a missing object", async () =>
    expect(await fake.getObjectInfo("inputs", "u/x")).toBeNull());

  it("returns info for a put object", async () => {
    fake.put("inputs", "u/x", { sizeBytes: 5, mimeType: "image/png" });
    expect(await fake.getObjectInfo("inputs", "u/x")).toEqual({
      sizeBytes: 5,
      mimeType: "image/png",
    });
  });

  it("copyFromUrl stores the object and records the copy", async () => {
    await fake.copyFromUrl(
      "outputs",
      "u/j/0.png",
      "https://fal.media/a.png",
      "image/png",
    );
    expect(await fake.getObjectInfo("outputs", "u/j/0.png")).toEqual({
      sizeBytes: 1,
      mimeType: "image/png",
    });
    expect(fake.copies).toHaveLength(1);
  });

  it("failNext makes the next call reject with StorageError", async () => {
    fake.failNext("getObjectInfo");
    await expect(fake.getObjectInfo("inputs", "p")).rejects.toBeInstanceOf(
      StorageError,
    );
    expect(await fake.getObjectInfo("inputs", "p")).toBeNull();
  });

  it("signed upload URL and token", async () => {
    expect(await fake.createSignedUploadUrl("inputs", "p")).toEqual({
      signedUrl: "https://storage.test/inputs/p?mode=upload",
      token: "tok-p",
    });
  });

  it("signed read URL carries the expiry", async () =>
    expect(await fake.createSignedUrl("outputs", "p", 3600)).toBe(
      "https://storage.test/outputs/p?mode=read&expires=3600",
    ));
});
