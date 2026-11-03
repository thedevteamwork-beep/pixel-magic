import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import type { TieredCreditMapping } from "../../src/credits/tieredCredits.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { T } from "../../src/db/tables.js";
import { resetDb, testDb } from "../helpers/db.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { createFundedUser } from "../helpers/factories.js";

const app = () => createApp(makeDeps().deps);

describe("POST /v1/credits/estimate", () => {
  it("estimates kling21 text-to-video 10 s", async () => {
    const res = await request(app())
      .post("/v1/credits/estimate")
      .send({ model: "kling21", options: { duration: "10" } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      model: "kling21",
      count: 1,
      tier: "Basic",
      creditsPerJob: 60,
      totalCredits: 60,
      breakdown: [
        {
          unit: "duration",
          label: "seconds",
          quantity: 10,
          rate: 6,
          credits: 60,
        },
      ],
    });
  });

  it("multiplies by count", async () => {
    const res = await request(app())
      .post("/v1/credits/estimate")
      .send({ model: "kling21", options: { duration: "5" }, count: 3 });
    expect(res.body).toMatchObject({
      creditsPerJob: 30,
      totalCredits: 90,
      count: 3,
    });
  });

  it("rounds a fractional total up once", async () => {
    const creditMapping: TieredCreditMapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      kling21: {
        tiers: [
          {
            name: "Basic",
            isDefault: true,
            meters: [{ metric: "duration", unitSize: 1, rate: 2.5 }],
          },
        ],
      },
    };
    const { deps } = makeDeps({ creditMapping });
    const res = await request(createApp(deps))
      .post("/v1/credits/estimate")
      .send({ model: "kling21", options: { duration: "5" } });
    expect(res.body.creditsPerJob).toBe(13); // 12.5 → 13
  });

  it("rounds once per job, not once per meter", async () => {
    const creditMapping: TieredCreditMapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      kling21: {
        tiers: [
          {
            name: "Basic",
            isDefault: true,
            meters: [
              { metric: "duration", unitSize: 1, rate: 1.25 },
              { metric: "duration", unitSize: 1, rate: 1.25 },
            ],
          },
        ],
      },
    };
    const { deps } = makeDeps({ creditMapping });
    const res = await request(createApp(deps))
      .post("/v1/credits/estimate")
      .send({ model: "kling21", options: { duration: "5" } });
    // 6.25 + 6.25 = 12.5 → 13 (rounding each meter would give 14).
    expect(res.body.creditsPerJob).toBe(13);
  });

  it("matches what createJob reserves", async () => {
    const creditMapping: TieredCreditMapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      kling21: {
        tiers: [
          {
            name: "Basic",
            isDefault: true,
            meters: [{ metric: "duration", unitSize: 1, rate: 2.5 }],
          },
        ],
      },
    };
    const { deps } = makeDeps({ creditMapping });
    const api = createApp(deps);
    const body = { model: "kling21", options: { duration: "5" } };
    const estimate = await request(api).post("/v1/credits/estimate").send(body);
    await resetDb();
    await seedTestCatalog(testDb);
    const userId = await createFundedUser(deps, 100);
    const job = await request(api)
      .post("/v1/jobs")
      .set(await authHeader(userId))
      .set("Idempotency-Key", "est-1")
      .send({ ...body, prompt: "a cat" });
    expect(job.status).toBe(202);
    expect(job.body.creditCost).toBe(estimate.body.creditsPerJob);
    expect(job.body.creditCost).toBe(13);
  });

  describe.each([
    ["a floor tier that prices 1 image at 0", { unitSize: 10, round: "floor" }],
    ["a huge rate", { unitSize: 1, rate: 1e12 }],
  ] as const)("with %s", (_name, meter) => {
    it("fails the estimate and job creation the same way, reserving nothing", async () => {
      const creditMapping: TieredCreditMapping = {
        ...DEFAULT_TIERED_CREDIT_MAPPING,
        "flux-schnell": {
          tiers: [
            {
              name: "Basic",
              isDefault: true,
              meters: [{ metric: "images", rate: 1, ...meter }],
            },
          ],
        },
      };
      await resetDb();
      await seedTestCatalog(testDb);
      const { deps } = makeDeps({ creditMapping });
      const userId = await createFundedUser(deps, 100);
      const api = createApp(deps);
      const body = { model: "flux-schnell" };
      const estimate = await request(api)
        .post("/v1/credits/estimate")
        .send(body);
      const job = await request(api)
        .post("/v1/jobs")
        .set(await authHeader(userId))
        .set("Idempotency-Key", "bad-price")
        .send({ ...body, prompt: "a cat" });
      expect(estimate.status).toBe(500);
      expect(job.status).toBe(500);
      expect(job.body.code).toBe(estimate.body.code);
      expect(await testDb(T.jobs).count({ n: "*" }).first()).toMatchObject({
        n: "0",
      });
      expect(await testDb(T.creditAllocations)).toHaveLength(0);
    });
  });

  it.each([
    ["unknown model", { model: "nope" }],
    ["unknown option", { model: "kling21", options: { durtion: "5" } }],
    ["uploadCount above the model's max", { model: "kling21", uploadCount: 2 }],
    ["extra body key", { model: "kling21", extra: 1 }],
  ])("422 for %s", async (_name, body) => {
    const res = await request(app()).post("/v1/credits/estimate").send(body);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("names the unknown option", async () => {
    const res = await request(app())
      .post("/v1/credits/estimate")
      .send({ model: "kling21", options: { durtion: "5" } });
    expect(JSON.stringify(res.body)).toContain("durtion");
  });

  it("GET /v1/models shows the credit range", async () => {
    const res = await request(app()).get("/v1/models");
    const byKey = Object.fromEntries(
      res.body.map((m: { key: string }) => [m.key, m]),
    );
    expect(byKey.kling21.credits).toEqual({ min: 30, max: 60 });
    expect(byKey["flux-schnell"].credits).toEqual({ min: 1, max: 4 });
    expect(byKey.kling21.creditCost).toBeUndefined();
  });
});
