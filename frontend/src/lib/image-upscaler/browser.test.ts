import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadUpscaleFile } from "./browser";

const origin = "https://pixel.example";
const sourceUrl = `blob:${origin}/local-source`;
const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], "image.png", {
  type: "image/png",
});

function bitmap() {
  return { width: 120, height: 80, close: vi.fn() } as unknown as ImageBitmap;
}
let decoded: ImageBitmap;
let createBitmap: ReturnType<typeof vi.fn<typeof createImageBitmap>>;
let revoke: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  decoded = bitmap();
  createBitmap = vi.fn<typeof createImageBitmap>().mockResolvedValue(decoded);
  vi.stubGlobal("createImageBitmap", createBitmap);
  vi.stubGlobal("window", { location: { origin } });
  vi.spyOn(URL, "createObjectURL").mockReturnValue(sourceUrl);
  revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("loading an image to upscale", () => {
  it("returns a caller-owned preview URL and closes the decoded bitmap", async () => {
    await expect(loadUpscaleFile(file)).resolves.toEqual({ file, url: sourceUrl, width: 120, height: 80 });
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
  });

  it("rejects a disguised non-image before decoding or creating a preview URL", async () => {
    const disguised = new File(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], "image.png", { type: "image/png" });
    await expect(loadUpscaleFile(disguised)).rejects.toThrow("doesn’t match");
    expect(createBitmap).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("closes a late bitmap after cancellation without leaking an object URL", async () => {
    let complete!: (value: ImageBitmap) => void;
    createBitmap.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const controller = new AbortController();
    const loading = loadUpscaleFile(file, controller.signal);
    await vi.waitFor(() => expect(createBitmap).toHaveBeenCalled());
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    complete(decoded);
    await Promise.resolve();
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
