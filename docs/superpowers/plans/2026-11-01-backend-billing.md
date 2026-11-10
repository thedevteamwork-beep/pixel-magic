# Pixel Magic backend skeleton + plans and add-ons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `backend/` service skeleton and the full plans and add-ons billing: catalog, Free plan, Paddle checkout, renewals, plan changes with carryover, add-ons, credit grants with reserve/capture/release, and the hourly billing sweep.

**Architecture:** There is one TypeScript codebase. `MODE=api` runs an Express 5 app with the public API and webhooks; `MODE=worker` runs one with the task routes. Postgres tables live in schema `app` and are reached through Knex repositories. Billing rules sit in `src/services/billing/`. Credits are pots (`credit_grants`), and jobs reserve against them through `credit_allocations`. Paddle sits behind a `PaddleClient` interface, which tests replace with `FakePaddle`.

**Tech Stack:** Node 22, TypeScript 5, Express 5, Zod 4, Winston, Knex + pg, jose, `@paddle/paddle-node-sdk`, Vitest + supertest, and Postgres 17 in docker-compose.

**Spec:**
- `docs/superpowers/specs/2026-11-01-plans-addons-design.md` (the "plans spec"), which wins where the two disagree.
- `docs/superpowers/specs/2026-10-28-backend-design.md` (the "backend spec").

This plan covers backend milestone 1 (the skeleton) and plans-spec milestone 3. Generation (backend milestone 2) is out of scope, except for the credit reserve/capture/release functions it will call.

## Global Constraints

**Tooling and process**
- Node 22 (`.nvmrc`: `22`). Run `nvm use` in `backend/` before any npm command; the machine default is Node 18.
- Use Express 5, Zod, Winston and Knex. Don't use Objection, Redis or Sentry.
- Prettier uses 2-space indent and double quotes. ESLint uses typescript-eslint. `npm run lint`, `npm run typecheck` and `npm test` must pass at the end of every task.
- Do all work on branch `feat/backend-billing`, never on `main`. Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Database**
- Every table lives in Postgres schema `app`. Refer to tables by their schema-qualified names (`"app.plans"`, via the `T` constants in `src/db/tables.ts`), never through `search_path`, because Supabase's transaction pooler doesn't keep session settings.
- Every table has RLS enabled with no policies, and `anon` and `authenticated` get no privileges. Use `secureTable()` in every migration.
- IDs are UUID v4 (`gen_random_uuid()`). Timestamps are `timestamptz`. Credits are integers. Money is `numeric(12,2)` in USD; pg returns it as a string, so keep it a string in TS.
- SQL is written only in `src/db/repositories/*` and migrations. Row types use snake_case column names. API JSON uses camelCase, mapped in the routes.
- Services get the current time from `deps.clock.now()` and pass it into SQL as a parameter. Never use SQL `now()` in application queries (migrations may use it for defaults).

**HTTP and errors**
- The error body is `{ message, status, code, meta? }`, where `code` is one of: `UNAUTHENTICATED`, `VALIDATION_FAILED`, `NOT_FOUND`, `PLAN_NOT_AVAILABLE`, `ADDON_NOT_AVAILABLE`, `ALREADY_ON_PLAN`, `RENEWAL_IN_PROGRESS`, `PAYMENT_PAST_DUE`, `NO_SCHEDULED_CHANGE`, `INSUFFICIENT_CREDITS`, `PAYMENT_PROVIDER_ERROR`, `INTERNAL`.
- Use `helmet`. CORS allows only `CORS_ORIGINS`. The JSON body limit is `100kb`. `/webhooks/paddle` reads the raw body.

