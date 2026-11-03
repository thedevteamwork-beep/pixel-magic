import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { FalError } from "../../src/clients/fal.js";
import type { JobRow, JobStatus } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";
import { getModel } from "../../src/models/registry.js";
import { makeDeps } from "../helpers/app.js";
import { resetDb, testDb } from "../helpers/db.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { createFundedUser, insertJob } from "../helpers/factories.js";
import { signFalWebhook } from "../helpers/falWebhook.js";

const OK_BODY = { request_id: "req_1", status: "OK", payload: { images: [] } };

describe("fal webhook", () => {
  let ctx: ReturnType<typeof makeDeps>;
  let app: ReturnType<typeof createApp>;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    ctx = makeDeps();
    app = createApp(ctx.deps);
    userId = await createFundedUser(ctx.deps);
  });

  async function jobWith(
    status: JobStatus,
    falRequestId: string | null,
    modelKey = "flux-schnell",
  ): Promise<JobRow> {
    const job = await insertJob(testDb, userId);
    const [row] = await testDb(T.jobs)
      .where({ id: job.id })
      .update({
        status,
        model_key: modelKey,
        fal_request_id: falRequestId,
      })
      .returning("*");
    return row;
  }

  function post(
    signed: ReturnType<typeof signFalWebhook>,
    query = "",
  ): request.Test {
    return request(app)
      .post(`/webhooks/fal${query}`)
      .set(signed.headers)
      .set("content-type", "application/json")
      .send(signed.raw.toString("utf8"));
  }

  const events = () => testDb(T.providerEvents).select("*");
  const orphanLogged = () =>
    ctx.logs.some(
      (l) =>
        l.severity === "WARNING" &&
        l.orphanFalRequest === true &&
        l.requestId === "req_1",
    );

  it("rejects a bad signature with 401 and records nothing", async () => {
    await jobWith("submitted", "req_1");
    const res = await post(signFalWebhook(OK_BODY, { key: "other" }));
    expect(res.status).toBe(401);
    expect(await events()).toHaveLength(0);
    expect(ctx.queue.tasks).toHaveLength(0);
  });

  it("records the event and queues finalize", async () => {
    const job = await jobWith("submitted", "req_1");
    const res = await post(signFalWebhook(OK_BODY));
    expect(res.status).toBe(200);
    expect(await events()).toHaveLength(1);
    expect(ctx.queue.tasks).toMatchObject([
      { kind: "finalize", jobId: job.id, suffix: "0" },
    ]);
  });

  it("handles a duplicate webhook once", async () => {
    await jobWith("submitted", "req_1");
    const signed = signFalWebhook(OK_BODY);
    expect((await post(signed)).status).toBe(200);
    expect((await post(signed)).status).toBe(200);
    expect(await events()).toHaveLength(1);
    expect(ctx.queue.tasks).toHaveLength(1);
  });

  it("answers 503 when no job is linked yet", async () => {
    const res = await post(signFalWebhook(OK_BODY));
    expect(res.status).toBe(503);
    expect(await events()).toHaveLength(1);
    expect(ctx.queue.tasks).toHaveLength(0);
  });

  it("ignores webhooks for finished jobs", async () => {
    await jobWith("completed", "req_1");
    const res = await post(signFalWebhook(OK_BODY));
    expect(res.status).toBe(200);
    expect(ctx.queue.tasks).toHaveLength(0);
  });

  it("answers 200 and logs ERROR for a malformed body", async () => {
    const res = await post(signFalWebhook({ request_id: "req_1", status: 7 }));
    expect(res.status).toBe(200);
    expect(
      ctx.logs.some(
        (l) => l.severity === "ERROR" && JSON.stringify(l).includes("req_1"),
      ),
    ).toBe(true);
    expect(ctx.queue.tasks).toHaveLength(0);
  });

  it("answers 503 when queueing finalize fails", async () => {
    await jobWith("submitted", "req_1");
    ctx.queue.failNext();
    const res = await post(signFalWebhook(OK_BODY));
    expect(res.status).toBe(503);
  });

  it("links an unsaved request to its still-submitting job through ?jobId", async () => {
    const job = await jobWith("submitting", null);
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
    expect(res.status).toBe(200);
    const row = await testDb(T.jobs).where({ id: job.id }).first();
    expect(row.status).toBe("submitted");
    expect(row.fal_request_id).toBe("req_1");
    expect(ctx.fal.calls).toEqual([
      {
        method: "status",
        args: [
          getModel("flux-schnell")?.falEndpoint({ uploadCount: 0 }),
          "req_1",
        ],
      },
    ]);
    expect(ctx.queue.tasks).toMatchObject([
      { kind: "finalize", jobId: job.id, suffix: "0" },
    ]);
  });

  it("verifies a text-to-video job on the text-to-video endpoint", async () => {
    const job = await jobWith("submitting", null, "kling21");
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
    expect(res.status).toBe(200);
    expect(ctx.fal.calls).toEqual([
      {
        method: "status",
        args: ["fal-ai/kling-video/v2.1/master/text-to-video", "req_1"],
      },
    ]);
  });

  it("logs an orphan and answers 200 when the job already has another request", async () => {
    const job = await jobWith("submitted", "req_2");
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
    expect(res.status).toBe(200);
    expect(ctx.queue.tasks).toHaveLength(0);
    expect(orphanLogged()).toBe(true);
    expect(await events()).toHaveLength(1);
  });

  it("logs an orphan for an unknown ?jobId", async () => {
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${randomUUID()}`);
    expect(res.status).toBe(200);
    expect(ctx.queue.tasks).toHaveLength(0);
    expect(orphanLogged()).toBe(true);
  });

  it("does not link a request that fal rejects for our credentials", async () => {
    const job = await jobWith("submitting", null);
    ctx.fal.failNext("status", new FalError("not found", false, 404));
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
    expect(res.status).toBe(200);
    const row = await testDb(T.jobs).where({ id: job.id }).first();
    expect(row.status).toBe("submitting");
    expect(row.fal_request_id).toBeNull();
    expect(ctx.queue.tasks).toHaveLength(0);
    expect(orphanLogged()).toBe(true);
  });

  it("answers 503 without linking when fal status fails retryably", async () => {
    const job = await jobWith("submitting", null);
    ctx.fal.failNext("status", new FalError("busy", true, 503));
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
    expect(res.status).toBe(503);
    const row = await testDb(T.jobs).where({ id: job.id }).first();
    expect(row.fal_request_id).toBeNull();
  });

  it("answers 503 and records nothing when the signing keys can't be loaded", async () => {
    await jobWith("submitted", "req_1");
    const failing = makeDeps({
      falKeys: async () => {
        throw new Error("jwks down");
      },
    });
    const res = await request(createApp(failing.deps))
      .post("/webhooks/fal")
      .set(signFalWebhook(OK_BODY).headers)
      .set("content-type", "application/json")
      .send(signFalWebhook(OK_BODY).raw.toString("utf8"));
    expect(res.status).toBe(503);
    expect(await events()).toHaveLength(0);
    expect(failing.logs.some((l) => l.severity === "ERROR")).toBe(true);
  });

  it("carries on when the job was linked to the same request meanwhile", async () => {
    const job = await jobWith("submitted", "req_1");
    // Simulates the lookup-by-request-id miss: go straight through ?jobId.
    const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
    expect(res.status).toBe(200);
    expect(ctx.queue.tasks).toHaveLength(1);
    expect(orphanLogged()).toBe(false);
  });

  it("rejects a body whose request id differs from the signed header", async () => {
    await jobWith("submitted", "req_1");
    const res = await post(signFalWebhook(OK_BODY, { requestId: "req_other" }));
    expect(res.status).toBe(401);
    expect(await events()).toHaveLength(0);
    expect(ctx.logs.some((l) => l.severity === "ERROR")).toBe(true);
    expect(ctx.queue.tasks).toHaveLength(0);
  });

  it.each([401, 403])(
    "answers 503 and never links when fal status says %i",
    async (status) => {
      const job = await jobWith("submitting", null);
      ctx.fal.failNext("status", new FalError("bad key", false, status));
      const res = await post(signFalWebhook(OK_BODY), `?jobId=${job.id}`);
      expect(res.status).toBe(503);
      const row = await testDb(T.jobs).where({ id: job.id }).first();
      expect(row.fal_request_id).toBeNull();
      expect(ctx.queue.tasks).toHaveLength(0);
    },
  );

  it("queues finalize once when a 503'd webhook is redelivered after the link", async () => {
    const signed = signFalWebhook(OK_BODY);
    expect((await post(signed)).status).toBe(503);
    const job = await jobWith("submitted", "req_1");
    expect((await post(signed)).status).toBe(200);
    expect(ctx.queue.tasks).toMatchObject([
      { kind: "finalize", jobId: job.id },
    ]);
    expect(await events()).toHaveLength(1);
  });

  it("rejects a signed webhook from another fal user", async () => {
    await jobWith("submitted", "req_1");
    const res = await post(signFalWebhook(OK_BODY, { userId: "someone-else" }));
    expect(res.status).toBe(401);
    expect(await events()).toHaveLength(0);
  });

  const senderLogged = (logs: Array<Record<string, unknown>>) =>
    logs.some(
      (l) =>
        l.severity === "INFO" &&
        l.falUserId === "fal-user" &&
        l.requestId === "req_1",
    );

  it("logs the fal sender id while FAL_WEBHOOK_USER_ID is unset", async () => {
    await jobWith("submitted", "req_1");
    const open = makeDeps({
      config: { ...ctx.deps.config, FAL_WEBHOOK_USER_ID: undefined },
    });
    const res = await request(createApp(open.deps))
      .post("/webhooks/fal")
      .set(signFalWebhook(OK_BODY).headers)
      .set("content-type", "application/json")
      .send(signFalWebhook(OK_BODY).raw.toString("utf8"));
    expect(res.status).toBe(200);
    expect(senderLogged(open.logs)).toBe(true);
  });

  it("doesn't log the sender id once FAL_WEBHOOK_USER_ID is set", async () => {
    await jobWith("submitted", "req_1");
    const res = await post(signFalWebhook(OK_BODY));
    expect(res.status).toBe(200);
    expect(senderLogged(ctx.logs)).toBe(false);
  });
});
