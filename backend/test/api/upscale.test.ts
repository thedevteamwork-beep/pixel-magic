import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";

/** The first bytes of a PNG of this size: enough for its header. */
function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

describe("upscaling", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 500);
  });

  /** Uploads `bytes` and returns the upload id. */
  async function upload(bytes: Buffer): Promise<string> {
    const res = await request(createApp(h.deps))
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({
        filename: "photo.png",
        mimeType: "image/png",
        sizeBytes: bytes.length,
      });
    h.storage.putBytes("inputs", res.body.path, bytes, "image/png");
    return res.body.uploadId as string;
  }

  async function upscale(input: Record<string, unknown>, key = "k1") {
    return request(createApp(h.deps))
      .post("/v1/jobs/topaz/upscale")
      .set(await authHeader(userId))
      .set("Idempotency-Key", key)
      .send({ input });
  }

  const reserved = async (jobId: string) =>
    (
      await testDb(T.creditAllocations).where({
        job_id: jobId,
        status: "reserved",
      })
    ).reduce((sum, row) => sum + row.amount, 0);

  describe("POST /v1/credits/estimate (topaz upscale)", () => {
    // An estimate counts upload ids; it never looks them up.
    const image = ["00000000-0000-4000-8000-000000000001"];
    const estimate = (body: object) =>
      request(createApp(h.deps))
        .post("/v1/credits/estimate")
        .send({ plugin: "topaz", operation: "upscale", ...body });

    it("needs the image's size", async () => {
      const res = await estimate({ input: { image, upscale_factor: 2 } });
      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/imageSize/);
    });

    it("prices by the result's megapixels", async () => {
      const small = await estimate({
        input: { image, upscale_factor: 2 },
        imageSize: { width: 1024, height: 1024 },
      });
      const large = await estimate({
        input: { image, upscale_factor: 4 },
        imageSize: { width: 3000, height: 2000 },
      });
      expect([small.body.creditsPerJob, large.body.creditsPerJob]).toEqual([
        5, 20,
      ]);
      expect(large.body.tier).toBe("96MP");
    });

    it("rejects an impossible size", async () => {
      const res = await estimate({
        input: {},
        imageSize: { width: 0, height: 10 },
      });
      expect(res.status).toBe(422);
    });
  });

  describe("POST /v1/jobs/topaz/upscale", () => {
    it("reserves what the estimate showed, priced on the image's real size", async () => {
      const image = await upload(pngHeader(3000, 2000));
      const res = await upscale({ image: [image], upscale_factor: 4 });
      expect(res.status).toBe(202);
      expect(res.body.creditCost).toBe(20);
      expect(await reserved(res.body.jobId)).toBe(20);
      expect(
        h.storage.calls.some((call) => call.method === "readObjectStart"),
      ).toBe(true);
    });

    it("rejects an upload whose size can't be read, reserving nothing", async () => {
      const image = await upload(Buffer.from("not an image at all"));
      const res = await upscale({ image: [image] });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("UPLOAD_NOT_READY");
      expect(res.body.meta).toMatchObject({ reason: "unreadable" });
      expect(await testDb(T.creditAllocations)).toHaveLength(0);
    });

    it("rejects an image larger than it can work with", async () => {
      const image = await upload(pngHeader(20_000, 1000));
      const res = await upscale({ image: [image] });
      expect(res.status).toBe(422);
      expect(res.body.meta).toMatchObject({ reason: "too_large" });
    });

    it("needs an image", async () => {
      const res = await upscale({ upscale_factor: 2 });
      expect(res.status).toBe(422);
    });
  });

  it("GET /v1/jobs?kind=upscale lists upscales and keeps them out of image history", async () => {
    const image = await upload(pngHeader(1000, 1000));
    const created = await upscale({ image: [image] });
    const list = async (kind: string) =>
      (
        await request(createApp(h.deps))
          .get(`/v1/jobs?kind=${kind}`)
          .set(await authHeader(userId))
      ).body.jobs.map((job: { jobId: string }) => job.jobId);
    expect(await list("upscale")).toEqual([created.body.jobId]);
    expect(await list("image")).toEqual([]);
  });
});