**Logging**
- Log through Winston JSON with `severity`. Never use `console.log` in `src/` (except CLI scripts' final output). Never log tokens, keys, signed URLs or the webhook secret.

**Config defaults**
- `FREE_PLAN_NAME=free`
- `CARRYOVER_VALIDITY_DAYS=30`
- `PLAN_CHANGE_LOCK_MINUTES=60`
- `CHECKOUT_REUSE_MINUTES=30`
- `RENEWAL_GRACE_MINUTES=60`
- `PADDLE_ENV=sandbox`
- `DB_POOL_MAX=5`

**Exact descriptions** (plans spec §6.2, from Rupika)
- Now: `` `You'll be moved to the ${display} plan immediately.` ``
- At period end: `` `You'll be moved to the ${display} plan at the end of your current billing cycle.` ``

## Review Focus

Each line below has its pinning test added to the task named.

1. **A completed transaction we didn't create.** An `api`-origin `transaction.completed` whose `custom_data` lacks our `invoiceId`/`userId`, or names an unknown invoice (e.g. made by staff in the Paddle dashboard): the event is recorded and an ERROR is logged, the webhook returns `200`, and nothing is granted. (Task 11)
2. **A renewal on a replaced subscription.** A renewal charged on a Paddle subscription that's no longer the active row, because the old subscription renewed before its cancel went through: the renewal invoice is recorded and there's no grant. An ERROR log names the Paddle subscription id so the charge can be refunded by hand. (Task 12)
3. **The post-commit Paddle cancel fails or hangs.** The webhook still returns `200` within the 3 s budget, and `paddle_cancel_pending` stays `true` for the sweep. (Task 11)
4. **Prices with cents.** `9.99` becomes Paddle unit price `"999"` exactly, never through floating point. (Tasks 5 and 9)
5. **A Supabase token without an `email` claim** (phone sign-in): the profile is created with `email = null`, and `/v1/me` returns `email: null`. (Task 7)

---

## File structure

```
backend/
  package.json  tsconfig.json  tsconfig.build.json  vitest.config.ts  eslint.config.mjs  .prettierrc
  .nvmrc  .gitignore  .dockerignore  .env.example  Dockerfile  docker-compose.yml  docker/initdb/01-test-db.sql
  README.md  AGENTS.md
  src/
    index.ts                      MODE dispatch, listen on PORT
    config.ts                     zod env schema → Config
    logger.ts                     winston JSON with severity
    deps.ts                       Deps type + createDeps(config)
    lib/errors.ts                 AppError, ErrorCode
    lib/time.ts                   addMinutes/addDays/addMonths, Clock, systemClock
    types/express.d.ts            req.user
    db/knex.ts  db/migrate.ts  db/tables.ts  db/rows.ts  db/migrationHelpers.ts
    db/migrations/                5 migration files (Task 2)
    db/seeds/catalog.ts  db/seeds/run.ts
    db/repositories/              catalog, profiles, subscriptions, credits, invoices, customerAddons, paymentEvents
    services/billing/             rules, subscriptions, checkout, planChange, paddleWebhook, paddleCancel, sweep
    clients/paddle.ts             PaddleClient interface + SDK implementation
    clients/paddleEvents.ts       zod parsing of webhook payloads → PaddleEvent
    api/server.ts  api/middlewares/{auth,ensureUser,validate,errorHandler}.ts
    api/routes/{health,catalog,me,billing,webhooks}.ts
    worker/server.ts
    scripts/grantCredits.ts
  test/
    setup/globalSetup.ts          migrate the test DB once
    helpers/{db,app,auth,catalog,factories,paddleEvents}.ts
    fakes/paddle.ts
    fixtures/paddle/*.json
    (tests mirror src/: test/lib, test/db, test/api, test/services/billing, test/clients)
.github/workflows/backend.yml
```

---

### Task 1: Scaffold, config, logger, errors, time

**Files:**
- Create: `backend/package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.nvmrc`, `.gitignore`, `.env.example`, `README.md` (run instructions only)
- Create: `backend/src/config.ts`, `src/logger.ts`, `src/lib/errors.ts`, `src/lib/time.ts`
- Test: `backend/test/config.test.ts`, `test/lib/time.test.ts`, `test/logger.test.ts`

**Interfaces:**
- Produces:
  - `loadConfig(env: NodeJS.ProcessEnv): Config`. It throws `Error` whose message lists every invalid key. `Config` keys are the env names, already coerced:
    - `MODE: "api"|"worker"`, `PORT: number` (8080), `NODE_ENV: "development"|"test"|"production"`, `LOG_LEVEL: string` ("info").
    - `DATABASE_URL: string`, `DATABASE_MIGRATION_URL: string` (defaults to `DATABASE_URL`), `DB_POOL_MAX: number`.
    - `SUPABASE_URL: string`, `CORS_ORIGINS: string[]` (comma-split, empties dropped).
    - `PADDLE_API_KEY: string`, `PADDLE_WEBHOOK_SECRET: string`, `PADDLE_ENV: "sandbox"|"production"`.
    - `FREE_PLAN_NAME: string`, `CARRYOVER_VALIDITY_DAYS: number` (≥1), `PLAN_CHANGE_LOCK_MINUTES: number` (≥0), `CHECKOUT_REUSE_MINUTES: number` (≥0), `RENEWAL_GRACE_MINUTES: number` (≥0).
  - `createLogger(level: string, transports?: winston.transport[]): winston.Logger`. Every record carries `severity` (`error`→`ERROR`, `warn`→`WARNING`, `info`→`INFO`, `debug`→`DEBUG`), and errors carry `stack`.
  - `class AppError extends Error { constructor(status: number, code: ErrorCode, message: string, meta?: unknown) }` and `type ErrorCode` (the union from Global Constraints).
  - `addMinutes(d: Date, n: number): Date`, `addDays(d: Date, n: number): Date`, and `addMonths(d: Date, n: number): Date`, which clamps to the last day of the month in UTC.
  - `type Clock = { now(): Date }` and `systemClock: Clock`.

- [ ] **Step 1: Create the branch and package skeleton**

Run: `cd "/Users/tusharbansal/Desktop/pixel magic" && git checkout -b feat/backend-billing && mkdir backend`

Create `package.json` (`"type": "module"`, `"engines": {"node": ">=22 <23"}`) with these scripts:

| Script | Command |
|---|---|
| `dev:api` | `MODE=api tsx watch src/index.ts` |
| `dev:worker` | `MODE=worker tsx watch src/index.ts` |
| `build` | `tsc -p tsconfig.build.json` |
| `start` | `node dist/index.js` |
| `migrate` | `tsx src/db/migrate.ts` |
| `seed` | `tsx src/db/seeds/run.ts` |
| `credits:grant` | `tsx src/scripts/grantCredits.ts` |
| `lint` | `eslint . && prettier --check .` |
| `format` | `prettier --write .` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `db:up` | `docker compose up -d db` |

Dependencies:
- Runtime: `express@^5 helmet cors zod@^4 winston knex pg jose @paddle/paddle-node-sdk`.
- Dev: `typescript@^5 tsx vitest supertest @types/express @types/cors @types/supertest @types/node@^22 eslint@^9 @eslint/js typescript-eslint prettier`.

Other files:
- `tsconfig.json`: `strict`, `module`/`moduleResolution` `NodeNext`, `target` `ES2023`, `outDir` `dist`, including `src` and `test`.
- `tsconfig.build.json`: extends it and includes only `src`.
- `vitest.config.ts`: `fileParallelism: false` (one shared test DB), `globalSetup: "test/setup/globalSetup.ts"`. Create that file now as an exported no-op `setup()`; Task 2 fills it in.

Run: `cd backend && nvm use && npm install`
Expected: install completes and `package-lock.json` is created.

- [ ] **Step 2: Write failing tests**

```ts
// test/config.test.ts
const base = { MODE: "api", DATABASE_URL: "postgres://u:p@localhost:5432/db", SUPABASE_URL: "https://x.supabase.co",
  PADDLE_API_KEY: "k", PADDLE_WEBHOOK_SECRET: "s" };
it("applies defaults", () => {
  const c = loadConfig(base);
  expect(c).toMatchObject({ PORT: 8080, FREE_PLAN_NAME: "free", CARRYOVER_VALIDITY_DAYS: 30, PLAN_CHANGE_LOCK_MINUTES: 60,
    CHECKOUT_REUSE_MINUTES: 30, RENEWAL_GRACE_MINUTES: 60, PADDLE_ENV: "sandbox", DB_POOL_MAX: 5, CORS_ORIGINS: [] });
  expect(c.DATABASE_MIGRATION_URL).toBe(base.DATABASE_URL);
});
it("splits CORS_ORIGINS", () => expect(loadConfig({ ...base, CORS_ORIGINS: "https://a.com, https://b.com," }).CORS_ORIGINS)
  .toEqual(["https://a.com", "https://b.com"]));
it("lists every invalid key", () => expect(() => loadConfig({ MODE: "x" })).toThrow(/MODE[\s\S]*DATABASE_URL[\s\S]*PADDLE_API_KEY/));
it("rejects CARRYOVER_VALIDITY_DAYS=0", () => expect(() => loadConfig({ ...base, CARRYOVER_VALIDITY_DAYS: "0" })).toThrow(/CARRYOVER_VALIDITY_DAYS/));

// test/lib/time.test.ts
it("addMonths clamps to month end", () => {
  expect(addMonths(new Date("2026-01-31T10:00:00Z"), 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  expect(addMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString()).toBe("2028-02-29T10:00:00.000Z");
  expect(addMonths(new Date("2026-03-15T00:00:00Z"), 12).toISOString()).toBe("2027-03-15T00:00:00.000Z");
});
it("addDays and addMinutes", () => {
  expect(addDays(new Date("2026-03-10T00:00:00Z"), 30).toISOString()).toBe("2026-04-09T00:00:00.000Z");
  expect(addMinutes(new Date("2026-03-10T00:00:00Z"), 60).toISOString()).toBe("2026-03-10T01:00:00.000Z");
});

// test/logger.test.ts — memory transport collects records
it("adds severity and stack", () => {
  logger.error("boom", { err: new Error("x") });
  expect(records[0]).toMatchObject({ severity: "ERROR", message: "boom" });
  expect(JSON.stringify(records[0])).toContain("Error: x");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, because the modules don't exist.

- [ ] **Step 4: Implement `config.ts`, `logger.ts`, `lib/errors.ts` and `lib/time.ts`** with the signatures above. Write `.env.example` with every Config key and dummy values, and the test URL `postgres://postgres:postgres@localhost:54329/pixel_magic`. Add `.env` to `.gitignore`, along with `dist`, `node_modules` and `coverage`. Write `eslint.config.mjs` (typescript-eslint recommended, `no-console: error` in `src/`, off for `src/scripts` and `src/db/seeds/run.ts`) and `.prettierrc` `{ "singleQuote": false, "tabWidth": 2 }`.

- [ ] **Step 5: Run the tests, lint and typecheck**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit.** Include `docs/superpowers/` so the specs and this plan are committed too.

```bash
git add backend docs/superpowers
git commit -m "feat(backend): scaffold with config, logger, errors and time helpers"
```

---

### Task 2: Database, migrations and test DB

**Files:**
- Create: `backend/docker-compose.yml` (service `db` only for now: `postgres:17`, port `54329:5432`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=pixel_magic`, mounting `docker/initdb`)
- Create: `backend/docker/initdb/01-test-db.sql` (`CREATE DATABASE pixel_magic_test;`)
- Create: `src/db/knex.ts`, `src/db/migrate.ts`, `src/db/tables.ts`, `src/db/rows.ts`, `src/db/migrationHelpers.ts`
- Create: `src/db/migrations/20261101000100_app_schema.ts`, `20261101000200_catalog.ts`, `20261101000300_purchases.ts`, `20261101000400_generation.ts`, `20261101000500_credits.ts`
- Create: `test/setup/globalSetup.ts`, `test/helpers/db.ts`
- Test: `test/db/migrations.test.ts`, `test/db/constraints.test.ts`

**Interfaces:**
- Produces:
  - `createDb(url: string, poolMax?: number): Knex` (pg client, pool `{ min: 0, max: poolMax ?? 5 }`).
  - `runMigrations(db: Knex): Promise<void>`. It uses `migrations.directory` = the `migrations` folder next to the file and `loadExtensions: [".ts"]` or `[".js"]`, depending on the file's own extension. Run as a CLI, it reads `DATABASE_MIGRATION_URL`.
  - `T` = `{ profiles: "app.profiles", paymentEvents: "app.payment_events", features: "app.features", plans: "app.plans", planFeatures: "app.plan_features", addons: "app.addons", addonFeatures: "app.addon_features", invoices: "app.invoices", subscriptions: "app.subscriptions", customerAddons: "app.customer_addons", uploads: "app.uploads", jobs: "app.jobs", providerEvents: "app.provider_events", creditGrants: "app.credit_grants", creditAllocations: "app.credit_allocations", creditLedger: "app.credit_ledger" } as const`.
  - Row types in `rows.ts`, one per table, with fields exactly as in the columns below: `ProfileRow`, `PlanRow`, `AddonRow`, `SubscriptionRow`, `InvoiceRow`, `CustomerAddonRow`, `GrantRow`, `AllocationRow`, `LedgerRow`, `PaymentEventRow` and `JobRow`. Also `PlanWithCredits = PlanRow & { credits: number }`, `AddonWithCredits = AddonRow & { credits: number }` and `ActiveSubscription = SubscriptionRow & { plan: PlanWithCredits }`.
  - `secureTable(knex: Knex, table: string): Promise<void>`. It runs `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY`, plus `REVOKE ALL ON <t> FROM anon, authenticated` inside a `DO` block that runs only if those roles exist. Migration 0100 revokes the schema the same way.
  - Test helpers: `testDb: Knex`, built from `TEST_DATABASE_URL` (default `postgres://postgres:postgres@localhost:54329/pixel_magic_test`), and `resetDb(): Promise<void>`, which truncates every `app` table with `RESTART IDENTITY CASCADE`.

**Columns.** Every table has `id uuid pk default gen_random_uuid()`, `created_at` and, where the spec has it, `updated_at`, all `timestamptz default now()`.

- **0100**
  - `create schema if not exists app`.
  - `profiles (id uuid pk — no default, email text null, paddle_customer_id text unique null, created_at)`.
  - `payment_events (paddle_event_id text unique not null, event_type text, occurred_at timestamptz, payload jsonb, processed_at timestamptz null)`.
- **0200**
  - `features (name text unique, display text, description text)`.
  - `plans (name text unique, display text, description text, priority int, interval text check in ('monthly','yearly'), amount numeric(12,2), currency text default 'USD', credit_validity_days int null check (>= 1), custom bool default false, archived bool default false, paddle_product_id text unique null, paddle_price_id text unique null, metadata jsonb default '{}')`.
  - `plan_features (plan_id fk, feature_id fk, quantity int check (>= 0), unique(plan_id, feature_id))`.
  - `addons`: the same as plans minus `priority`/`interval`/`credit_validity_days`, plus `duration_days int not null check (>= 1)`.
  - `addon_features` mirrors `plan_features`.
- **0300**
  - `invoices (user_id fk profiles, paddle_transaction_id text unique null, item_type text check in ('plan','addon'), item_id uuid null` (null only for a renewal charged at an unknown price), change_type text null check in ('new','upgrade','downgrade'), from_subscription_id uuid null, status text check in ('draft','paid','canceled','past_due'), origin text null, amount numeric(12,2) null, currency text default 'USD', checkout_url text null, paddle_subscription_id text null, billing_period_start/end timestamptz null, paid_at timestamptz null)`.
  - `subscriptions`: the plans spec §4.2 columns. `status` check in `('active','renewed','upgraded','downgraded','canceled')`, `paddle_status` text null, `paddle_cancel_pending bool default false`, `previous_subscription_id` fk self null.
  - Raw SQL indexes: `unique (user_id) where active`, `unique (paddle_subscription_id) where active`, `(current_period_end) where active`, `(paddle_cancel_pending) where paddle_cancel_pending`.
  - `customer_addons (user_id, addon_id, invoice_id unique null, bought_at, expires_at)`.
- **0400**: `uploads`, `jobs` and `provider_events`, exactly as in backend spec §6 (`jobs` with `unique (user_id, idempotency_key)`).
- **0500**
  - `credit_grants`: plans spec §4.3, with these changes:
    - check `total >= 0` (a Free plan may give 0), `used >= 0`, `reserved >= 0` and `used + reserved <= total`;
    - `kind` check in `('plan','carryover','addon','manual')`;
    - partial unique `(subscription_id)` and `(customer_addon_id)`;
    - index `(user_id, expires_at)`.
  - `credit_allocations (job_id fk jobs, grant_id fk, amount int check > 0, status check in ('reserved','captured','released'), unique(job_id, grant_id))`.
  - `credit_ledger (user_id, grant_id null, job_id null, invoice_id null, type check in ('grant','reserve','capture','release','convert','adjust'), amount int, note text null)`.
- Every migration calls `secureTable` for each table it creates, and has a `down` that drops its tables.

- [ ] **Step 1: Start Postgres**

Run: `npm run db:up && sleep 3 && docker compose exec db psql -U postgres -lqt | cut -d'|' -f1 | grep -w pixel_magic_test`
Expected: prints `pixel_magic_test`.

- [ ] **Step 2: Write failing tests**

```ts
// test/db/migrations.test.ts
it("creates every table in schema app with RLS on", async () => {
  const rows = await testDb.raw(`select tablename, rowsecurity from pg_tables where schemaname='app'`);
  expect(rows.rows.map((r: any) => r.tablename).sort()).toEqual(Object.values(T).map((t) => t.slice(4)).sort());
  expect(rows.rows.every((r: any) => r.rowsecurity)).toBe(true);
});
it("rolls all the way down and up again", async () => { /* fresh knex on a scratch DB: migrate.latest, rollback(all), latest → no error */ });

// test/db/constraints.test.ts  (insert minimal rows with testDb)
it("allows only one active subscription per user");                 // 2nd active insert → rejects with code "23505"
it("rejects a grant whose used + reserved exceeds total");          // → code "23514"
it("rejects a second allocation for the same job and grant");       // → "23505"
it("rejects a second plan grant for the same subscription");        // → "23505"
it("rejects a duplicate paddle_event_id");                          // → "23505"
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npm test -- test/db`
Expected: FAIL (`relation "app.profiles" does not exist`, or a missing module).

- [ ] **Step 4: Implement** `knex.ts`, `migrate.ts`, `tables.ts`, `rows.ts`, `migrationHelpers.ts`, the five migrations, `globalSetup.ts` (calls `runMigrations(createDb(TEST_DATABASE_URL))`) and `helpers/db.ts`. For the rollback test, create a scratch DB `pixel_magic_scratch` in the test itself and drop it afterwards.

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend && git commit -m "feat(backend): app schema migrations and test database"
```

---

### Task 3: HTTP skeleton, auth, both modes, Docker and CI

**Files:**
- Create: `src/deps.ts`, `src/api/server.ts`, `src/api/middlewares/auth.ts`, `validate.ts`, `errorHandler.ts`, `src/api/routes/health.ts`, `src/worker/server.ts`, `src/index.ts`, `src/types/express.d.ts`
- Create: `src/clients/paddle.ts`, holding only the `PaddleClient` interface (stub type) so `Deps` compiles. Task 8 fills it in.
- Create: `Dockerfile`, `.dockerignore`, and `.github/workflows/backend.yml` at the repo root
- Modify: `backend/docker-compose.yml` to add `api` (port 8080) and `worker` (port 8081) services built from the Dockerfile. `api` runs `node dist/db/migrate.js && node dist/index.js`.
- Create: `test/helpers/app.ts`, `test/helpers/auth.ts`, `test/fakes/paddle.ts` (empty class for now)
- Test: `test/api/health.test.ts`, `test/api/auth.test.ts`, `test/api/errors.test.ts`

**Interfaces:**
- Consumes: Task 1 `Config`, `createLogger`, `AppError` and `Clock`; Task 2 `createDb`.
- Produces:
  - `type Deps = { config: Config; db: Knex; logger: winston.Logger; paddle: PaddleClient; clock: Clock; jwks: JWTVerifyGetKey }`.
  - `createDeps(config: Config): Deps`. `jwks` is `createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))`.
  - `createApp(deps: Deps): Express`, applying in order: helmet, cors, the routers, `notFound`, `errorHandler`. Each router applies `express.json({ limit: "100kb" })` itself, so webhooks can mount `express.raw` instead.
  - `createWorkerApp(deps: Deps): Express`, which serves the health routes now; Task 13 adds `/tasks/billing-sweep`.
  - `requireUser(deps): RequestHandler`, which verifies with `jwtVerify(token, deps.jwks, { issuer: `${SUPABASE_URL}/auth/v1` })`. It requires `sub`, `role === "authenticated"` and `is_anonymous !== true`, and sets `req.user = { id: sub, email: email ?? null }`. Any failure gives `AppError(401, "UNAUTHENTICATED", "Unauthenticated")`.
  - `validate({ body?, query? }: { body?: ZodType; query?: ZodType }): RequestHandler`, which replaces `req.body` and `res.locals.query` with the parsed values.
  - `notFound` gives a 404 `NOT_FOUND`.
  - `errorHandler(logger): ErrorRequestHandler`:
    - `AppError` → its status and code.
    - `ZodError` → 422 `VALIDATION_FAILED` with `meta: issues`.
    - body-parser errors → their status with `VALIDATION_FAILED`.
    - anything else → 500 `INTERNAL`, message `"Internal error"`, logged at error level with the stack.
  - `healthRouter(deps)`: `GET /_healthz` → `200 {status:"ok"}`; `GET /_readyz` → `select 1` → 200, or 503 on failure.
  - Test helpers:
    - `makeDeps(overrides?: Partial<Deps>): { deps: Deps; paddle: FakePaddle; clock: TestClock; logs: Array<Record<string, unknown>> }`. It uses `testDb`, a memory-transport logger whose records land in `logs`, a `TestClock` (`now()`, `set(d: Date)`, `advance(ms: number)`, starting at `2026-03-10T12:00:00Z`) and `createLocalJWKSet(testJwks)`.
    - `signToken(claims?: Partial<{ sub: string; email: string | null; role: string; is_anonymous: boolean; iss: string; exp: number }>): Promise<string>` (ES256; defaults: `sub` random uuid, email `u@test.dev`, role `authenticated`, iss `https://test.supabase.co/auth/v1`, exp +1 h).
    - `authHeader(userId: string, claims?): Promise<{ Authorization: string }>`.
    - `makeDeps` sets `config.SUPABASE_URL = "https://test.supabase.co"`.

- [ ] **Step 1: Write failing tests**

```ts
// test/api/health.test.ts
it("GET /_healthz → 200", ...);  it("GET /_readyz → 200 when the DB answers", ...);
it("GET /_readyz → 503 when the DB is unreachable", ...);   // deps.db = createDb("postgres://x:y@localhost:1/none")
it("worker app serves /_healthz", ...);

// test/api/auth.test.ts — build a small express app in the test: requireUser(deps) → handler returning req.user → errorHandler
it.each([
  ["no header", undefined], ["wrong issuer", { iss: "https://evil/auth/v1" }], ["expired", { exp: past }],
  ["anon role", { role: "anon" }], ["anonymous user", { is_anonymous: true }],
])("rejects %s with 401 UNAUTHENTICATED", ...);   // body equals { message: "Unauthenticated", status: 401, code: "UNAUTHENTICATED" }
it("sets req.user from sub and email", ...);      // → { id: sub, email: "u@test.dev" }

// test/api/errors.test.ts
it("unknown route → 404 NOT_FOUND", ...);
it("invalid JSON → 4xx VALIDATION_FAILED", ...);
it("thrown Error → 500 INTERNAL without the message, logged with stack", ...);  // body.message === "Internal error"; logs has severity ERROR
it("body over 100kb → 413", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/api`
Expected: FAIL.

- [ ] **Step 3: Implement** the files listed above. `index.ts` loads config (logging the error and exiting with 1 if it's invalid), calls `createDeps`, and listens on `PORT` with `createApp` or `createWorkerApp` according to `MODE`. Dockerfile: multi-stage `node:22-alpine` (`npm ci` → `npm run build` → `npm prune --omit=dev`), non-root `node` user, `CMD ["node","dist/index.js"]`. CI workflow:
- Triggers: `pull_request` with `paths: ["backend/**"]`.
- Service: `postgres:17` on port 54329, with `POSTGRES_PASSWORD=postgres`.
- Steps: create `pixel_magic_test` with psql, then `npm ci`, lint, typecheck and test in `backend/`, with Node from `.nvmrc`.

- [ ] **Step 4: Run the tests and the image build**

Run: `npm test && npm run lint && npm run typecheck && docker build -t pixel-magic-backend .`
Expected: PASS, and the image builds.

- [ ] **Step 5: Commit**

```bash
git add backend .github && git commit -m "feat(backend): express servers, Supabase auth, error handling, Docker and CI"
```

---

### Task 4: Catalog repository, seed and public catalog routes

**Files:**
- Create: `src/db/repositories/catalog.repo.ts`, `src/db/seeds/catalog.ts`, `src/db/seeds/run.ts`, `src/api/routes/catalog.ts`
- Create: `test/helpers/catalog.ts`
- Modify: `src/api/server.ts` (mount `catalogRouter`)
- Test: `test/db/seed.test.ts`, `test/api/catalog.test.ts`

**Interfaces:**
- Consumes: `T`, the row types and `Deps`.
- Produces:
  - `catalog.repo.ts`. `credits` comes from a left join on `plan_features`/`addon_features` with the feature named `credits`, using coalesce to 0.
    - `listPublicPlans(db: Knex): Promise<PlanWithCredits[]>`: not custom and not archived, ordered by `priority`, then `interval` (monthly first), then `name`.
    - `getPlanByName(db, name: string): Promise<PlanWithCredits | null>`, `getPlanById(db, id: string)` and `getPlanByPaddlePriceId(db, priceId: string)`.
    - `listPublicAddons(db): Promise<AddonWithCredits[]>`, `getAddonByName(db, name)` and `getAddonById(db, id)`.
    - `lockCatalogRow(trx: Knex.Transaction, kind: "plan" | "addon", id: string): Promise<PlanRow | AddonRow>`, using `FOR UPDATE`.
    - `setPaddleIds(trx, kind: "plan" | "addon", id: string, ids: { productId: string; priceId: string }): Promise<void>`.
  - `CATALOG`: the plans spec §4.1 sample (features `credits`; plans `free`, `starter_monthly`, `pro_monthly` and `pro_yearly`, with those amounts, priorities and credits; add-on `credits_1000`), with a `// TODO(pricing)` comment.
  - `seedCatalog(db: Knex): Promise<void>`: upserts by `name`, and never overwrites `paddle_product_id` or `paddle_price_id`.
  - `catalogRouter(deps)`:
    - `GET /v1/plans` → `[{ name, display, description, interval, amount, currency, credits, creditValidityDays, priority }]`.
    - `GET /v1/addons` → `[{ name, display, description, amount, currency, credits, durationDays }]`.
    - Both send `Cache-Control: public, max-age=300`, are public, and pass `amount` through as the string from Postgres (e.g. `"10.00"`).
  - `seedTestCatalog(db): Promise<{ plans: Record<string, PlanWithCredits>; addons: Record<string, AddonWithCredits> }>`. It runs `seedCatalog`, then inserts:
    - `starter_yearly` (Starter, priority 1, yearly, 100.00, 6000 credits);
    - `pro_monthly_v2` (priority 2, monthly, 35.00, 2000);
    - `pro_monthly_v3` (priority 2, monthly, 25.00, 2000);
    - `archived_plan` (archived);
    - `custom_plan` (custom);
    - `credits_999c` (add-on 9.99, 100 credits, 10 days);
    - `archived_addon` (archived).

- [ ] **Step 1: Write failing tests**

```ts
// test/db/seed.test.ts
it("seeds the sample catalog", async () => {
  await seedCatalog(testDb);
  expect((await getPlanByName(testDb, "pro_yearly"))).toMatchObject({ amount: "300.00", interval: "yearly", priority: 2, credits: 24000 });
  expect((await getAddonByName(testDb, "credits_1000"))).toMatchObject({ amount: "20.00", duration_days: 30, credits: 1000 });
});
it("is idempotent and keeps Paddle ids", async () => {
  await seedCatalog(testDb); /* set paddle ids on free */ await seedCatalog(testDb);
  expect(await testDb(T.plans).count()).toEqual([{ count: "4" }]);  // ids kept
});

// test/api/catalog.test.ts
it("GET /v1/plans lists public plans in tier order with credits", ...);
  // names === ["free","starter_monthly","starter_yearly","pro_monthly","pro_monthly_v2","pro_monthly_v3","pro_yearly"]; no archived_plan/custom_plan; free.credits === 50
it("GET /v1/addons hides archived add-ons", ...);    // includes credits_1000 { durationDays: 30, credits: 1000, amount: "20.00" }
it("sets Cache-Control public, max-age=300", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/db/seed.test.ts test/api/catalog.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `catalog.repo.ts`, the seed (`run.ts` connects with `DATABASE_URL`, then seeds and exits), the router and the test helper.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(backend): plans and add-ons catalog with seed and public routes"
```

---

### Task 5: Billing rules (pure functions)

**Files:**
- Create: `src/services/billing/rules.ts`
- Test: `test/services/billing/rules.test.ts`

**Interfaces:**
- Consumes: `PlanRow` and `addDays`/`addMinutes`.
- Produces:
  - `type ChangeType = "new" | "upgrade" | "downgrade" | "cancel" | "same"`.
  - `getChangeType(from: PlanRow, to: PlanRow, freePlanName: string): ChangeType` (plans spec §3.2 calls 1 and 19, and §6.2):
    - same id → `same`;
    - `to` is Free → `cancel`;
    - `from` is Free → `new`;
    - higher priority → `upgrade`, lower → `downgrade`;
    - equal priority: monthly→yearly → `upgrade`, yearly→monthly → `downgrade`;
    - equal priority and interval: `to.amount > from.amount` → `upgrade`, else `downgrade`.

    Compare amounts as integer cents, using `toCents`.
  - `type Action = "now" | "period_end"`.
  - `getAction(from: PlanRow, to: PlanRow, changeType: Exclude<ChangeType, "same">): Action`:
    - `new` and `upgrade` → `now`;
    - `cancel` → `period_end`;
    - `downgrade` → `now` if `from.interval === "yearly" || from.interval !== to.interval`, else `period_end`.
  - `describeAction(to: PlanRow, action: Action): string`, using the exact strings in Global Constraints.
  - `planGrantExpiry(plan: PlanRow, periodStart: Date, periodEnd: Date, graceMinutes: number): Date` = `(plan.credit_validity_days ? addDays(periodStart, days) : periodEnd) + graceMinutes`.
  - `toCents(amount: string): string`: exact decimal-string arithmetic, no floats.
  - `paddleInterval(plan: PlanRow): "month" | "year"`.

- [ ] **Step 1: Write failing tests.** These use plan objects built inline with the `seedTestCatalog` values.

```ts
it.each([
  ["free", "starter_monthly", "new", "now"],
  ["starter_monthly", "pro_monthly", "upgrade", "now"],
  ["pro_monthly", "pro_yearly", "upgrade", "now"],
  ["pro_yearly", "pro_monthly", "downgrade", "now"],
  ["pro_yearly", "starter_yearly", "downgrade", "now"],
  ["pro_monthly", "starter_yearly", "downgrade", "now"],
  ["pro_monthly", "starter_monthly", "downgrade", "period_end"],
  ["pro_monthly", "pro_monthly_v2", "upgrade", "now"],
  ["pro_monthly", "pro_monthly_v3", "downgrade", "period_end"],
  ["pro_monthly", "free", "cancel", "period_end"],
])("%s → %s is %s / %s", (from, to, type, action) => {
  expect(getChangeType(P[from], P[to], "free")).toBe(type);
  expect(getAction(P[from], P[to], type)).toBe(action);
});
it("same plan is same", () => { expect(getChangeType(P.pro_monthly, P.pro_monthly, "free")).toBe("same"); expect(getChangeType(P.free, P.free, "free")).toBe("same"); });
it("describes actions exactly", () => {
  expect(describeAction(P.starter_monthly, "period_end")).toBe("You'll be moved to the Starter plan at the end of your current billing cycle.");
  expect(describeAction(P.pro_monthly, "now")).toBe("You'll be moved to the Pro plan immediately.");
});
it("plan grant expiry: period end + grace, or validity days + grace", () => {
  const s = new Date("2026-03-10T00:00:00Z"), e = new Date("2026-04-10T00:00:00Z");
  expect(planGrantExpiry({ ...P.pro_monthly, credit_validity_days: null }, s, e, 60).toISOString()).toBe("2026-04-10T01:00:00.000Z");
  expect(planGrantExpiry({ ...P.pro_monthly, credit_validity_days: 90 }, s, e, 60).toISOString()).toBe("2026-06-08T01:00:00.000Z");
});
it("toCents is exact", () => {   // Review Focus 4
  expect(["9.99", "300.00", "0.10", "10", "0.00"].map(toCents)).toEqual(["999", "30000", "10", "1000", "0"]);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/services/billing/rules.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `rules.ts`** with the signatures above.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): change-type, action, expiry and cents rules"
```

---

### Task 6: Credit grants, reserve/capture/release, carryover

**Files:**
- Create: `src/db/repositories/credits.repo.ts`, `src/scripts/grantCredits.ts`
- Create: `test/helpers/factories.ts` (`insertProfile(db, id?)`, `insertSubscriptionRow(db, partial)`, `insertGrant(db, partial)` and `insertJob(db, userId)`, which inserts a `queued` job with `model_key "test"`, `credit_cost 0`, a random `idempotency_key` and `request_hash "x"`)
- Test: `test/db/credits.test.ts`

**Interfaces:**
- Consumes: the row types, `T` and `AppError`.
- Produces (every function that writes also inserts the matching `credit_ledger` row):
  - `type NewGrant = { user_id: string; kind: GrantRow["kind"]; subscription_id?: string; customer_addon_id?: string; total: number; starts_at: Date; expires_at: Date; invoice_id?: string; note?: string }`.
  - `insertGrant(trx: Knex | Knex.Transaction, g: NewGrant): Promise<GrantRow>` (ledger `grant`).
  - `reserveCredits(trx: Knex.Transaction, p: { userId: string; jobId: string; amount: number; now: Date }): Promise<AllocationRow[]>`:
    - lock with `SELECT 1 FROM app.profiles WHERE id = ? FOR UPDATE`;
    - select spendable grants (`starts_at <= now < expires_at`, `total - used - reserved > 0`) `ORDER BY (kind <> 'plan'), expires_at, created_at FOR UPDATE`;
    - allocate greedily, or throw `AppError(402, "INSUFFICIENT_CREDITS", "Not enough credits")`;
    - throw a plain `Error` if `amount` isn't a positive integer.
  - `captureCredits(trx, jobId: string): Promise<number>` and `releaseCredits(trx, jobId: string): Promise<number>`. Each compare-and-sets allocations from `reserved` and returns the credits moved (0 on a replay). Capture doesn't check expiry.
  - `convertToCarryover(trx, p: { userId: string; closingSubscriptionId: string; t: Date; carryoverDays: number }): Promise<number>`: the plans spec §5.4 query, restricted to grants whose subscription's plan has `amount > 0`. It writes a ledger `convert` row for each grant and returns the count.
  - `endGrantsOfSubscription(trx, subscriptionId: string, now: Date): Promise<void>`: `expires_at = LEAST(expires_at, now)`.
  - `type CreditSummary = { available: number; reserved: number; grants: { kind: GrantRow["kind"]; remaining: number; expiresAt: Date }[] }`.
  - `getCreditSummary(db, userId: string, now: Date): Promise<CreditSummary>`. It lists spendable grants in spending order, and `reserved` sums all of the user's grants.
  - CLI `npm run credits:grant -- <userId> <n> <days>`: inserts a `manual` grant `now → now + days` and prints the grant id.

- [ ] **Step 1: Write failing tests.** `t0 = 2026-03-10T12:00:00Z`; each test uses fresh profile, subscription, grant and job rows from the factories.

```ts
it("spends plan grants first, then others by soonest expiry", async () => {
  // addonA 100 exp t0+5d, plan P 50 exp t0+20d, carryover C 30 exp t0+2d, addonB 100 exp t0+10d
  const a = await tx((trx) => reserveCredits(trx, { userId, jobId, amount: 120, now: t0 }));
  expect(a.map((x) => [grantName(x.grant_id), x.amount])).toEqual([["P", 50], ["C", 30], ["addonA", 40]]);
});
it("never spends expired or not-yet-started grants");          // plan exp t0-1m, addon starts t0+1d → rejects 402 INSUFFICIENT_CREDITS
it("rolls back fully when credits are short");                 // 40 available, ask 50 → 402; every grant reserved=0; no allocations
it("concurrent reservations never overspend", async () => {   // grants total 100; 10 parallel reserves of 15 on separate transactions
  expect(succeeded).toBe(6); expect(sumReserved).toBe(90);
});
it("capture moves reserved to used even after the grant expired"); // reserve 30 at t0, capture with grant exp < now → used 30, reserved 0, returns 30
it("a second capture or a release after capture is a no-op");      // second capture → 0; release → 0; grant unchanged
it("release gives credits back");                                  // reserved 0, used 0, allocation status "released"
it("carryover extends to at least t + 30 days and never shortens", async () => {
  // monthly grant exp t0+5d → carryover exp t0+30d; yearly grant exp t0+200d → carryover exp t0+200d; converted_at = t0; 2 ledger "convert" rows
});
it("carryover includes the closing row's already-expired grant");  // closing sub grant exp t0-2h → kind carryover, exp t0+30d
it("carryover skips Free, addon, manual, carryover and other expired plan grants");
it("carryover never chains");                                      // convert at t0 → exp t0+30d; convert again at t0+10d → still t0+30d
it("endGrantsOfSubscription shortens to now but never lengthens"); // exp t0+20d → t0; exp t0-1d → unchanged
it("summarises available, reserved and grants in spending order");
it("rejects a non-integer or non-positive amount");                // 0, -1, 1.5 → throws
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/db/credits.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `credits.repo.ts`, the factories and the CLI script.** The concurrency test needs `DB_POOL_MAX` of at least 10 for `testDb`; set the pool to 10 in `helpers/db.ts`.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(credits): grants with reserve, capture, release and carryover"
```

---

### Task 7: Subscriptions core, signup on Free, `GET /v1/me`

**Files:**
- Create: `src/db/repositories/profiles.repo.ts`, `src/db/repositories/subscriptions.repo.ts`, `src/services/billing/subscriptions.ts`, `src/api/middlewares/ensureUser.ts`, `src/api/routes/me.ts`
- Modify: `src/api/server.ts` (mount `meRouter`), `test/helpers/factories.ts` (add `createUserOnPlan`)
- Test: `test/services/billing/subscriptions.test.ts`, `test/api/me.test.ts`

**Interfaces:**
- Consumes: Task 4 `getPlanByName`/`getPlanById`; Task 5 `planGrantExpiry`; Task 6 `insertGrant`, `convertToCarryover`, `endGrantsOfSubscription` and `getCreditSummary`; Task 1 `addMonths`.
- Produces:
  - `profiles.repo.ts`:
    - `upsertProfile(db, p: { id: string; email: string | null }): Promise<void>` (`ON CONFLICT (id) DO NOTHING`);
    - `getProfile(db, id): Promise<ProfileRow | null>`;
    - `lockProfile(trx, id): Promise<ProfileRow>`;
    - `setPaddleCustomerId(db, id, customerId): Promise<void>`.
  - `subscriptions.repo.ts`:
    - `getActiveSubscription(db, userId): Promise<ActiveSubscription | null>`;
    - `getActiveByPaddleSubscriptionId(db, paddleSubscriptionId): Promise<ActiveSubscription | null>`;
    - `insertSubscription(trx, row: NewSubscription): Promise<SubscriptionRow | null>`. It returns `null` when the partial unique index rejects a second active row (`ON CONFLICT (user_id) WHERE active DO NOTHING`).
    - `closeSubscriptionRow(trx, id, p: { status: "renewed" | "upgraded" | "downgraded" | "canceled"; at: Date; paddleCancelPending: boolean }): Promise<void>`. It sets `active=false`, `canceled_at=at` and `current_period_end = LEAST(current_period_end, at)`.
    - `setNextPlan(trx, id, nextPlanId): Promise<void>`.
    - `applyPaddleState(trx, id, p: { paddleStatus: string; nextPlanId: string | null; occurredAt: Date }): Promise<boolean>`. It updates only `WHERE last_event_occurred_at IS NULL OR last_event_occurred_at < occurredAt`; a null `nextPlanId` keeps the current one. It returns whether it applied.
  - `subscriptions.ts`:
    - `ensureUser(deps, user: { id: string; email: string | null }): Promise<void>`. It upserts the profile. If the user has no active row, it opens a Free row (`now → addMonths(now, 1)`) and its grant. A losing race (`insertSubscription` returns null) is a no-op. A missing Free plan throws `Error("Free plan missing; run npm run seed")`.
    - `type OpenParams = { userId: string; plan: PlanWithCredits; periodStart: Date; periodEnd: Date; paddleSubscriptionId?: string | null; invoiceId?: string | null; previousSubscriptionId?: string | null; lastEventOccurredAt?: Date | null; paddleStatus?: string | null }`.
    - `openSubscription(trx, deps, p: OpenParams): Promise<SubscriptionRow>`. It inserts an `active` row with `next_plan_id = plan.id` and the `plan` grant (`starts_at = periodStart`, `expires_at = planGrantExpiry(...)`). It throws if a second active row is rejected.
    - `type MoveParams = { from: ActiveSubscription; toPlan: PlanWithCredits; status: "renewed" | "upgraded" | "downgraded" | "canceled"; t: Date; periodStart: Date; periodEnd: Date; paddleSubscriptionId: string | null; invoiceId: string | null; paddleCancelPending: boolean }`.
    - `moveToPlan(trx, deps, p: MoveParams): Promise<SubscriptionRow>`:
      1. Close `from` (`at = t`).
      2. Handle credits:
         - `from.plan` is Free and the status isn't `renewed` → `endGrantsOfSubscription(from.id, t)`;
         - the status is `upgraded` or `downgraded` and `from.plan` is paid → `convertToCarryover({ closingSubscriptionId: from.id, t, carryoverDays: CARRYOVER_VALIDITY_DAYS })`;
         - otherwise, keep the grants.
      3. Open the new row, with `previousSubscriptionId = from.id`. When the Paddle subscription id is unchanged, it inherits `last_event_occurred_at` and `paddle_status` from `from`.
  - `ensureUser` middleware: `ensureUser(deps): RequestHandler` (calls the service with `req.user`).
  - `meRouter(deps)`: `GET /v1/me` (`requireUser` then `ensureUser`) → `{ userId, email, credits: { available, reserved, grants: [{ kind, remaining, expiresAt }] }, subscription: { plan, display, interval, status, currentPeriodEnd, nextPlan, paddleStatus } }`. `nextPlan` is `null` when `next_plan_id === plan_id`.
  - Factory: `createUserOnPlan(deps, p: { userId?: string; planName: string; periodStart: Date; periodEnd: Date; paddleSubscriptionId?: string }): Promise<{ userId: string; sub: ActiveSubscription }>`. It creates the profile, then opens the row and its grant through `openSubscription`.

- [ ] **Step 1: Write failing tests**

```ts
// test/api/me.test.ts  (clock t0 = 2026-03-10T12:00:00Z)
it("first call creates the profile, a Free subscription and its grant", async () => {
  const res = await request(app).get("/v1/me").set(await authHeader(userId));
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ userId, email: "u@test.dev",
    credits: { available: 50, reserved: 0, grants: [{ kind: "plan", remaining: 50, expiresAt: "2026-04-10T13:00:00.000Z" }] },
    subscription: { plan: "free", display: "Free", interval: "monthly", status: "active", currentPeriodEnd: "2026-04-10T12:00:00.000Z", nextPlan: null, paddleStatus: null } });
});
it("five concurrent first calls create one Free subscription and one grant");
it("a token without email creates the profile with email null", ...);   // Review Focus 5 → body.email === null; profiles.email is null
it("returns 500 INTERNAL and logs when the Free plan is missing");

// test/services/billing/subscriptions.test.ts
it("moveToPlan upgraded from a paid plan converts leftovers to carryover");   // old grant kind carryover, exp GREATEST(old, t+30d); new row active with plan grant
it("moveToPlan from Free ends the Free grant at t");                          // Free grant expires_at === t
it("moveToPlan renewed keeps the old grant untouched");
it("moveToPlan canceled keeps the old grant untouched");
it("moveToPlan sets paddle_cancel_pending on the closed row when asked");
it("the new row inherits last_event_occurred_at and paddle_status on the same Paddle subscription");
it("the closed row's current_period_end is cut to t, never extended");
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/api/me.test.ts test/services/billing/subscriptions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the repositories, service, middleware, router and factory.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): Free plan on signup, subscription moves and /v1/me"
```

---

### Task 8: Paddle client, webhook parsing and FakePaddle

**Files:**
- Modify: `src/clients/paddle.ts` (full interface + SDK implementation)
- Create: `src/clients/paddleEvents.ts`, `test/fixtures/paddle/transaction.completed.json`, `subscription.updated.json`, `subscription.canceled.json` (the snake_case payloads Paddle sends)
- Modify: `test/fakes/paddle.ts`, `test/helpers/paddleEvents.ts`
- Test: `test/clients/paddleEvents.test.ts`, `test/clients/paddleSignature.test.ts`

**Interfaces:**
- Produces:
  - `type PaddleSubscriptionState = { id: string; status: string; priceId: string | null; periodEnd: Date | null; scheduledChange: { action: "cancel" | "pause" | "resume"; effectiveAt: Date } | null }`.
  - `interface PaddleClient`:
    - `createCustomer(email: string | null): Promise<{ id: string }>`;
    - `createProduct(p: { name: string; customData: Record<string, string> }): Promise<{ id: string }>`;
    - `createPrice(p: { productId: string; name: string; amountCents: string; currency: string; interval: "month" | "year" | null }): Promise<{ id: string }>`;
    - `createTransaction(p: { customerId: string; priceId: string; customData: Record<string, string> }): Promise<{ id: string; checkoutUrl: string | null }>`;
    - `getSubscription(id: string): Promise<PaddleSubscriptionState>`;
    - `updateSubscriptionPrice(id: string, priceId: string): Promise<void>`;
    - `removeScheduledChange(id: string): Promise<void>`;
    - `cancelSubscription(id: string, effectiveFrom: "immediately" | "next_billing_period"): Promise<void>`;
    - `verifyWebhook(rawBody: string, signature: string | undefined): Promise<boolean>`.
  - `class PaddleProviderError extends Error`: every SDK failure is wrapped in it.
  - `createPaddleClient(config: Config): PaddleClient`, using `new Paddle(PADDLE_API_KEY, { environment: PADDLE_ENV === "production" ? Environment.production : Environment.sandbox })`:

    | Method | SDK call |
    |---|---|
    | `createCustomer` | `customers.create({ email })`. On a conflict error, `customers.list({ email: [email] })`, then take the first. This path runs only against Paddle; it's checked in the Task 14 sandbox run. |
    | `createProduct` | `products.create({ name, taxCategory: "standard", customData })` |
    | `createPrice` | `prices.create({ productId, name, description: name, unitPrice: { amount: amountCents, currencyCode: currency }, billingCycle })`. `billingCycle` is `{ interval, frequency: 1 }`, and is omitted when `interval` is null. |
    | `createTransaction` | `transactions.create({ items: [{ priceId, quantity: 1 }], customerId, customData, collectionMode: "automatic" })` → `{ id, checkoutUrl: checkout?.url ?? null }` |
    | `updateSubscriptionPrice` | `subscriptions.update(id, { items: [{ priceId, quantity: 1 }], prorationBillingMode: "do_not_bill" })` |
    | `removeScheduledChange` | `subscriptions.update(id, { scheduledChange: null })` |
    | `cancelSubscription` | `subscriptions.cancel(id, { effectiveFrom })` |
    | `verifyWebhook` | `await webhooks.unmarshal(rawBody, PADDLE_WEBHOOK_SECRET, signature)`. Any throw or a falsy result → `false`. |

  - `paddleEvents.ts`:
    - `type PaddleTxn = { id: string; origin: string; status: string; subscriptionId: string | null; customData: Record<string, unknown> | null; priceId: string | null; totalCents: string; currency: string; billingPeriod: { startsAt: Date; endsAt: Date } | null }`;
    - `type PaddleSub = { id: string; status: string; priceId: string | null; scheduledChange: { action: string; effectiveAt: Date } | null; canceledAt: Date | null }`;
    - `type PaddleEvent = { eventId: string; eventType: string; occurredAt: Date } & ({ kind: "transaction"; txn: PaddleTxn } | { kind: "subscription"; sub: PaddleSub } | { kind: "other" })`;
    - `parsePaddleEvent(json: unknown): PaddleEvent`. Zod reads the snake_case payload: `transaction.*` → transaction, `subscription.*` → subscription, anything else → other. `priceId` is `items[0]?.price.id ?? null`. It throws `ZodError` on a malformed known event.
  - `FakePaddle implements PaddleClient`:
    - `calls: Array<{ method: string; args: unknown[] }>`;
    - `subscriptions: Map<string, PaddleSubscriptionState>`, which `getSubscription` reads and which the mutations update in the obvious way;
    - `failNext(method: keyof PaddleClient, times = 1)` (throws `PaddleProviderError`) and `hangNext(method, ms)`;
    - `delay(ms)` for every call;
    - an incrementing id per kind (`ctm_1`, `pro_1`, `pri_1`, `txn_1`), with `checkoutUrl` `https://checkout.test/txn_1`;
    - `verifyWebhook` delegates to the real SDK `webhooks.unmarshal`, using the secret `"test_secret"`.
  - `test/helpers/paddleEvents.ts`:
    - `signPaddle(rawBody: string, secret?: string, ts?: number): string` returns `ts=<ts>;h1=<hex HMAC-SHA256 of "ts:rawBody">`;
    - `postPaddle(app, payload: object, opts?: { signature?: string }): Promise<supertest.Response>`;
    - builders `txnCompleted(p)`, `subscriptionUpdated(p)`, `subscriptionCanceled(p)`, `subscriptionPastDue(p)` and `subscriptionPaused(p)`, each returning a full snake_case payload with a unique `event_id`.

- [ ] **Step 1: Write failing tests**

```ts
// test/clients/paddleSignature.test.ts — uses FakePaddle.verifyWebhook (real SDK)
it("accepts a correct signature", async () => expect(await fake.verifyWebhook(body, signPaddle(body))).toBe(true));
it.each([["missing", undefined], ["wrong secret", signPaddle(body, "nope")], ["tampered body", "sig-of-other-body"]])
  ("rejects %s", async (_, sig) => expect(await fake.verifyWebhook(body, sig)).toBe(false));

// test/clients/paddleEvents.test.ts
it("parses transaction.completed", () => expect(parsePaddleEvent(fixture("transaction.completed"))).toMatchObject({
  kind: "transaction", eventType: "transaction.completed",
  txn: { id: "txn_01", origin: "api", subscriptionId: "sub_01", priceId: "pri_01", totalCents: "1000",
         billingPeriod: { startsAt: new Date("2026-03-10T12:00:00Z"), endsAt: new Date("2026-04-10T12:00:00Z") } } }));
it("parses subscription.updated with a scheduled cancel", ...);   // sub.scheduledChange.action === "cancel"
it("treats unknown event types as other", ...);
it("throws on a malformed transaction.completed", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/clients`
Expected: FAIL.

- [ ] **Step 3: Implement** `paddle.ts`, `paddleEvents.ts`, the fixtures, `FakePaddle` and the helpers. Update `makeDeps` so `deps.paddle` is the `FakePaddle` and `config.PADDLE_WEBHOOK_SECRET = "test_secret"`.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(paddle): client, webhook parsing and test fake"
```

---

### Task 9: Checkout, Paddle registration and add-on purchase API

**Files:**
- Create: `src/db/repositories/invoices.repo.ts`, `src/services/billing/checkout.ts`, `src/api/routes/billing.ts`
- Modify: `src/api/server.ts` (mount `billingRouter`)
- Test: `test/services/billing/checkout.test.ts`, `test/api/billing.addons.test.ts`

**Interfaces:**
- Consumes: Task 4 catalog repo; Task 5 `toCents` and `paddleInterval`; Task 7 profiles repo and `ensureUser` middleware; Task 8 `PaddleClient` and `PaddleProviderError`.
- Produces:
  - `invoices.repo.ts`:
    - `insertDraftInvoice(db, p: { user_id; item_type: "plan" | "addon"; item_id; change_type: "new" | "upgrade" | "downgrade" | null; from_subscription_id: string | null; amount: string; currency: string }): Promise<InvoiceRow>`;
    - `attachTransaction(db, id, p: { paddle_transaction_id: string; checkout_url: string | null }): Promise<void>`;
    - `cancelInvoice(db, id): Promise<void>`;
    - `findReusableDraft(db, p: { userId; itemType; itemId; since: Date }): Promise<InvoiceRow | null>`: status `draft`, `paddle_transaction_id` not null, `created_at >= since`, newest first;
    - `getInvoice(trx, id): Promise<InvoiceRow | null>`;
    - `markInvoicePaid(trx, id, p: { paddleTransactionId: string; paddleSubscriptionId: string | null; billingPeriod: { startsAt: Date; endsAt: Date } | null; origin: string; amountCents: string; currency: string; paidAt: Date }): Promise<InvoiceRow | null>`: compare-and-set from `draft` **or `canceled`** to `paid`, and `null` if the row is already `paid`;
    - `insertPaidInvoice(trx, p: { user_id; item_type: "plan"; item_id; origin; paddle_transaction_id; paddle_subscription_id; amount: string; currency; billing_period_start; billing_period_end; paid_at }): Promise<InvoiceRow | null>`: `ON CONFLICT (paddle_transaction_id) DO NOTHING`, `null` on conflict;
    - `listPaidInvoices(db, userId): Promise<InvoiceRow[]>`, newest `paid_at` first;
    - `cancelDraftsBefore(db, before: Date): Promise<number>`.

    Amounts in the DB are dollars, so convert `amountCents` back with `/100` using string math.
  - `checkout.ts`:
    - `ensurePaddleCustomer(deps, userId: string): Promise<string>`: creates one once and stores it on the profile;
    - `ensurePaddlePrice(deps, kind: "plan" | "addon", id: string): Promise<string>`: inside a transaction, `lockCatalogRow`. If the ids are missing, it calls `createProduct` (customData `{ itemId, itemType }`) and then `createPrice` (`amountCents: toCents(amount)`, `interval: plan ? paddleInterval(plan) : null`, `name: `${display} ${interval ?? "Addon"}``), and saves them with `setPaddleIds`;
    - `type CheckoutResult = { action: "checkout"; transactionId: string; checkoutUrl: string | null }`;
    - `openCheckout(deps, p: { userId: string; itemType: "plan" | "addon"; itemId: string; changeType: "new" | "upgrade" | "downgrade" | null; fromSubscriptionId: string | null }): Promise<CheckoutResult>`:
      1. If there's a reusable draft since `now - CHECKOUT_REUSE_MINUTES`, return it.
      2. Otherwise, insert a draft, call `createTransaction` with `customData { userId, invoiceId, checkout: "true" }`, and call `attachTransaction`.
      3. Any `PaddleProviderError` → `cancelInvoice`, then throw `AppError(502, "PAYMENT_PROVIDER_ERROR", "Payment provider error")`.
    - `buyAddon(deps, userId: string, addonName: string): Promise<CheckoutResult>`: an unknown, archived or custom add-on throws `AppError(422, "ADDON_NOT_AVAILABLE", ...)`.
  - `billingRouter(deps)`. All routes use `requireUser` then `ensureUser`; this task adds:
    - `POST /v1/billing/addons` with body `{ addon: string }`;
    - `GET /v1/billing/invoices` → `[{ id, itemType, item, amount, currency, status, paidAt }]`, where `item` is the plan or add-on `name`.

- [ ] **Step 1: Write failing tests**

```ts
// test/api/billing.addons.test.ts
it("opens a Paddle checkout for an add-on", async () => {
  const res = await post("/v1/billing/addons", { addon: "credits_1000" });
  expect(res.body).toEqual({ action: "checkout", transactionId: "txn_1", checkoutUrl: "https://checkout.test/txn_1" });
  const inv = await testDb(T.invoices).first();
  expect(inv).toMatchObject({ item_type: "addon", status: "draft", paddle_transaction_id: "txn_1", amount: "20.00" });
  expect(paddle.calls.find((c) => c.method === "createTransaction")!.args[0])
    .toMatchObject({ customerId: "ctm_1", priceId: "pri_1", customData: { userId, invoiceId: inv.id, checkout: "true" } });
});
it("registers the customer and the one-time price once", ...);      // two buys of the same add-on (after the reuse window) → createCustomer ×1, createProduct ×1, createPrice ×1 with interval null, amountCents "2000"
it("prices 9.99 as 999 cents", ...);                                 // Review Focus 4: credits_999c → createPrice amountCents "999"
it("reuses an unpaid checkout within 30 minutes, not after", ...);   // +29 min → same txn, createTransaction ×1; +31 min → txn_2
it("returns 502 PAYMENT_PROVIDER_ERROR and cancels the draft when Paddle fails", ...);
it.each(["nope", "archived_addon"])("rejects %s with 422 ADDON_NOT_AVAILABLE", ...);
it("lists only paid invoices, newest first", ...);                   // two paid + one draft → 2 rows

// test/services/billing/checkout.test.ts
it("concurrent first purchases create one Paddle price", ...);       // fake.delay(50); two parallel ensurePaddlePrice → createPrice ×1, both return pri_1
it("a plan price is recurring", ...);                                // pro_yearly → createPrice interval "year", amountCents "30000"
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/api/billing.addons.test.ts test/services/billing/checkout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `invoices.repo.ts`, `checkout.ts` and the two routes.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): Paddle checkout, catalog registration and add-on purchase"
```

---

### Task 10: Plan change requests, preview and revert

**Files:**
- Create: `src/services/billing/planChange.ts`
- Modify: `src/api/routes/billing.ts`
- Test: `test/api/billing.subscription.test.ts`

**Interfaces:**
- Consumes: Task 5 rules; Task 7 `getActiveSubscription`, `setNextPlan` and `moveToPlan`; Task 9 `openCheckout` and `ensurePaddlePrice`; Task 8 `PaddleClient`.
- Produces:
  - `type PlanChangeResult = CheckoutResult | { action: "scheduled"; effectiveAt: Date } | { action: "reverted" } | { action: "canceled" }`.
  - `previewPlanChange(deps, userId: string, planName: string): Promise<{ changeType: ChangeType; action: Action; effectiveAt: Date; description: string }>`. It runs the same steps as `requestPlanChange` up to working out the action, without any Paddle mutation. `effectiveAt` is `now` or the period end.
  - `requestPlanChange(deps, userId: string, planName: string): Promise<PlanChangeResult>`, following plans spec §6.2 steps 1–8:
    - **Step 1:** an unknown, custom or archived plan → `422 PLAN_NOT_AVAILABLE`.
    - **Step 2:** `same` → revert if a change is scheduled, else `409 ALREADY_ON_PLAN`.
    - **Step 3:** for a paid active row, `live = await paddle.getSubscription(paddle_subscription_id)`. A change is scheduled when `live.scheduledChange?.action === "cancel"` or `live.priceId !== plan.paddle_price_id`.
    - **Step 4:** `0 < live.periodEnd - now < PLAN_CHANGE_LOCK_MINUTES` → `409 RENEWAL_IN_PROGRESS`.
    - **Step 5:** `live.status === "past_due"`:
      - a `period_end` downgrade → `409 PAYMENT_PAST_DUE`;
      - `cancel` → `cancelSubscription(id, "immediately")`, then `moveToPlan` to Free right away (`status "canceled"`, `t = now`, period `now → addMonths(now,1)`), returning `{ action: "canceled" }`;
      - `now` changes → checkout as normal.
    - **`now`:** `openCheckout({ itemType: "plan", itemId, changeType, fromSubscriptionId })`.
    - **`period_end` downgrade:**
      1. If `live.scheduledChange`, call `removeScheduledChange`.
      2. Call `updateSubscriptionPrice(target price)`.
      3. If step 2 fails after step 1 ran, call `cancelSubscription(id, "next_billing_period")` to restore, then throw 502.
      4. `setNextPlan(target)`.
    - **`cancel`:**
      1. If `live.priceId !== current price`, call `updateSubscriptionPrice(current price)`.
      2. Call `cancelSubscription(id, "next_billing_period")`.
      3. If step 2 fails after step 1 ran, call `updateSubscriptionPrice(live.priceId)` to restore, then throw 502.
      4. `setNextPlan(free.id)`.
    - Return `{ action: "scheduled", effectiveAt: live.periodEnd }`.

    Make sure the target plan has a Paddle price first (`ensurePaddlePrice`).
  - `revertScheduledChange(deps, userId: string): Promise<void>`:
    - No scheduled change (per the live state) → `409 NO_SCHEDULED_CHANGE`.
    - Otherwise: a scheduled cancel → `removeScheduledChange`; a changed price → `updateSubscriptionPrice(current)`. Then `setNextPlan(plan_id)`.
  - Routes:
    - `GET /v1/billing/subscription/preview?plan=` (query `{ plan: string }`);
    - `POST /v1/billing/subscription` with body `{ plan: string }`, where `reverted` is returned as `200 { action: "reverted" }`;
    - `DELETE /v1/billing/subscription/scheduled-change` → `200 { subscription }`, the same shape as `/v1/me`'s `subscription`.

- [ ] **Step 1: Write failing tests.** Users come from `createUserOnPlan`. Paid users get `sub_01`, with `FakePaddle.subscriptions` seeded as status `active`, the current price and period end `t0 + 20d`.

```ts
it.each([
  ["free", "starter_monthly", "new"], ["starter_monthly", "pro_monthly", "upgrade"], ["pro_yearly", "pro_monthly", "downgrade"],
])("%s → %s opens a checkout (%s)", ...);   // body.action "checkout"; invoice.change_type matches; from_subscription_id = active row
it("pro_monthly → starter_monthly is scheduled with do_not_bill", async () => {
  expect(res.body).toEqual({ action: "scheduled", effectiveAt: "2026-03-30T12:00:00.000Z" });
  expect(paddle.calls.at(-1)).toEqual({ method: "updateSubscriptionPrice", args: ["sub_01", starterPriceId] });
  expect(active.next_plan_id).toBe(P.starter_monthly.id);
});
it("pro_monthly → free schedules a cancel at period end", ...);     // cancelSubscription("sub_01","next_billing_period"); next_plan_id = free
it("same plan with nothing scheduled → 409 ALREADY_ON_PLAN", ...);
it("same plan with a scheduled downgrade reverts it", ...);         // { action: "reverted" }; updateSubscriptionPrice(sub_01, proPrice); next_plan_id = plan_id
it.each(["nope", "archived_plan", "custom_plan"])("%s → 422 PLAN_NOT_AVAILABLE", ...);
it("59 minutes before renewal → 409 RENEWAL_IN_PROGRESS; 61 minutes → allowed", ...);  // live periodEnd = now + 59m / + 61m
it("past due: a scheduled downgrade → 409 PAYMENT_PAST_DUE", ...);
it("past due: an upgrade opens a checkout", ...);
it("past due: cancel is immediate and moves to Free with nothing carried over", ...);   // cancelSubscription(sub_01,"immediately"); active plan free; old grant not carryover
it("reads the live Paddle state: a cancel made in Paddle is cleared before a downgrade", ...); // live.scheduledChange cancel, DB next = plan → removeScheduledChange then updateSubscriptionPrice
it("undoes the first Paddle call when the second fails (downgrade)", ...);  // scheduled cancel + failNext("updateSubscriptionPrice") → cancelSubscription(next_billing_period) re-applied; 502; DB unchanged
it("undoes the first Paddle call when the second fails (cancel)", ...);     // scheduled downgrade + failNext("cancelSubscription") → updateSubscriptionPrice(back to starter); 502; DB unchanged
it("DELETE scheduled-change without one → 409 NO_SCHEDULED_CHANGE", ...);
it("DELETE scheduled-change undoes a scheduled cancel", ...);       // removeScheduledChange("sub_01"); next_plan_id = plan_id
it("preview describes without calling Paddle mutations", ...);      // pro_monthly→starter_monthly: { changeType:"downgrade", action:"period_end", effectiveAt, description: "You'll be moved to the Starter plan at the end of your current billing cycle." }; calls only getSubscription
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/api/billing.subscription.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `planChange.ts` and the three routes.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): plan change requests, preview and revert"
```

---

### Task 11: Paddle webhook, checkout completion and post-commit cancel

**Files:**
- Create: `src/db/repositories/paymentEvents.repo.ts`, `src/db/repositories/customerAddons.repo.ts`, `src/services/billing/paddleWebhook.ts`, `src/services/billing/paddleCancel.ts`, `src/api/routes/webhooks.ts`
- Modify: `src/api/server.ts` (mount `webhooksRouter` **before** any JSON parser, using `express.raw({ type: "*/*", limit: "1mb" })`), `src/db/repositories/subscriptions.repo.ts` (add `clearPendingCancel`)
- Test: `test/api/webhooks.checkout.test.ts`

**Interfaces:**
- Consumes: Task 8 `parsePaddleEvent` and `PaddleClient`; Task 9 `getInvoice` and `markInvoicePaid`; Task 7 `moveToPlan`, `lockProfile` and `getActiveSubscription`; Task 6 `insertGrant`; Task 4 `getPlanById` and `getAddonById`.
- Produces:
  - `recordPaymentEvent(trx, p: { paddleEventId: string; eventType: string; occurredAt: Date; payload: unknown }): Promise<boolean>` (`ON CONFLICT DO NOTHING`; `true` if new) and `markEventProcessed(trx, paddleEventId: string, at: Date): Promise<void>`.
  - `insertCustomerAddon(trx, p: { user_id; addon_id; invoice_id: string | null; bought_at: Date; expires_at: Date }): Promise<CustomerAddonRow>`.
  - `clearPendingCancel(db, subscriptionId: string): Promise<void>`.
  - `handlePaddleWebhook(deps, rawBody: string, signature: string | undefined): Promise<200 | 401>`:
    1. If `verifyWebhook` fails → 401.
    2. `parsePaddleEvent(JSON.parse(rawBody))`. A parse failure → ERROR log and 200.
    3. In one transaction: `recordPaymentEvent`. A duplicate → commit and return 200. Otherwise, `const toCancel = await routeEvent(trx, deps, event)`, then `markEventProcessed`.
    4. After commit: `Promise.race([Promise.allSettled(toCancel.map((id) => cancelReplacedSubscription(deps, id))), sleep(3000)])`.
    5. Return 200.
  - `routeEvent(trx, deps, event: PaddleEvent): Promise<string[]>`. It returns the ids of closed subscription rows that need a Paddle cancel. Routing follows the plans spec §6.3 table:
    - This task implements the `api` + `checkout` branch.
    - `subscription_recurring` and `subscription.*` call the handlers added in Task 12, which are stubbed to `[]` here.
    - `subscription_payment_method_change`, `subscription_update`, other origins and other events are kept only as the `payment_events` row, with an info log. The `invoices` table holds only purchases and renewals.
  - `completeCheckout(trx, deps, txn: PaddleTxn): Promise<string[]>`:
    - The invoice comes from `txn.customData.invoiceId`. If it's missing or unknown, or `customData.userId !== invoice.user_id`, log an ERROR and return `[]`.
    - `markInvoicePaid` returning `null` (a replay) → `[]`.
    - **Plan:** `lockProfile`, then load the **current** active row A.
      - `txn.subscriptionId` is null → throw (Paddle retries).
      - Status = `getChangeType(A.plan, newPlan, config.FREE_PLAN_NAME)`: `upgrade`/`new` → `upgraded`, `downgrade` → `downgraded`. `same` happens only for a duplicate purchase; treat it as `upgraded`.
      - Period = `txn.billingPeriod`, or `now → addMonths(now, interval === "yearly" ? 12 : 1)`.
      - `moveToPlan({ from: A, toPlan, status, t: now, paddleSubscriptionId: txn.subscriptionId, invoiceId, paddleCancelPending: !!A.paddle_subscription_id && A.paddle_subscription_id !== txn.subscriptionId })`.
      - Return `[A.id]` if flagged.
    - **Add-on:** `insertCustomerAddon` (`bought_at = now`, `expires_at = addDays(now, duration_days)`), then `insertGrant` (kind `addon`, the same window). Return `[]`.
  - `cancelReplacedSubscription(deps, subscriptionRowId: string): Promise<boolean>`:
    1. Load the row; if it isn't flagged → `true`.
    2. `live = getSubscription`. If `live.status === "canceled"`, clear the flag and return `true`.
    3. If `live.scheduledChange`, call `removeScheduledChange`.
    4. Call `cancelSubscription(id, "immediately")`, then `clearPendingCancel`, and return `true`.
    5. If any call throws, log at WARN and return `false`.
  - `webhooksRouter(deps)`: `POST /webhooks/paddle`. It reads the `Paddle-Signature` header and responds with the returned status and an empty body.

- [ ] **Step 1: Write failing tests.** Payloads come from `test/helpers/paddleEvents.ts`; checkouts are opened through the Task 9 and 10 APIs first.

```ts
it("rejects a bad signature with 401 and records nothing", ...);
it("processes a duplicate event id once", ...);                     // same payload twice → both 200; one payment_events row; one grant
it("Free → Starter: closes Free, ends its grant, opens Starter with a fresh grant", async () => {
  expect(freeRow).toMatchObject({ status: "upgraded", active: false, current_period_end: t0 });
  expect(freeGrant.expires_at).toEqual(t0);
  expect(newRow).toMatchObject({ plan_id: P.starter_monthly.id, active: true, paddle_subscription_id: "sub_01",
    current_period_start: billingStart, current_period_end: billingEnd });
  expect(newGrant).toMatchObject({ kind: "plan", total: 500, expires_at: addMinutes(billingEnd, 60) });
  expect(invoice.status).toBe("paid");
});
it("Starter → Pro carries leftovers over and cancels the old Paddle subscription", ...);
  // old row "upgraded", old grant kind "carryover" exp GREATEST(old exp, t0+30d); calls include cancelSubscription("sub_old","immediately"); flag cleared
