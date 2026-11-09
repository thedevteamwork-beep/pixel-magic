import { randomUUID } from "node:crypto";
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
import { readmeExampleMapping } from "../helpers/creditMappings.js";

const app = () => createApp(makeDeps().deps);

describe("POST /v1/credits/estimate/:plugin/:operation", () => {
  it("estimates kling21 text-to-video 10 s", async () => {
    const res = await request(app())
      .post("/v1/credits/estimate/kling21/generate")
      .send({ input: { prompt: "waves", duration: "10" } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      model: "kling21_generate",
      count: 1,
      tier: "Basic",
      creditsPerJob: 60,
      totalCredits: 60,
      baseCredits: 0,
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
      .post("/v1/credits/estimate/kling21/generate")
      .send({ input: { prompt: "waves", duration: "5" }, count: 3 });
    expect(res.body).toMatchObject({
      creditsPerJob: 30,
      totalCredits: 90,
      count: 3,
    });
  });

  it("rounds a fractional total up once", async () => {
    const creditMapping: TieredCreditMapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      kling21_generate: {
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
      .post("/v1/credits/estimate/kling21/generate")
      .send({ input: { prompt: "waves", duration: "5" } });
    expect(res.body.creditsPerJob).toBe(13); // 12.5 → 13
  });

  it("rounds once per job, not once per meter", async () => {
    const creditMapping: TieredCreditMapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      kling21_generate: {
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
      .post("/v1/credits/estimate/kling21/generate")
      .send({ input: { prompt: "waves", duration: "5" } });
    // 6.25 + 6.25 = 12.5 → 13 (rounding each meter would give 14).
    expect(res.body.creditsPerJob).toBe(13);
  });

  it("matches what createJob reserves", async () => {
    const creditMapping: TieredCreditMapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      kling21_generate: {
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
    const body = { input: { prompt: "a cat", duration: "5" } };
    const estimate = await request(api)
      .post("/v1/credits/estimate/kling21/generate")
      .send(body);
    await resetDb();
    await seedTestCatalog(testDb);
    const userId = await createFundedUser(deps, 100);
    const job = await request(api)
      .post("/v1/jobs/kling21/generate")
      .set(await authHeader(userId))
      .set("Idempotency-Key", "est-1")
      .send(body);
    expect(job.status).toBe(202);
    expect(job.body.creditCost).toBe(estimate.body.creditsPerJob);
    expect(job.body.creditCost).toBe(13);
  });

  describe.each([
    ["a floor tier that prices 1 image at 0", { unitSize: 10, round: "floor" }],
    ["a huge rate", { unitSize: 1, rate: 1e12 }],
  ] as const)("with %s", (_name, meter) => {
    it("refuses to start, naming the model and the tier", () => {
      const creditMapping: TieredCreditMapping = {
        ...DEFAULT_TIERED_CREDIT_MAPPING,
        fluxSchnell_generate: {
          tiers: [
            {
              name: "Basic",
              isDefault: true,
              meters: [{ metric: "images", rate: 1, ...meter }],
            },
          ],
        },
      };
      expect(() => makeDeps({ creditMapping })).toThrow(
        /^TIERED_CREDIT_MAPPING invalid \(fluxSchnell_generate, tier Basic\): /,
      );
    });
  });

  it("explains creditsPerJob: base credits plus the breakdown, rounded up once", async () => {
    const { deps } = makeDeps({ creditMapping: readmeExampleMapping() });
    const res = await request(createApp(deps))
      .post("/v1/credits/estimate/kling21/generate")
      .send({
        input: { prompt: "waves", duration: "5", image: [randomUUID()] },
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      model: "kling21_generate",
      count: 1,
      tier: "Image to video",
      creditsPerJob: 40,
      totalCredits: 40,
      baseCredits: 5,
      breakdown: [
        {
          unit: "duration",
          label: "seconds",
          quantity: 5,
          rate: 7,
          credits: 35,
        },
      ],
    });
  });

  it.each([
    [{ credits: 0.25, rate: 2.5 }, 13], // 0.25 + 12.5 = 12.75 -> 13
    [{ credits: 3, rate: 6 }, 33], // 3 + 30 = 33
  ])(
    "baseCredits + the breakdown credits, rounded up, is creditsPerJob (%j)",
    async (tier, expected) => {
      const creditMapping: TieredCreditMapping = {
        ...DEFAULT_TIERED_CREDIT_MAPPING,
        kling21_generate: {
          tiers: [
            {
              name: "Basic",
              isDefault: true,
              credits: tier.credits,
              meters: [{ metric: "duration", unitSize: 1, rate: tier.rate }],
            },
          ],
        },
      };
      const { deps } = makeDeps({ creditMapping });
      const res = await request(createApp(deps))
        .post("/v1/credits/estimate/kling21/generate")
        .send({ input: { prompt: "waves", duration: "5" } });
      const sum = res.body.breakdown.reduce(
        (n: number, b: { credits: number }) => n + b.credits,
        res.body.baseCredits,
      );
      expect(res.body.baseCredits).toBe(tier.credits);
      expect(Math.ceil(sum)).toBe(res.body.creditsPerJob);
      expect(res.body.creditsPerJob).toBe(expected);
    },
  );

  it("matches what createJob reserves for an image job in a conditional tier", async () => {
    const { deps, storage } = makeDeps({
      creditMapping: readmeExampleMapping(),
    });
    const api = createApp(deps);
    const estimate = await request(api)
      .post("/v1/credits/estimate/kling21/generate")
      .send({
        input: { prompt: "waves", duration: "5", image: [randomUUID()] },
      });
    expect(estimate.body.tier).toBe("Image to video");

    await resetDb();
    await seedTestCatalog(testDb);
    const userId = await createFundedUser(deps, 100);
    const auth = await authHeader(userId);
    const up = await request(api)
      .post("/v1/uploads")
      .set(auth)
      .send({ filename: "a.png", mimeType: "image/png", sizeBytes: 100 });
    storage.put("inputs", up.body.path, {
      sizeBytes: 100,
      mimeType: "image/png",
    });
    const job = await request(api)
      .post("/v1/jobs/kling21/generate")
      .set(auth)
      .set("Idempotency-Key", "est-image")
      .send({
        input: { prompt: "move", duration: "5", image: [up.body.uploadId] },
      });
    expect(job.status).toBe(202);
    expect(job.body.creditCost).toBe(estimate.body.creditsPerJob);
    expect(job.body.creditCost).toBe(40); // 5 + 5 s x 7
    const reserved = await testDb(T.creditAllocations).where({
      job_id: job.body.jobId,
      status: "reserved",
    });
    expect(reserved.reduce((n, r) => n + r.amount, 0)).toBe(40);
  });

  it.each([
    ["missing input", {}],
    ["unknown option", { input: { prompt: "waves", durtion: "5" } }],
    [
      "more uploads than the model takes",
      { input: { prompt: "waves", image: [randomUUID(), randomUUID()] } },
    ],
    ["extra body key", { input: { prompt: "waves" }, extra: 1 }],
  ])("422 for %s", async (_name, body) => {
    const res = await request(app())
      .post("/v1/credits/estimate/kling21/generate")
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 NOT_FOUND for an unknown plugin or operation", async () => {
    for (const route of ["nope/generate", "kling21/nope"]) {
      const res = await request(app())
        .post(`/v1/credits/estimate/${route}`)
        .send({ input: { prompt: "waves" } });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    }
  });

  it("names the unknown option", async () => {
    const res = await request(app())
      .post("/v1/credits/estimate/kling21/generate")
      .send({ input: { prompt: "waves", durtion: "5" } });
    expect(JSON.stringify(res.body)).toContain("durtion");
  });

  it("GET /v1/models shows the credit range", async () => {
    const res = await request(app()).get("/v1/models");
    const byKey = Object.fromEntries(
      res.body.map((m: { key: string }) => [m.key, m]),
    );
    expect(byKey.kling21_generate.credits).toEqual({ min: 30, max: 60 });
    expect(byKey["fluxSchnell_generate"].credits).toEqual({ min: 1, max: 4 });
    expect(byKey.kling21_generate.creditCost).toBeUndefined();
  });

  it("GET /v1/models counts image jobs in the range", async () => {
    const { deps } = makeDeps({ creditMapping: readmeExampleMapping() });
    const res = await request(createApp(deps)).get("/v1/models");
    const byKey = Object.fromEntries(
      res.body.map((m: { key: string }) => [m.key, m]),
    );
    // The dearest kling21 job is 10 s from an image: 5 + 10 x 7 = 75.
    expect(byKey.kling21_generate.credits).toEqual({ min: 30, max: 75 });
    expect(byKey["fluxSchnell_generate"].credits).toEqual({ min: 1, max: 4 });
  });
});
