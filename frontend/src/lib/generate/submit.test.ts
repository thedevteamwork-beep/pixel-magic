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
  let uploadCount = 0;
  const api = {
    post: (async (path: string, body: unknown, opts?: { idempotencyKey?: string }) => {
      calls.push({ path, body, idempotencyKey: opts?.idempotencyKey });
      if (path !== "/v1/uploads") return jobView("queued");
      uploadCount += 1;
      return { ...upload, uploadId: `up-${uploadCount}` };
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
      path: "/v1/jobs/kling21/generate",
      idempotencyKey: "key-1",
      body: {
        input: { prompt: "a cat", duration: "10", aspect_ratio: "16:9", image: ["up-1"] },
      },
    });
  });

  it("sends no image without a file", async () => {
    const t = setup();
    await submitGeneration(t.base);
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0].body).toEqual({
      input: { prompt: "a cat", duration: "10", aspect_ratio: "16:9" },
    });
  });

  it("leaves the prompt out for a model with no prompt field", async () => {
    const t = setup();
    const input = Object.fromEntries(Object.entries(kling21.input).filter(([name]) => name !== "prompt"));
    await submitGeneration({ ...t.base, model: { ...kling21, input } });
    expect(t.calls[0].body).toEqual({ input: { duration: "10", aspect_ratio: "16:9" } });
  });

  it("a retry with the same key sends the same body", async () => {
    const t = setup();
    await submitGeneration(t.base);
    await submitGeneration(t.base);
    expect(t.calls[1]).toEqual(t.calls[0]);
  });

  it("a retry with an image reuses the kept upload and sends the same body", async () => {
    const t = setup();
    const file = new File(["x"], "cat.png", { type: "image/png" });
    let kept: string | undefined;
    const attempt = () => submitGeneration({ ...t.base, file, uploadId: kept, onUploaded: (id) => (kept = id) });
    await attempt();
    await attempt();
    expect(t.uploaded).toEqual(["cat.png"]);
    const jobCalls = t.calls.filter((c) => c.path === "/v1/jobs/kling21/generate");
    expect(jobCalls).toHaveLength(2);
    expect(jobCalls[1]).toEqual(jobCalls[0]);
    expect(jobCalls[1].body).toMatchObject({ input: { image: ["up-1"] } });
  });
});
