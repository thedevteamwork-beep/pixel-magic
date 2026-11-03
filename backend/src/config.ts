import { z } from "zod";

const int = (def: number, min: number) =>
  z.coerce.number().int().min(min).default(def);

const baseSchema = z.object({
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
  SUPABASE_SECRET_KEY: z.string().min(1),
  FAL_KEY: z.string().min(1),
  API_PUBLIC_URL: z.string().min(1),
  WORKER_URL: z.string().min(1),
  STORAGE_BUCKET_INPUTS: z.string().min(1).default("inputs"),
  STORAGE_BUCKET_OUTPUTS: z.string().min(1).default("outputs"),
  FAL_JWKS_URL: z
    .string()
    .min(1)
    .default("https://rest.fal.ai/.well-known/jwks.json"),
  FAL_WEBHOOK_USER_ID: z.string().min(1).optional(),
  TASKS_MODE: z.enum(["http", "cloud"]).default("http"),
  TASKS_QUEUE_GENERATION: z.string().min(1).default("generation"),
  TASKS_QUEUE_FINALIZATION: z.string().min(1).default("finalization"),
  GCP_PROJECT_ID: z.string().min(1).optional(),
  GCP_REGION: z.string().min(1).optional(),
  TASKS_SERVICE_ACCOUNT: z.string().min(1).optional(),
  MAX_ACTIVE_JOBS_PER_USER: int(4, 1),
  UPLOAD_MAX_BYTES: int(20971520, 1),
  UPLOAD_MIME_TYPES: z
    .string()
    .default("image/png,image/jpeg,image/webp")
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

const schema = baseSchema.superRefine((c, ctx) => {
  if (c.TASKS_MODE !== "cloud") return;
  for (const key of [
    "GCP_PROJECT_ID",
    "GCP_REGION",
    "TASKS_SERVICE_ACCOUNT",
  ] as const) {
    if (!c[key]) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: 'required when TASKS_MODE is "cloud"',
      });
    }
  }
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
