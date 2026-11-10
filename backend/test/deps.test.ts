import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../src/credits/defaultTieredCreditMapping.js";
import { createDeps } from "../src/deps.js";

const env = {
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

describe("createDeps", () => {
  it("stops at startup on a mapping typo, naming the key", () => {
    const mapping = {
      klng21: {
        tiers: [
          {
            name: "Basic",
            isDefault: true,
            meters: [{ metric: "duration", unitSize: 1, rate: 6 }],
          },
        ],
      },
    };
    const config = loadConfig({
      ...env,
      TIERED_CREDIT_MAPPING: JSON.stringify(mapping),
    });
    expect(() => createDeps(config)).toThrow(/TIERED_CREDIT_MAPPING.*klng21/);
  });

  it("stops at startup on a mapping that prices a job outside 1 to 2147483647", () => {
    // Valid in shape, but one flux image floors to 0 units: a 0-credit job.
    const mapping = {
      ...DEFAULT_TIERED_CREDIT_MAPPING,
      fluxSchnell_generate: {
        tiers: [
          {
            name: "Basic",
            isDefault: true,
            meters: [
              { metric: "images", unitSize: 10, rate: 1, round: "floor" },
            ],
          },
        ],
      },
    };
    const config = loadConfig({
      ...env,
      TIERED_CREDIT_MAPPING: JSON.stringify(mapping),
    });
    expect(() => createDeps(config)).toThrow(
      /^TIERED_CREDIT_MAPPING invalid \(fluxSchnell_generate, tier Basic\): .* at 0 credits/,
    );
  });

  it("uses the default mapping when none is set", async () => {
    const deps = createDeps(loadConfig(env));
    expect(Object.keys(deps.creditMapping).sort()).toEqual([
      "fluxSchnell_generate",
      "kling21_generate",
    ]);
    await deps.db.destroy();
  });
});
