import { listModels } from "../../src/models/registry.js";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { makeDeps } from "../helpers/app.js";

describe("models route", () => {
  it("GET /v1/models lists public fields with a cache header", async () => {
    const res = await request(createApp(makeDeps().deps)).get("/v1/models");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    type Listed = { key: string; credits: { min: number; max: number } };
    const body = res.body as Listed[];
    expect(body.map((m) => m.key)).toEqual(listModels().map((m) => m.key));
    const credits = Object.fromEntries(body.map((m) => [m.key, m.credits]));
    expect(credits.fluxSchnell_generate).toEqual({ min: 1, max: 4 });
    expect(credits.kling21_generate).toEqual({ min: 100, max: 200 });
    for (const { min, max } of Object.values(credits)) {
      expect(min).toBeGreaterThanOrEqual(1);
      expect(max).toBeGreaterThanOrEqual(min);
    }
    expect(res.body[0]).toMatchObject({
      name: expect.any(String),
      kind: "image",
      category: ["text-to-image"],
      description: expect.any(String),
      input: {
        prompt: { description: expect.any(String), type: "string" },
      },
    });
    const kling = body.find((m) => m.key === "kling21_generate") as Listed & {
      category: string[];
    };
    expect(kling.category).toEqual(["image-to-video", "text-to-video"]);
    expect(JSON.stringify(res.body)).not.toContain("falEndpoint");
    expect(JSON.stringify(res.body)).not.toContain("fal-ai/");
  });
});
