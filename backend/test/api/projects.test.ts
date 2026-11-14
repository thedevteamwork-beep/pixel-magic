import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { insertJob, insertProfile } from "../helpers/factories.js";

describe("projects API", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await insertProfile(testDb);
  });

  const app = () => createApp(h.deps);

  async function create(
    body: Record<string, unknown>,
    uid = userId,
  ): Promise<request.Response> {
    return request(app())
      .post("/v1/projects")
      .set(await authHeader(uid))
      .send(body);
  }

  /** Creates a project and returns its id; advances the clock first so order is by creation. */
  async function addProject(title: string, uid = userId): Promise<string> {
    h.clock.advance(60_000);
    const res = await create({ type: "ai-influencer", title }, uid);
    return res.body.projectId;
  }

  async function list(query = "", uid = userId) {
    return request(app())
      .get(`/v1/projects${query}`)
      .set(await authHeader(uid));
  }

  const ids = (res: request.Response) =>
    res.body.projects.map((p: { projectId: string }) => p.projectId);

  const count = async () =>
    Number((await testDb(T.projects).count({ n: "*" }).first())!.n);

  describe("POST /v1/projects", () => {
    it("creates a project", async () => {
      const res = await create({
        type: "ai-influencer",
        title: "  Mira ",
        data: { traits: { gender: "woman" } },
      });
      expect(res.status).toBe(201);
      expect(res.body.projectId).toEqual(expect.any(String));
      expect(res.body.type).toBe("ai-influencer");
      expect(res.body.title).toBe("Mira");
      expect(res.body.data).toEqual({ traits: { gender: "woman" } });
      expect(res.body.cover).toBeNull();
      expect(res.body.createdAt).toBe(h.clock.now().toISOString());
      expect(res.body.updatedAt).toBe(h.clock.now().toISOString());
    });

    it.each([
      ["an unknown type", { type: "marketing-studio", title: "A" }],
      ["an empty title", { type: "ai-influencer", title: "" }],
      [
        "a 121-character title",
        { type: "ai-influencer", title: "a".repeat(121) },
      ],
      [
        "an unknown trait",
        { type: "ai-influencer", title: "A", data: { traits: { wings: "x" } } },
      ],
      ["an extra field", { type: "ai-influencer", title: "A", userId: "x" }],
    ])("rejects %s with 422 and writes nothing", async (_name, body) => {
      const res = await create(body);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(await count()).toBe(0);
    });
  });

  describe("GET /v1/projects", () => {
    it("lists the most recently updated first", async () => {
      const a = await addProject("A");
      const b = await addProject("B");
      const c = await addProject("C");
      h.clock.advance(60_000);
      await request(app())
        .patch(`/v1/projects/${a}`)
        .set(await authHeader(userId))
        .send({ title: "A2" });
      const res = await list();
      expect(res.status).toBe(200);
      expect(ids(res)).toEqual([a, c, b]);
      expect(res.body.nextCursor).toBeNull();
    });

    it("filters by type", async () => {
      await addProject("A");
      expect(ids(await list("?type=ai-influencer"))).toHaveLength(1);
      expect(ids(await list("?type=other"))).toHaveLength(0);
    });

    it("pages with limit=1 through every project once", async () => {
      const a = await addProject("A");
      const b = await addProject("B");
      const c = await addProject("C");
      const seen: string[] = [];
      let query = "?limit=1";
      for (let i = 0; i < 3; i++) {
        const res = await list(query);
        seen.push(...ids(res));
        if (i < 2) {
          expect(typeof res.body.nextCursor).toBe("string");
          query = `?limit=1&cursor=${res.body.nextCursor}`;
        } else {
          expect(res.body.nextCursor).toBeNull();
        }
      }
      expect(seen).toEqual([c, b, a]);
    });

    it("rejects a bad cursor with 422", async () => {
      const res = await list("?cursor=abc");
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    it("hides other users' projects", async () => {
      const other = await insertProfile(testDb);
      await addProject("Theirs", other);
      const mine = await addProject("Mine");
      expect(ids(await list())).toEqual([mine]);
    });
  });

  describe("GET /v1/projects/:id", () => {
    it("returns the view", async () => {
      const id = await addProject("Mira");
      const res = await request(app())
        .get(`/v1/projects/${id}`)
        .set(await authHeader(userId));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        projectId: id,
        title: "Mira",
        data: { traits: {} },
        cover: null,
      });
    });

    it("returns 404 for a non-uuid, unknown or foreign id", async () => {
      const other = await insertProfile(testDb);
      const theirs = await addProject("Theirs", other);
      for (const id of ["nope", randomUUID(), theirs]) {
        const res = await request(app())
          .get(`/v1/projects/${id}`)
          .set(await authHeader(userId));
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("PATCH /v1/projects/:id", () => {
    async function patch(id: string, body: unknown, uid = userId) {
      return request(app())
        .patch(`/v1/projects/${id}`)
        .set(await authHeader(uid))
        .send(body as object);
    }

    it("changes the title and keeps data", async () => {
      h.clock.advance(60_000);
      const created = await create({
        type: "ai-influencer",
        title: "Mira",
        data: { traits: { gender: "woman" } },
      });
      h.clock.advance(60_000);
      const res = await patch(created.body.projectId, { title: "Nova" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Nova");
      expect(res.body.data).toEqual({ traits: { gender: "woman" } });
      expect(res.body.updatedAt).toBe(h.clock.now().toISOString());
      expect(res.body.createdAt).toBe(created.body.createdAt);
    });

    it("replaces data as a whole", async () => {
      const created = await create({
        type: "ai-influencer",
        title: "Mira",
        data: { traits: { gender: "woman" } },
      });
      const res = await patch(created.body.projectId, {
        data: { extra: "gold hoops" },
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ traits: {}, extra: "gold hoops" });
    });

    it("rejects data that fails the type's schema", async () => {
      const id = await addProject("Mira");
      const res = await patch(id, { data: { traits: { wings: "x" } } });
      expect(res.status).toBe(422);
    });

    it.each([
      ["an empty body", {}],
      ["a type change", { type: "x" }],
    ])("rejects %s with 422", async (_name, body) => {
      const id = await addProject("Mira");
      const res = await patch(id, body);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    it("returns 404 for another user's or an unknown project", async () => {
      const other = await insertProfile(testDb);
      const theirs = await addProject("Theirs", other);
      expect((await patch(theirs, { title: "Mine" })).status).toBe(404);
      expect((await patch(randomUUID(), { title: "x" })).status).toBe(404);
      expect((await patch("nope", { title: "x" })).status).toBe(404);
      const row = await testDb(T.projects).where("id", theirs).first();
      expect(row.title).toBe("Theirs");
    });
  });

  describe("DELETE /v1/projects/:id", () => {
    async function del(id: string, uid = userId) {
      return request(app())
        .delete(`/v1/projects/${id}`)
        .set(await authHeader(uid));
    }

    it("removes the project and keeps its jobs and credit records", async () => {
      const projectId = await addProject("Mira");
      const jobId = randomUUID();
      await testDb(T.jobs).insert({
        id: jobId,
        user_id: userId,
        project_id: projectId,
        model_key: "fluxSchnell_generate",
        input: {},
        credit_cost: 1,
        status: "completed",
        idempotency_key: randomUUID(),
        request_hash: "x",
        outputs: JSON.stringify([
          {
            bucket: "outputs",
            path: `${userId}/${jobId}/0.jpg`,
            mimeType: "image/jpeg",
          },
        ]),
      });
      await testDb(T.creditLedger).insert({
        user_id: userId,
        job_id: jobId,
        type: "capture",
        amount: 1,
      });
      const ledgerBefore = await testDb(T.creditLedger).where("job_id", jobId);

      const res = await del(projectId);
      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(await testDb(T.projects).where("id", projectId).first()).toBe(
        undefined,
      );
      const job = await testDb(T.jobs).where("id", jobId).first();
      expect(job.project_id).toBeNull();
      const jobs = await request(app())
        .get("/v1/jobs")
        .set(await authHeader(userId));
      expect(jobs.body.jobs.map((j: { jobId: string }) => j.jobId)).toEqual([
        jobId,
      ]);
      expect(await testDb(T.creditLedger).where("job_id", jobId)).toEqual(
        ledgerBefore,
      );
    });

    it("leaves the owner's jobs linked when another user tries to delete", async () => {
      const projectId = await addProject("Mira");
      const job = await insertJob(testDb, userId);
      await testDb(T.jobs)
        .where("id", job.id)
        .update({ project_id: projectId });
      const other = await insertProfile(testDb);

      expect((await del(projectId, other)).status).toBe(404);
      const row = await testDb(T.jobs).where("id", job.id).first();
      expect(row.project_id).toBe(projectId);
    });

    it("returns 404 for another user's project, and for a second delete", async () => {
      const other = await insertProfile(testDb);
      const theirs = await addProject("Theirs", other);
      expect((await del(theirs)).status).toBe(404);
      expect(await count()).toBe(1);

      const mine = await addProject("Mine");
      expect((await del(mine)).status).toBe(204);
      expect((await del(mine)).status).toBe(404);
      expect((await del("nope")).status).toBe(404);
    });
  });

  describe("covers", () => {
    async function addCompletedJob(
      projectId: string,
      completedAt: Date,
      status: "queued" | "completed" = "completed",
    ): Promise<string> {
      const id = randomUUID();
      await testDb(T.jobs).insert({
        id,
        user_id: userId,
        project_id: projectId,
        model_key: "fluxSchnell_generate",
        input: {},
        credit_cost: 1,
        status,
        idempotency_key: randomUUID(),
        request_hash: "x",
        completed_at: status === "completed" ? completedAt : null,
        outputs:
          status === "completed"
            ? JSON.stringify([
                {
                  bucket: "outputs",
                  path: `${userId}/${id}/0.jpg`,
                  mimeType: "image/jpeg",
                },
              ])
            : null,
      });
      return id;
    }

    it("uses the first output of the newest completed job", async () => {
      const projectId = await addProject("Mira");
      const newer = await addCompletedJob(projectId, new Date(2_000_000));
      await addCompletedJob(projectId, new Date(1_000_000));
      const res = await request(app())
        .get(`/v1/projects/${projectId}`)
        .set(await authHeader(userId));
      expect(res.body.cover.url).toContain(`${userId}/${newer}/0.jpg`);
      expect(res.body.cover.url).toContain("mode=read");
      expect(res.body.cover.mimeType).toBe("image/jpeg");
      expect(typeof res.body.cover.expiresAt).toBe("string");
    });

    it("is null when no job has completed", async () => {
      const projectId = await addProject("Mira");
      await addCompletedJob(projectId, new Date(), "queued");
      const res = await request(app())
        .get(`/v1/projects/${projectId}`)
        .set(await authHeader(userId));
      expect(res.body.cover).toBeNull();
    });

    it("signs a whole list with one call per bucket", async () => {
      for (const title of ["A", "B", "C"]) {
        await addCompletedJob(await addProject(title), new Date(1_000_000));
      }
      h.storage.calls.length = 0;
      const res = await list();
      expect(res.body.projects).toHaveLength(3);
      for (const p of res.body.projects) expect(p.cover).not.toBeNull();
      const signCalls = h.storage.calls.filter(
        (c) => c.method === "createSignedUrls",
      );
      expect(signCalls).toHaveLength(1);
    });
  });
});
