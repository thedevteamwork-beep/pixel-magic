import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseStorage,
  StorageError,
} from "../../src/clients/storage.js";
import { FakeStorage } from "../fakes/storage.js";
import { makeDeps } from "../helpers/app.js";

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

  it("signed read URLs keep the order of the paths", async () => {
    expect(await fake.createSignedUrls("outputs", ["a", "b"], 60)).toEqual([
      "https://storage.test/outputs/a?mode=read&expires=60",
      "https://storage.test/outputs/b?mode=read&expires=60",
    ]);
  });

  it("signed read URL carries the expiry", async () =>
    expect(await fake.createSignedUrl("outputs", "p", 3600)).toBe(
      "https://storage.test/outputs/p?mode=read&expires=3600",
    ));
});

describe("createSupabaseStorage copyFromUrl", () => {
  // Supabase points at a closed local port: nothing here leaves the machine.
  const config = {
    ...makeDeps().deps.config,
    SUPABASE_URL: "http://127.0.0.1:9",
  };

  it("rejects a source that redirected to a non-https URL", async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => {
      calls.push(url);
      const res = new Response("bytes");
      Object.defineProperty(res, "url", { value: "http://cdn.test/a.png" });
      return res;
    }) as unknown as typeof fetch;
    const storage = createSupabaseStorage(config, fetchFn);
    const err = await storage
      .copyFromUrl(
        "outputs",
        "u/j/0.png",
        "https://fal.media/a.png",
        "image/png",
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(StorageError);
    expect((err as StorageError).message).toMatch(
      /redirected to a non-https URL/,
    );
    expect(calls).toEqual(["https://fal.media/a.png"]);
  });
});

describe("createSupabaseStorage createSignedUrls", () => {
  const config = {
    ...makeDeps().deps.config,
    SUPABASE_URL: "http://supabase.test",
  };

  const fetchFn = vi.fn();

  /** Supabase answers one entry per path, in order. */
  function storageAnswering(entries: unknown[]) {
    fetchFn.mockImplementation(
      async () =>
        new Response(JSON.stringify(entries), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchFn);
    return createSupabaseStorage(config);
  }
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchFn.mockReset();
  });

  it("returns the URLs in the order of the paths", async () => {
    const storage = storageAnswering([
      { error: null, path: "a", signedURL: "/object/sign/outputs/a?token=1" },
      { error: null, path: "b", signedURL: "/object/sign/outputs/b?token=2" },
    ]);
    const urls = await storage.createSignedUrls("outputs", ["a", "b"], 60);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("/outputs/a?token=1");
    expect(urls[1]).toContain("/outputs/b?token=2");
  });

  it("maps an item error to StorageError", async () => {
    const storage = storageAnswering([
      { error: null, path: "a", signedURL: "/object/sign/outputs/a?token=1" },
      { error: "Object not found", path: "b", signedURL: null },
    ]);
    await expect(
      storage.createSignedUrls("outputs", ["a", "b"], 60),
    ).rejects.toBeInstanceOf(StorageError);
  });

  it("does not call Supabase for no paths", async () => {
    const storage = storageAnswering([]);
    expect(await storage.createSignedUrls("outputs", [], 60)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