it("pro_yearly → pro_monthly keeps the longer yearly expiry on the carryover", ...);   // old exp t0+300d → carryover exp t0+300d; status "downgraded"
it("a replayed completion with a new event id grants once", ...);
it("two paid checkouts leave one active row and flag both old subscriptions", ...);   // Starter→pro_monthly (txn_1, sub_B) then →pro_yearly (txn_2, sub_C): one active row (pro_yearly); cancelSubscription called for sub_A and sub_B
it("completes an add-on purchase with its own expiry", ...);        // customer_addons bought_at t0, expires_at t0+30d; grant kind "addon" total 1000 same window; replay → no second grant
it("honours a checkout paid after the sweep canceled its draft", ...);  // invoice status canceled → paid; grant created
it("records and ignores an api transaction we didn't create", ...);     // Review Focus 1: custom_data {} and custom_data { invoiceId: unknown } → 200; payment_events row; no grant; logs has severity ERROR
it("records a payment-method-change transaction and grants nothing", ...);  // origin subscription_payment_method_change → 200; payment_events row; no invoice, no grant
it("returns 200 within 3 s when the post-commit cancel hangs, and keeps the flag", ...);  // Review Focus 3: hangNext("cancelSubscription", 10000) → response < 3500 ms; paddle_cancel_pending true
it("keeps the flag when the post-commit cancel throws", ...);            // failNext("cancelSubscription") → 200; flag true
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/api/webhooks.checkout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the repositories, `paddleWebhook.ts` (with the Task 12 handlers stubbed), `paddleCancel.ts` and the router.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): Paddle webhook with checkout completion and old-subscription cancel"
```

---

### Task 12: Renewals, cancellations and Paddle-side changes

**Files:**
- Modify: `src/services/billing/paddleWebhook.ts` (replace the stubs)
- Test: `test/api/webhooks.subscription.test.ts`

**Interfaces:**
- Consumes: Task 11 `routeEvent`; Task 9 `insertPaidInvoice`; Task 7 `getActiveByPaddleSubscriptionId`, `moveToPlan` and `applyPaddleState`; Task 4 `getPlanByPaddlePriceId` and `getPlanByName`.
- Produces:
  - `getLatestByPaddleSubscriptionId(db, paddleSubscriptionId: string): Promise<SubscriptionRow | null>`, newest `created_at` first, in `subscriptions.repo.ts`.
  - The handlers below, all called from `routeEvent`. Each returns `Promise<string[]>`, which is always `[]`.
  - `handleRenewal(trx, deps, txn: PaddleTxn)`, following plans spec §6.5:
    1. `A = getActiveByPaddleSubscriptionId(txn.subscriptionId)`, and `plan = getPlanByPaddlePriceId(txn.priceId)`, which may be null.
    2. Work out the user: from A, or else from `getLatestByPaddleSubscriptionId`. If there's none, log an ERROR and return.
    3. `insertPaidInvoice` (`item_id = plan?.id ?? null`). `null` (a replay) → return.
    4. No A → ERROR log `renewal charged on a subscription that is no longer active` with `{ paddleSubscriptionId, transactionId }`, then return.
    5. `txn.billingPeriod.startsAt <= A.current_period_start` → return.
    6. `plan` is null → ERROR log for the unknown price, then return.
    7. If it's the same plan, call `moveToPlan` with status `renewed` and `t = startsAt`. Otherwise call it with `downgraded` and `t = billingPeriod.startsAt`. Both use the period from `billingPeriod`. If the price differs from `A.next_plan_id`, log an ERROR but still use the price.
  - `handleSubscriptionCanceled(trx, deps, sub: PaddleSub, occurredAt: Date)`. If the active row for `sub.id` exists, call `moveToPlan` to Free with status `canceled`, `t = sub.canceledAt ?? occurredAt`, period `t → addMonths(t, 1)` and no Paddle subscription. Otherwise do nothing.
  - `handleSubscriptionUpdated(trx, deps, sub: PaddleSub, occurredAt: Date)`, which also handles `subscription.past_due`:
    - Find the active row; if there isn't one, do nothing.
    - `nextPlanId`:
      - `sub.scheduledChange?.action === "cancel"` → the Free id;
      - `sub.priceId === row.plan.paddle_price_id` → `row.plan_id`;
      - otherwise `getPlanByPaddlePriceId(sub.priceId)?.id`, or `null` with an ERROR log.
    - Then `applyPaddleState({ paddleStatus: sub.status, nextPlanId, occurredAt })`.
  - `subscription.paused`: `applyPaddleState` with `paddleStatus "paused"` and `nextPlanId null`, plus an ERROR log `paused subscriptions are not supported`.

- [ ] **Step 1: Write failing tests**

```ts
it("a normal renewal opens a new period with fresh credits and leaves the old grant to expire", ...);
  // old row "renewed"; new row same plan, period from billing_period; new plan grant; old grant still kind "plan", unchanged expiry
