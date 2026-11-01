import { z } from "zod";

const int = (def: number, min: number) =>
  z.coerce.number().int().min(min).default(def);

const schema = z.object({
  MODE: z.enum(["api", "worker"]),
  PORT: int(8080, 1),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.string().min(1).default("info"),
  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().min(1).optional(),
  DB_POOL_MAX: int(5, 1),
  SUPABASE_URL: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  PADDLE_API_KEY: z.string().min(1),
  PADDLE_WEBHOOK_SECRET: z.string().min(1),
  PADDLE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  FREE_PLAN_NAME: z.string().min(1).default("free"),
  CARRYOVER_VALIDITY_DAYS: int(30, 1),
  PLAN_CHANGE_LOCK_MINUTES: int(60, 0),
  CHECKOUT_REUSE_MINUTES: int(30, 0),
  RENEWAL_GRACE_MINUTES: int(60, 0),
});

export type Config = Omit<z.output<typeof schema>, "DATABASE_MIGRATION_URL"> & {
  DATABASE_MIGRATION_URL: string;
};

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const keys = [
      ...new Set(result.error.issues.map((i) => String(i.path[0]))),
    ];
    const lines = result.error.issues.map(
      (i) => `${String(i.path[0])}: ${i.message}`,
    );
    throw new Error(
      `Invalid configuration for ${keys.join(", ")}:\n${lines.join("\n")}`,
    );
  }
  const data = result.data;
  return {
    ...data,
    DATABASE_MIGRATION_URL: data.DATABASE_MIGRATION_URL ?? data.DATABASE_URL,
  };
}
