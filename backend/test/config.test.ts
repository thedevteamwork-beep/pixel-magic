import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const base = {
  MODE: "api",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  SUPABASE_URL: "https://x.supabase.co",
  PADDLE_API_KEY: "k",
  PADDLE_WEBHOOK_SECRET: "s",
};

describe("loadConfig", () => {
  it("applies defaults", () => {
    const c = loadConfig(base);
    expect(c).toMatchObject({
      PORT: 8080,
      FREE_PLAN_NAME: "free",
      CARRYOVER_VALIDITY_DAYS: 30,
      PLAN_CHANGE_LOCK_MINUTES: 60,
      CHECKOUT_REUSE_MINUTES: 30,
      RENEWAL_GRACE_MINUTES: 60,
      PADDLE_ENV: "sandbox",
      DB_POOL_MAX: 5,
      CORS_ORIGINS: [],
    });
    expect(c.DATABASE_MIGRATION_URL).toBe(base.DATABASE_URL);
  });
  it("splits CORS_ORIGINS", () =>
    expect(
      loadConfig({ ...base, CORS_ORIGINS: "https://a.com, https://b.com," })
        .CORS_ORIGINS,
    ).toEqual(["https://a.com", "https://b.com"]));
  it("lists every invalid key", () =>
    expect(() => loadConfig({ MODE: "x" })).toThrow(
      /MODE[\s\S]*DATABASE_URL[\s\S]*PADDLE_API_KEY/,
    ));
  it("rejects CARRYOVER_VALIDITY_DAYS=0", () =>
    expect(() => loadConfig({ ...base, CARRYOVER_VALIDITY_DAYS: "0" })).toThrow(
      /CARRYOVER_VALIDITY_DAYS/,
    ));
});
