import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadUpscaleFile, resizeUpscaleImage } from "./browser";
import { calculateUpscaleOutput } from "./limits";

const origin = "https://pixel.example";
const sourceUrl = `blob:${origin}/local-source`;
const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], "image.png", { type: "image/png" });

function bitmap() { return { width: 120, height: 80, close: vi.fn() } as unknown as ImageBitmap; }
let decoded: ImageBitmap;
let createBitmap: ReturnType<typeof vi.fn<typeof createImageBitmap>>;
let context: { imageSmoothingEnabled: boolean; imageSmoothingQuality: string; fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };
let canvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn>; toBlob: ReturnType<typeof vi.fn> };
let revoke: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  decoded = bitmap();
  createBitmap = vi.fn<typeof createImageBitmap>().mockResolvedValue(decoded);
  vi.stubGlobal("createImageBitmap", createBitmap);
  vi.stubGlobal("window", { location: { origin } });
  vi.spyOn(URL, "createObjectURL").mockReturnValue(sourceUrl);
  revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  context = { imageSmoothingEnabled: false, imageSmoothingQuality: "low", fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: vi.fn((callback: BlobCallback, type: string) => callback(new Blob(["encoded"], { type }))) };
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(file, { headers: { "Content-Type": file.type } })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("local upscale browser resources", () => {
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
    createBitmap.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
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

  it("fills JPEG transparency white before interpolating and releases canvas/bitmap resources", async () => {
    const output = calculateUpscaleOutput({ width: 120, height: 80 }, 2, "jpg");
    const result = await resizeUpscaleImage(sourceUrl, output, new AbortController().signal);
    expect(result.type).toBe("image/jpeg");
    expect(context.imageSmoothingEnabled).toBe(true);
    expect(context.imageSmoothingQuality).toBe("high");
    expect(context.fillStyle).toBe("white");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 240, 160);
    expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(context.drawImage.mock.invocationCallOrder[0]);
    expect(context.drawImage).toHaveBeenCalledWith(decoded, 0, 0, 240, 160);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
  });

  it("rejects unsupported browser encoding fallbacks and still releases resources", async () => {
    canvas.toBlob.mockImplementation((callback: BlobCallback) => callback(new Blob(["wrong codec"], { type: "image/png" })));
    await expect(resizeUpscaleImage(sourceUrl, calculateUpscaleOutput({ width: 120, height: 80 }, 2, "webp"), new AbortController().signal)).rejects.toThrow("couldn’t export WEBP");
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("releases resources immediately when canceled during asynchronous encoding", async () => {
    let finish!: BlobCallback;
    canvas.toBlob.mockImplementation((callback: BlobCallback) => { finish = callback; });
    const controller = new AbortController();
    const resizing = resizeUpscaleImage(sourceUrl, calculateUpscaleOutput({ width: 120, height: 80 }, 2, "png"), controller.signal);
    await vi.waitFor(() => expect(canvas.toBlob).toHaveBeenCalled());
    controller.abort();
    await expect(resizing).rejects.toMatchObject({ name: "AbortError" });
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    finish(new Blob(["late encoded output"], { type: "image/png" }));
    await Promise.resolve();
  });

  it("refuses remote source URLs before any fetch", async () => {
    await expect(resizeUpscaleImage("https://outside.example/image.png", calculateUpscaleOutput({ width: 120, height: 80 }, 2, "png"), new AbortController().signal)).rejects.toThrow("local image");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([1, 8] as const)("supports local%dx interpolation without adding enhancement filters", async (factor) => {
    const output = calculateUpscaleOutput({ width: 120, height: 80 }, factor);
    const result = await resizeUpscaleImage(sourceUrl, output, new AbortController().signal);
    expect(result.type).toBe("image/png");
    expect(context.drawImage).toHaveBeenCalledWith(decoded, 0, 0, 120 * factor, 80 * factor);
    expect(decoded.close).toHaveBeenCalledOnce();
  });
});
