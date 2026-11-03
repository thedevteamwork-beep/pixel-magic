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
      "kling21",
    ]);
    expect(
      res.body.map((m: { credits: { min: number; max: number } }) => m.credits),
    ).toEqual([
      { min: 1, max: 4 },
      { min: 30, max: 60 },
    ]);
    expect(res.body[0]).toMatchObject({
      name: expect.any(String),
      kind: "image",
      category: ["text-to-image"],
      description: expect.any(String),
      input: {
        prompt: { description: expect.any(String), type: "string" },
      },
    });
    expect(res.body[1].category).toEqual(["image-to-video", "text-to-video"]);
    expect(JSON.stringify(res.body)).not.toContain("falEndpoint");
    expect(JSON.stringify(res.body)).not.toContain("fal-ai/");
  });
});
