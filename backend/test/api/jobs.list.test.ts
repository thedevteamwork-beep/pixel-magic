import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { insertProfile } from "../helpers/factories.js";

const BASE = new Date("2026-03-10T12:00:00Z").getTime();

describe("GET /v1/jobs", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await insertProfile(testDb);
  });

  /** Inserts a job `minutes` after BASE; completed jobs get one output. */
  async function addJob(
    owner: string,
    minutes: number,
    status: "queued" | "completed" = "queued",
    projectId: string | null = null,
  ): Promise<string> {
    const id = randomUUID();
    await testDb(T.jobs).insert({
      id,
      user_id: owner,
      project_id: projectId,
      model_key: "fluxSchnell_generate",
      input: {},
      credit_cost: 1,
      status,
      idempotency_key: randomUUID(),
      request_hash: "x",
      created_at: new Date(BASE + minutes * 60_000),
      outputs:
        status === "completed"
          ? JSON.stringify([
              {
                bucket: "outputs",
                path: `${owner}/${id}/0.jpg`,
                mimeType: "image/jpeg",
              },
            ])
          : null,
    });
    return id;
  }

  async function list(query = "", uid = userId) {
    return request(createApp(h.deps))
      .get(`/v1/jobs${query}`)
      .set(await authHeader(uid));
  }

  const ids = (res: request.Response) =>
    res.body.jobs.map((j: { jobId: string }) => j.jobId);
  const cursorOf = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  it("lists the caller's jobs newest first", async () => {
    const a = await addJob(userId, 1);
    const b = await addJob(userId, 3);
    const c = await addJob(userId, 2);
    const res = await list();
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([b, c, a]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("pages with limit and nextCursor without overlap", async () => {
    const a = await addJob(userId, 1);
    const b = await addJob(userId, 2);
    const c = await addJob(userId, 3);
    const first = await list("?limit=2");
    expect(ids(first)).toEqual([c, b]);
    expect(typeof first.body.nextCursor).toBe("string");
    const second = await list(`?limit=2&cursor=${first.body.nextCursor}`);
    expect(ids(second)).toEqual([a]);
    expect(second.body.nextCursor).toBeNull();
  });

  it("orders jobs created at the same instant by id", async () => {
    const same = new Date(BASE);
    const rows = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of rows) {
      await testDb(T.jobs).insert({
        id,
        user_id: userId,
        model_key: "fluxSchnell_generate",
        input: {},
        credit_cost: 1,
        status: "queued",
        idempotency_key: randomUUID(),
        request_hash: "x",
        created_at: same,
      });
    }
    const first = await list("?limit=2");
    const second = await list(`?limit=2&cursor=${first.body.nextCursor}`);
    expect([...ids(first), ...ids(second)]).toEqual([...rows].sort().reverse());
  });

  it("hides other users' jobs", async () => {
    const other = await insertProfile(testDb);
    await addJob(other, 5);
    const mine = await addJob(userId, 1);
    expect(ids(await list())).toEqual([mine]);
    expect(ids(await list("", other))).toHaveLength(1);
  });

  it("signs completed outputs in one batch call", async () => {
    await addJob(userId, 1, "completed");
    await addJob(userId, 2, "completed");
    await addJob(userId, 3, "queued");
    const res = await list();
    const batches = h.storage.calls.filter(
      (c) => c.method === "createSignedUrls",
    );
    expect(batches).toHaveLength(1);
    expect(batches[0].args[0]).toBe("outputs");
    const completed = res.body.jobs.filter(
      (j: { status: string }) => j.status === "completed",
    );
    expect(completed).toHaveLength(2);
    for (const job of completed) {
      expect(job.outputs).toHaveLength(1);
      expect(job.outputs[0].url).toContain("mode=read");
    }
  });

  it.each([
    ["a non-base64 cursor", "?cursor=abc"],
    [
      "a cursor with a bad date and id",
      `?cursor=${cursorOf({ t: "x", id: "1" })}`,
    ],
    [
      "a cursor with a bad id",
      `?cursor=${cursorOf({ t: "2026-03-10T12:00:00.000Z", id: "1" })}`,
    ],
    ["a cursor that is not an object", `?cursor=${cursorOf("hi")}`],
    ["limit 0", "?limit=0"],
    ["limit 51", "?limit=51"],
  ])("rejects %s with 422", async (_name, query) => {
    const res = await list(query);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  describe("?projectId=", () => {
    async function addProject(owner = userId): Promise<string> {
      const [row] = await testDb(T.projects)
        .insert({
          user_id: owner,
          type: "ai-influencer",
          title: "Mira",
          data: JSON.stringify({ traits: {} }),
        })
        .returning("*");
      return row.id;
    }

    it("lists only that project's jobs, newest first, with paging", async () => {
      const projectId = await addProject();
      const a = await addJob(userId, 1, "queued", projectId);
      await addJob(userId, 2);
      const c = await addJob(userId, 3, "queued", projectId);
      const d = await addJob(userId, 4, "queued", projectId);
      const first = await list(`?projectId=${projectId}&limit=2`);
      expect(ids(first)).toEqual([d, c]);
      expect(first.body.jobs[0].projectId).toBe(projectId);
      const second = await list(
        `?projectId=${projectId}&limit=2&cursor=${first.body.nextCursor}`,
      );
      expect(ids(second)).toEqual([a]);
      expect(second.body.nextCursor).toBeNull();
    });

    it("returns an empty list for another user's project", async () => {
      const other = await insertProfile(testDb);
      const projectId = await addProject(other);
      await addJob(other, 1, "queued", projectId);
      await addJob(userId, 2);
      const res = await list(`?projectId=${projectId}`);
      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual([]);
    });

    it("rejects a projectId that is not a uuid with 422", async () => {
      const res = await list("?projectId=bad");
      expect(res.status).toBe(422);
    });
  });

  it("needs a login", async () => {
    const res = await request(createApp(h.deps)).get("/v1/jobs");
    expect(res.status).toBe(401);
  });
});
