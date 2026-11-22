import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";

describe("video projects", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 2000);
  });

  const app = () => createApp(h.deps);

  async function uploadImage(): Promise<string> {
    const up = await request(app())
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: "start.png", mimeType: "image/png", sizeBytes: 100 });
    h.storage.put("inputs", up.body.path, {
      sizeBytes: 100,
      mimeType: "image/png",
    });
    return up.body.uploadId as string;
  }

  async function createProject(data: Record<string, unknown>) {
    return request(app())
      .post("/v1/projects")
      .set(await authHeader(userId))
      .send({ type: "video", title: "Paper boat", data });
  }

  async function createJob(
    route: string,
    input: Record<string, unknown>,
    projectId: string,
    key: string,
  ) {
    return request(app())
      .post(`/v1/jobs/${route}`)
      .set(await authHeader(userId))
      .set("Idempotency-Key", key)
      .send({ input, projectId });
  }

  it("saves the direction and settings, with the start image signed", async () => {
    const startImageUploadId = await uploadImage();
    const res = await createProject({
      prompt: "A paper boat on a rainy street",
      mode: "image",
      model: "seedance25_generate",
      duration: 5,
      aspectRatio: "16:9",
      resolution: "720p",
      audio: false,
      count: 2,
      startImageUploadId,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("video");
    expect(res.body.data).toMatchObject({
      prompt: "A paper boat on a rainy street",
      count: 2,
      startImageUploadId,
    });
    expect(res.body.upload.uploadId).toBe(startImageUploadId);
  });

  it("rejects settings outside the schema", async () => {
    expect((await createProject({ model: "x", count: 9 })).status).toBe(422);
    expect((await createProject({ model: "x", extra: true })).status).toBe(422);
  });

  it("holds every take of the idea: video jobs join it, image jobs can't", async () => {
    const startImageUploadId = await uploadImage();
    const project = await createProject({
      prompt: "Waves",
      mode: "image",
      model: "kling25_generate",
      startImageUploadId,
    });
    const projectId = project.body.projectId as string;
    const input = {
      prompt: "Waves",
      image: [startImageUploadId],
      duration: "5",
    };

    const first = await createJob(
      "kling25/generate",
      input,
      projectId,
      "take-1",
    );
    const second = await createJob(
      "kling25/generate",
      input,
      projectId,
      "take-2",
    );
    expect([first.status, second.status]).toEqual([202, 202]);
    expect(first.body.projectId).toBe(projectId);

    const image = await createJob(
      "fluxSchnell/generate",
      { prompt: "Waves" },
      projectId,
      "image-1",
    );
    expect(image.status).toBe(422);

    const takes = await request(app())
      .get(`/v1/jobs?projectId=${projectId}`)
      .set(await authHeader(userId));
    expect(
      takes.body.jobs.map((job: { jobId: string }) => job.jobId).sort(),
    ).toEqual([first.body.jobId, second.body.jobId].sort());
    expect(await testDb(T.jobs).where({ project_id: projectId })).toHaveLength(
      2,
    );
  });

  it("lists only video projects for type=video", async () => {
    await createProject({ prompt: "Waves", model: "kling25_generate" });
    await request(app())
      .post("/v1/projects")
      .set(await authHeader(userId))
      .send({ type: "ai-influencer", title: "Mira" });
    const res = await request(app())
      .get("/v1/projects?type=video")
      .set(await authHeader(userId));
    expect(res.body.projects.map((p: { type: string }) => p.type)).toEqual([
      "video",
    ]);
  });
});
