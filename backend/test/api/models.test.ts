import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { makeDeps } from "../helpers/app.js";

describe("models route", () => {
  it("GET /v1/models lists public fields with a cache header", async () => {
    const res = await request(createApp(makeDeps().deps)).get("/v1/models");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    expect(res.body.map((m: { key: string }) => m.key)).toEqual([
      "flux-schnell",
      "kling-i2v",
    ]);
    expect(res.body.map((m: { creditCost: number }) => m.creditCost)).toEqual([
      1, 10,
    ]);
    expect(res.body[0]).toMatchObject({
      name: expect.any(String),
      kind: "image",
      prompt: { required: true, maxLength: 2000 },
      uploads: { min: 0, max: 0 },
      options: { type: "object" },
    });
    expect(JSON.stringify(res.body)).not.toContain("falModelId");
    expect(JSON.stringify(res.body)).not.toContain("fal-ai/");
  });
});