it("a scheduled downgrade happens at renewal and carries leftovers over", ...);
  // A pro_monthly next=starter; renewal txn priceId starter, starts_at = A.period_end → A "downgraded"; old grant carryover exp starts_at+30d; new starter grant 500
it("carries over even when the webhook arrives after the old grant and its grace expired", ...);
  // clock = starts_at + 2h → carryover exp starts_at+30d (not now+30d)
it("measures a late recovery's carryover from the billed period's start", ...);   // clock = starts_at + 5d → exp starts_at+30d
it("ignores a replayed or out-of-order renewal", ...);              // same txn twice → one new row; starts_at <= current start → no change
it("logs and stops on an unknown price", ...);                      // invoice recorded; no new row; ERROR log
it("logs a renewal on a subscription that is no longer active", ...);  // Review Focus 2: renewal for sub_old after upgrade → no grant; invoice recorded; ERROR log with paddleSubscriptionId "sub_old"
it("subscription.canceled moves the user to Free with nothing carried over", ...);  // A "canceled"; Free row + grant; A's grant stays kind "plan"
it("subscription.canceled for an inactive row is ignored", ...);
it("subscription.updated mirrors a cancel scheduled in Paddle", ...);        // next_plan_id → free
it("subscription.updated mirrors a removed scheduled change", ...);          // next_plan_id → plan_id
it("subscription.updated mirrors a price changed in Paddle", ...);           // next_plan_id → starter
it("ignores an older subscription.updated that arrives late", ...);          // occurred_at older → unchanged
it("an older event is still ignored after a renewal on the same Paddle subscription", ...);  // new row inherited last_event_occurred_at
it("subscription.past_due sets paddle_status past_due", ...);
it("subscription.paused records the status and logs an ERROR", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/api/webhooks.subscription.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the handlers and wire them into `routeEvent`.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): renewals, cancellations and Paddle-side changes"
```

---

### Task 13: Billing sweep on the worker

**Files:**
- Create: `src/services/billing/sweep.ts`
- Modify: `src/worker/server.ts` (add `POST /tasks/billing-sweep`), `src/db/repositories/subscriptions.repo.ts` (add the listing queries)
- Test: `test/services/billing/sweep.test.ts`, `test/api/worker.test.ts`

**Interfaces:**
- Consumes: Task 7 `moveToPlan`; Task 9 `cancelDraftsBefore`; Task 11 `cancelReplacedSubscription`.
- Produces:
  - `listExpiredFreeRows(db, freePlanId: string, now: Date, limit: number): Promise<ActiveSubscription[]>`;
  - `listPendingCancels(db, limit: number): Promise<SubscriptionRow[]>`;
  - `listStuckRows(db, endedBefore: Date, limit: number): Promise<SubscriptionRow[]>`: active, paid and `current_period_end < endedBefore`, or `paddle_status = 'paused'`;
  - `type SweepCounts = { freeRenewed: number; cancelsRetried: number; cancelsCleared: number; draftsExpired: number; stuck: number }`;
  - `runBillingSweep(deps): Promise<SweepCounts>`, with batches of 500:
    - Renew each expired Free row in its own transaction: `moveToPlan` with status `renewed`, `t = now` and period `now → addMonths(now, 1)`.
    - Retry pending cancels. A row whose `canceled_at < now - 24h` that still fails is logged at ERROR.
    - `cancelDraftsBefore(now - 24h)`.
    - Log stuck rows (`endedBefore = now - 7d`) at ERROR.
  - The worker route `POST /tasks/billing-sweep` → `200 SweepCounts`.

- [ ] **Step 1: Write failing tests**

```ts
it("renews expired Free rows once with a fresh grant", ...);     // row ended t0-1h; sweep twice → one new Free row now→now+1 month; one new grant; counts.freeRenewed 1 then 0
it("leaves unexpired Free rows alone", ...);
it("retries a pending cancel and clears the flag", ...);         // cancelSubscription(sub, "immediately"); flag false; cancelsCleared 1
it("keeps the flag on failure and logs ERROR after 24 h", ...);  // canceled_at t0-25h + failNext → flag true; logs severity ERROR
it("clears the flag when Paddle already shows the subscription canceled", ...);
it("cancels drafts older than 24 h only", ...);                  // 25 h old → canceled; 23 h old → draft
it("logs stuck paid rows and paused rows at ERROR", ...);        // period ended t0-8d → ERROR; ended t0-6d → nothing
it("POST /tasks/billing-sweep returns the counts", ...);         // worker app → 200 { freeRenewed, cancelsRetried, cancelsCleared, draftsExpired, stuck }
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- test/services/billing/sweep.test.ts test/api/worker.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the sweep, the queries and the worker route.

