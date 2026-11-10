import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandler } from "../../src/api/middlewares/errorHandler.js";
import { validate } from "../../src/api/middlewares/validate.js";
import { createApp } from "../../src/api/server.js";
import { makeDeps } from "../helpers/app.js";

function buildApp() {
  const made = makeDeps();
  const app = express();
  app.post(
    "/echo",
    express.json({ limit: "100kb" }),
    validate({ body: z.object({ n: z.number() }) }),
    (req, res) => {
      res.json(req.body);
    },
  );
  app.get("/boom", () => {
    throw new Error("secret detail");
  });
  app.use(errorHandler(made.deps.logger));
  return { app, ...made };
}

describe("error handling", () => {
  it("unknown route → 404 NOT_FOUND", async () => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps)).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
  it("invalid JSON → 4xx VALIDATION_FAILED", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/echo")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });
  it("schema violation → 422 VALIDATION_FAILED with issues", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/echo").send({ n: "x" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.meta).toHaveLength(1);
  });
  it("thrown Error → 500 INTERNAL without the message, logged with stack", async () => {
    const { app, logs } = buildApp();
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: "Internal error",
      status: 500,
      code: "INTERNAL",
    });
    const record = logs.find((l) => l.severity === "ERROR");
    expect(record).toBeDefined();
    expect(JSON.stringify(record)).toContain("secret detail");
    expect(JSON.stringify(record)).toContain("stack");
  });
  it("body over 100kb → 413", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/echo")
      .send({ n: 1, pad: "x".repeat(101 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });
});
