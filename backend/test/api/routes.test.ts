import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";

type Method = "get" | "post" | "delete";
const id = randomUUID();

// The README's API list. Panel entries need a login: without one the guard
// answers 401 before any route is reached, which would hide a dropped route.
const PUBLIC: [Method, string][] = [
  ["get", "/_healthz"],
  ["get", "/_readyz"],
  ["get", "/v1/plans"],
  ["get", "/v1/addons"],
  ["get", "/v1/models"],
  ["post", "/v1/credits/estimate"],
  ["post", "/webhooks/paddle"],
  ["post", "/webhooks/fal"],
];
const PANEL: [Method, string][] = [
  ["get", "/v1/me"],
  ["post", "/v1/billing/addons"],
  ["get", "/v1/billing/subscription/preview"],
  ["post", "/v1/billing/subscription"],
  ["delete", "/v1/billing/subscription/scheduled-change"],
  ["get", "/v1/billing/invoices"],
  ["post", "/v1/uploads"],
  ["post", "/v1/jobs"],
  ["get", "/v1/jobs"],
  ["get", `/v1/jobs/${id}`],
];

// The catch-all from notFound. A handler's own 404 ("Job not found") means
// the route is served.
function isCatchAll(res: request.Response): boolean {
  return res.status === 404 && res.body?.message === "Not found";
}

describe("route layout", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
  });

  it.each(PUBLIC)("%s %s is served", async (method, path) => {
    const res = await request(createApp(h.deps))[method](path);
    expect(isCatchAll(res)).toBe(false);
  });

  it.each(PANEL)(
    "%s %s is served for a logged-in user",
    async (method, path) => {
      const req = request(createApp(h.deps))[method](path);
      const res = await req.set(await authHeader(userId));
      expect(res.status).not.toBe(401);
      expect(isCatchAll(res)).toBe(false);
    },
  );

  it.each(PANEL)("%s %s needs a login", async (method, path) => {
    const res = await request(createApp(h.deps))[method](path);
    expect(res.status).toBe(401);
  });

  it("an unauthenticated unknown path inside a panel area gets 401", async () => {
    const res = await request(createApp(h.deps)).get("/v1/jobs/a/b");
    expect(res.status).toBe(401);
  });

  it("a path outside every area gets 404", async () => {
    const res = await request(createApp(h.deps)).get("/v1/nope");
    expect(res.status).toBe(404);
  });
});