- [ ] **Step 4: Run the tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(billing): hourly billing sweep on the worker"
```

---

### Task 14: Runbook and full verification

**Files:**
- Modify: `backend/README.md`
- Create: `backend/AGENTS.md`

`README.md` covers:
- **Run locally:** `nvm use`, `npm run db:up`, `npm run migrate`, `npm run seed`, `npm run dev:api` and `npm run dev:worker`.
- **Tests.**
- **Env table:** every Config key and what it's for.
- **Paddle sandbox setup:**
  - create an API key;
  - add a notification destination for `/webhooks/paddle` and copy its `pdl_ntfset_` secret into `PADDLE_WEBHOOK_SECRET`;
  - set a default payment link, which `checkoutUrl` needs;
  - set failed-payment handling to end in cancellation;
  - leave pausing off (plans spec §6.7).
- **Sandbox acceptance checklist:** plans spec §10 milestone 3, step by step, with the expected DB state after each step. Add one more step: a second user signing up with an email that already exists in Paddle reuses that Paddle customer.
- **Cloud Scheduler:** `/tasks/billing-sweep` needs an hourly job. That's set up in the deploy milestone, not here.

`AGENTS.md` covers:
- the layering rules;
- "SQL only in repositories";
- schema-qualified tables;
- the clock rule;
- the error codes;
- "run lint, typecheck and test before committing".

- [ ] **Step 1: Write `README.md` and `AGENTS.md`** with the contents above.

- [ ] **Step 2: Run the full verification**

Run: `cd backend && nvm use && npm ci && npm run lint && npm run typecheck && npm test && npm run build && docker build -t pixel-magic-backend . && docker compose up -d --build && sleep 8 && curl -fsS localhost:8080/_readyz && curl -fsS localhost:8081/_healthz && docker compose down`
Expected: every command succeeds, and both curls print `{"status":"ok"}`.

- [ ] **Step 3: Commit**

```bash
git add backend && git commit -m "docs(backend): runbook, Paddle sandbox setup and agent notes"
```
