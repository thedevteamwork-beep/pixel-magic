import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { makeDeps } from "../helpers/app.js";

// The README's API list: every endpoint keeps answering on its URL.
const ENDPOINTS: [method: "get" | "post" | "delete", path: string][] = [
  ["get", "/_healthz"],
  ["get", "/_readyz"],
  ["get", "/v1/plans"],
  ["get", "/v1/addons"],
  ["get", "/v1/models"],
  ["post", "/v1/credits/estimate"],
  ["get", "/v1/me"],
  ["post", "/v1/billing/addons"],
  ["get", "/v1/billing/subscription/preview"],
  ["post", "/v1/billing/subscription"],
  ["delete", "/v1/billing/subscription/scheduled-change"],
  ["get", "/v1/billing/invoices"],
  ["post", "/v1/uploads"],
  ["post", "/v1/jobs"],
  ["get", "/v1/jobs/a"],
  ["get", "/v1/jobs/a/download-url"],
  ["post", "/webhooks/paddle"],
  ["post", "/webhooks/fal"],
];

describe("route layout", () => {
  it.each(ENDPOINTS)("%s %s is mounted (not 404)", async (method, path) => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps))[method](path);
    expect(res.status).not.toBe(404);
  });

  it("an unauthenticated unknown path inside a panel area gets 401", async () => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps)).get("/v1/jobs/a/b");
    expect(res.status).toBe(401);
  });

  it("a path outside every area gets 404", async () => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps)).get("/v1/nope");
    expect(res.status).toBe(404);
  });
});
