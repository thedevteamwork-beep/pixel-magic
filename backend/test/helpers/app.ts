import Transport from "winston-transport";
import type { Config } from "../../src/config.js";
import type { Deps } from "../../src/deps.js";
import { createLogger } from "../../src/logger.js";
import { FakePaddle } from "../fakes/paddle.js";
import { FakeFal } from "../fakes/fal.js";
import { FakeStorage } from "../fakes/storage.js";
import { testJwks } from "./auth.js";
import { TEST_DATABASE_URL, testDb } from "./db.js";
import { testFalKeys } from "./falWebhook.js";

export class TestClock {
  private current = new Date("2026-03-10T12:00:00Z");
  now(): Date {
    return new Date(this.current.getTime());
  }
  set(d: Date): void {
    this.current = new Date(d.getTime());
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

class MemoryTransport extends Transport {
  constructor(private readonly sink: Record<string, unknown>[]) {
    super();
  }
  override log(info: Record<string, unknown>, next: () => void): void {
    this.sink.push(info);
    next();
  }
}

export function makeDeps(overrides: Partial<Deps> = {}): {
  deps: Deps;
  paddle: FakePaddle;
  storage: FakeStorage;
  fal: FakeFal;
  clock: TestClock;
  logs: Array<Record<string, unknown>>;
} {
  const logs: Array<Record<string, unknown>> = [];
  const paddle = new FakePaddle();
  const storage = new FakeStorage();
  const fal = new FakeFal();
  const clock = new TestClock();
  const config: Config = {
    MODE: "api",
    PORT: 8080,
    NODE_ENV: "test",
    LOG_LEVEL: "debug",
    DATABASE_URL: TEST_DATABASE_URL,
    DATABASE_MIGRATION_URL: TEST_DATABASE_URL,
    DB_POOL_MAX: 5,
    SUPABASE_URL: "https://test.supabase.co",
    CORS_ORIGINS: [],
    PADDLE_API_KEY: "test-paddle-key",
    PADDLE_WEBHOOK_SECRET: "test_secret",
    PADDLE_ENV: "sandbox",
    FREE_PLAN_NAME: "free",
    CARRYOVER_VALIDITY_DAYS: 30,
    PLAN_CHANGE_LOCK_MINUTES: 60,
    CHECKOUT_REUSE_MINUTES: 30,
    RENEWAL_GRACE_MINUTES: 60,
    SUPABASE_SECRET_KEY: "test-supabase-secret",
    FAL_KEY: "test-fal-key",
    API_PUBLIC_URL: "https://api.test",
    WORKER_URL: "https://worker.test",
    STORAGE_BUCKET_INPUTS: "inputs",
    STORAGE_BUCKET_OUTPUTS: "outputs",
    FAL_JWKS_URL: "https://rest.fal.ai/.well-known/jwks.json",
    TASKS_MODE: "http",
    TASKS_QUEUE_GENERATION: "generation",
    TASKS_QUEUE_FINALIZATION: "finalization",
    MAX_ACTIVE_JOBS_PER_USER: 4,
    UPLOAD_MAX_BYTES: 20971520,
    UPLOAD_MIME_TYPES: ["image/png", "image/jpeg", "image/webp"],
  };
  const deps: Deps = {
    config,
    db: testDb,
    logger: createLogger("debug", [new MemoryTransport(logs)]),
    paddle,
    storage,
    fal,
    falKeys: testFalKeys,
    clock,
    jwks: testJwks,
    ...overrides,
  };
  return {
    deps,
    paddle,
    storage: deps.storage as FakeStorage,
    fal: deps.fal as FakeFal,
    clock,
    logs,
  };
}
