import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { createDb } from "../../src/db/knex.js";
import { createWorkerApp } from "../../src/worker/server.js";
import { makeDeps } from "../helpers/app.js";

describe("health", () => {
  it("GET /_healthz → 200", async () => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps)).get("/_healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
  it("GET /_readyz → 200 when the DB answers", async () => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps)).get("/_readyz");
    expect(res.status).toBe(200);
  });
  it("GET /_readyz → 503 when the DB is unreachable", async () => {
    const db = createDb("postgres://x:y@localhost:1/none");
    try {
      const { deps } = makeDeps({ db });
      const res = await request(createApp(deps)).get("/_readyz");
      expect(res.status).toBe(503);
    } finally {
      await db.destroy();
    }
  });
  it("worker app serves /_healthz", async () => {
    const { deps } = makeDeps();
    const res = await request(createWorkerApp(deps)).get("/_healthz");
    expect(res.status).toBe(200);
  });
});
