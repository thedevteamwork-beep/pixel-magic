import { describe, expect, it } from "vitest";
import { jobView, kling21 } from "@/lib/generate/fixtures";
import { submitGeneration } from "@/lib/generate/submit";
import type { UploadResponse } from "@/lib/api/types";

const upload: UploadResponse = {
  uploadId: "up-1",
  bucket: "inputs",
  path: "u/up-1.png",
  signedUrl: "https://example.test/s",
  token: "tok",
  expiresAt: "2026-11-07T11:00:00.000Z",
};

type Call = { path: string; body: unknown; idempotencyKey?: string };

function setup() {
  const calls: Call[] = [];
  const uploaded: string[] = [];
  const api = {
    post: (async (path: string, body: unknown, opts?: { idempotencyKey?: string }) => {
      calls.push({ path, body, idempotencyKey: opts?.idempotencyKey });
      return path === "/v1/uploads" ? upload : jobView("queued");
    }) as <T>(path: string, body: unknown, opts?: { idempotencyKey?: string }) => Promise<T>,
  };
  const uploadFile = async (_upload: UploadResponse, file: File) => {
    uploaded.push(file.name);
  };
  const base = {
    api,
    uploadFile,
    model: kling21,
    prompt: "a cat",
    values: { duration: "10", durations: "bad" } as Record<string, unknown>,
    idempotencyKey: "key-1",
  };
  return { base, calls, uploaded };
}

describe("submitGeneration", () => {
  it("uploads then creates the job with the same key", async () => {
    const t = setup();
    const file = new File(["x"], "cat.png", { type: "image/png" });
    const job = await submitGeneration({ ...t.base, file });
    expect(job.status).toBe("queued");
    expect(t.uploaded).toEqual(["cat.png"]);
    expect(t.calls[0]).toMatchObject({
      path: "/v1/uploads",
      body: { filename: "cat.png", mimeType: "image/png", sizeBytes: 1 },
    });
    expect(t.calls[1]).toEqual({
      path: "/v1/jobs",
      idempotencyKey: "key-1",
      body: {
        model: "kling21",
        prompt: "a cat",
        uploadIds: ["up-1"],
        options: { duration: "10", aspect_ratio: "16:9" },
      },
    });
  });

  it("sends no uploadIds without a file", async () => {
    const t = setup();
    await submitGeneration(t.base);
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0].body).not.toHaveProperty("uploadIds");
  });

  it("a retry with the same key sends the same body", async () => {
    const t = setup();
    await submitGeneration(t.base);
    await submitGeneration(t.base);
    expect(t.calls[1]).toEqual(t.calls[0]);
  });
});
