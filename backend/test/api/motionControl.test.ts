import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";

/** An MP4's movie header for a clip this long. */
function mp4(seconds: number): Buffer {
  const body = Buffer.alloc(100);
  body.writeUInt32BE(1000, 12);
  body.writeUInt32BE(Math.round(seconds * 1000), 16);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(108, 0);
  head.write("mvhd", 4, "ascii");
  return Buffer.concat([Buffer.from("....ftypisom"), head, body]);
}

describe("motion control and other uploads", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 2000);
  });
  const app = () => createApp(h.deps);

  async function upload(
    name: string,
    mimeType: string,
    bytes: Buffer,
  ): Promise<string> {
    const res = await request(app())
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: name, mimeType, sizeBytes: bytes.length });
    expect(res.status).toBe(201);
    h.storage.putBytes("inputs", res.body.path, bytes, mimeType);
    return res.body.uploadId as string;
  }
  const character = () => upload("me.png", "image/png", Buffer.alloc(100));

  async function motion(input: Record<string, unknown>, key = "mc-1") {
    return request(app())
      .post("/v1/jobs/kling3MC/generate")
      .set(await authHeader(userId))
      .set("Idempotency-Key", key)
      .send({ input });
  }

  it("takes a video upload, with its own size limit", async () => {
    const ok = await request(app())
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({
        filename: "a.mp4",
        mimeType: "video/mp4",
        sizeBytes: 50 * 1024 * 1024,
      });
    expect(ok.status).toBe(201);
    const big = await request(app())
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({
        filename: "a.mp4",
        mimeType: "video/mp4",
        sizeBytes: 200 * 1024 * 1024,
      });
    expect(big.status).toBe(422);
  });

  it("prices a job by the clip's real length, read from the file", async () => {
    const res = await motion({
      image: [await character()],
      video: [await upload("dance.mp4", "video/mp4", mp4(8.4))],
    });
    expect(res.status).toBe(202);
    expect(res.body.creditCost).toBe(99);
    const reserved = await testDb(T.creditAllocations).where({
      job_id: res.body.jobId,
      status: "reserved",
    });
    expect(reserved.reduce((sum, row) => sum + row.amount, 0)).toBe(99);
  });

  it("reads a clip whose header sits at its end", async () => {
    const clip = Buffer.concat([Buffer.alloc(2 * 1024 * 1024), mp4(5)]);
    const res = await motion({
      image: [await character()],
      video: [await upload("end.mp4", "video/mp4", clip)],
    });
    expect(res.body.creditCost).toBe(55);
  });

  it("refuses a clip it can't read, or one over 30 seconds, reserving nothing", async () => {
    const unreadable = await motion({
      image: [await character()],
      video: [await upload("x.mp4", "video/mp4", Buffer.from("not a movie"))],
    });
    expect(unreadable.status).toBe(422);
    expect(unreadable.body.meta).toMatchObject({ reason: "unreadable" });
    const long = await motion(
      {
        image: [await character()],
        video: [await upload("long.mp4", "video/mp4", mp4(45))],
      },
      "mc-2",
    );
    expect(long.body.meta).toMatchObject({ reason: "too_long" });
    expect(await testDb(T.creditAllocations)).toHaveLength(0);
  });

  it("takes only its own kind of file in each field", async () => {
    const res = await motion({
      image: [await character()],
      video: [await character()],
    });
    expect(res.status).toBe(422);
    expect(res.body.meta).toMatchObject({ reason: "mime_type" });
  });

  it("estimates by the clip length the client states", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const estimate = (body: object) =>
      request(app())
        .post("/v1/credits/estimate")
        .send({ plugin: "kling3MC", operation: "generate", ...body });
    expect(
      (await estimate({ input: { image: [id], video: [id] } })).status,
    ).toBe(422);
    const res = await estimate({
      input: { image: [id], video: [id] },
      videoSeconds: 12,
    });
    expect(res.body.creditsPerJob).toBe(132);
  });

  it("sends each field its own signed files: start and end frames", async () => {
    const start = await character();
    const end = await upload("end.png", "image/png", Buffer.alloc(100));
    const res = await request(app())
      .post("/v1/jobs/kling25/generate")
      .set(await authHeader(userId))
      .set("Idempotency-Key", "frames-1")
      .send({
        input: {
          prompt: "a wave",
          image: [start],
          end_image: [end],
          duration: "5",
        },
      });
    expect(res.status).toBe(202);
    const job = await testDb(T.jobs).where({ id: res.body.jobId }).first();
    expect(job.upload_ids).toEqual([start, end]);
  });
});
