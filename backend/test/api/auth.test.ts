import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../src/api/middlewares/errorHandler.js";
import { requireUser } from "../../src/api/middlewares/auth.js";
import { makeDeps } from "../helpers/app.js";
import { signToken, type TokenClaims } from "../helpers/auth.js";

function buildApp() {
  const { deps } = makeDeps();
  const app = express();
  app.get("/me", requireUser(deps), (req, res) => {
    res.json(req.user);
  });
  app.use(errorHandler(deps.logger));
  return app;
}

const past = Math.floor(Date.now() / 1000) - 3600;

describe("requireUser", () => {
  it.each<[string, TokenClaims | undefined]>([
    ["no header", undefined],
    ["wrong issuer", { iss: "https://evil/auth/v1" }],
    ["expired", { exp: past }],
    ["anon role", { role: "anon" }],
    ["anonymous user", { is_anonymous: true }],
  ])("rejects %s with 401 UNAUTHENTICATED", async (_name, claims) => {
    const req = request(buildApp()).get("/me");
    if (claims) req.set("Authorization", `Bearer ${await signToken(claims)}`);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      message: "Unauthenticated",
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });
  it("sets req.user from sub and email", async () => {
    const token = await signToken({ sub: "user-1" });
    const res = await request(buildApp())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "user-1", email: "u@test.dev" });
  });
});
