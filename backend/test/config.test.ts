import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const base = {
  MODE: "api",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  SUPABASE_URL: "https://x.supabase.co",
  PADDLE_API_KEY: "k",
  PADDLE_WEBHOOK_SECRET: "s",
  SUPABASE_SECRET_KEY: "s",
  FAL_KEY: "f",
  API_PUBLIC_URL: "https://api.test",
  WORKER_URL: "https://worker.test",
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
  it("applies generation defaults", () =>
    expect(loadConfig(base)).toMatchObject({
      STORAGE_BUCKET_INPUTS: "inputs",
      STORAGE_BUCKET_OUTPUTS: "outputs",
      TASKS_MODE: "http",
      MAX_ACTIVE_JOBS_PER_USER: 4,
      UPLOAD_MAX_BYTES: 20971520,
      UPLOAD_MIME_TYPES: ["image/png", "image/jpeg", "image/webp"],
      FAL_JWKS_URL: "https://rest.fal.ai/.well-known/jwks.json",
    }));
  it("requires GCP settings in cloud mode", () =>
    expect(() => loadConfig({ ...base, TASKS_MODE: "cloud" })).toThrow(
      /GCP_PROJECT_ID[\s\S]*GCP_REGION[\s\S]*TASKS_SERVICE_ACCOUNT/,
    ));
  it("accepts cloud mode with GCP settings", () =>
    expect(
      loadConfig({
        ...base,
        TASKS_MODE: "cloud",
        GCP_PROJECT_ID: "p",
        GCP_REGION: "r",
        TASKS_SERVICE_ACCOUNT: "sa@p.iam",
      }).TASKS_MODE,
    ).toBe("cloud"));
  it("requires FAL_KEY", () =>
    expect(() => loadConfig({ ...base, FAL_KEY: undefined })).toThrow(
      /FAL_KEY/,
    ));
  it("treats an empty optional key as unset", () =>
    expect(
      loadConfig({ ...base, FAL_WEBHOOK_USER_ID: "" }).FAL_WEBHOOK_USER_ID,
    ).toBeUndefined());
  it("treats empty optional cloud and migration keys as unset", () => {
    const c = loadConfig({
      ...base,
      GCP_PROJECT_ID: "",
      GCP_REGION: "",
      TASKS_SERVICE_ACCOUNT: "",
      DATABASE_MIGRATION_URL: "",
    });
    expect(c.GCP_PROJECT_ID).toBeUndefined();
    expect(c.GCP_REGION).toBeUndefined();
    expect(c.TASKS_SERVICE_ACCOUNT).toBeUndefined();
    expect(c.DATABASE_MIGRATION_URL).toBe(base.DATABASE_URL);
  });
  it("rejects an empty UPLOAD_MIME_TYPES", () =>
    expect(() => loadConfig({ ...base, UPLOAD_MIME_TYPES: "" })).toThrow(
      /UPLOAD_MIME_TYPES/,
    ));
  it("strips one trailing slash from the public and worker URLs", () =>
    expect(
      loadConfig({
        ...base,
        API_PUBLIC_URL: "https://a.test/",
        WORKER_URL: "https://w.test/",
      }),
    ).toMatchObject({
      API_PUBLIC_URL: "https://a.test",
      WORKER_URL: "https://w.test",
    }));
  it("parses the values in .env.example", () => {
    const env: Record<string, string> = {};
    const text = readFileSync(
      new URL("../.env.example", import.meta.url),
      "utf8",
    );
    for (const line of text.split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m?.[1] !== undefined) env[m[1]] = m[2] ?? "";
    }
    expect(Object.keys(env)).toContain("FAL_KEY");
    expect(loadConfig(env).MODE).toBe("api");
  });
  it("requires cloud tasks on Cloud Run", () =>
    expect(() => loadConfig({ ...base, K_SERVICE: "pixel-magic-api" })).toThrow(
      /TASKS_MODE: must be cloud on Cloud Run/,
    ));
  it("accepts cloud tasks on Cloud Run", () =>
    expect(
      loadConfig({
        ...base,
        K_SERVICE: "pixel-magic-api",
        TASKS_MODE: "cloud",
        GCP_PROJECT_ID: "p",
        GCP_REGION: "r",
        TASKS_SERVICE_ACCOUNT: "sa@p.iam",
      }).TASKS_MODE,
    ).toBe("cloud"));
});
