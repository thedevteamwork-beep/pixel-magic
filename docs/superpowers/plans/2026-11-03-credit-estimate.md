# Pixel Magic backend — Tiered credits, estimate API and strict model schemas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Price every model with a Pixelbin-style `TIERED_CREDIT_MAPPING` over a fixed set of supported units.
- Add `POST /v1/credits/estimate`.
- Validate every model schema strictly, as jiraiya does, so unknown properties fail.

**Architecture:**
- A validated tier mapping (a default in code, which the `TIERED_CREDIT_MAPPING` env var can override) prices a job from "billing facts". The facts are the job's options plus unit values each model computes, such as `duration` in seconds.
- A single `estimateCredits()` is used both by the estimate API and by job creation, so the estimate always equals what a job reserves.
- A strict Zod meta-schema checks each model's `schema` when the registry loads. Request options are parsed strictly too.

**Tech Stack:** The existing backend: TypeScript, Express 5, Zod 4, Vitest. No new dependencies; the condition evaluator is our own.

**Spec / references:**
- User request, 2026-11-03.
- Pixelbin `fik-pixelbin` `TIERED_CREDIT_MAPPING` (e.g. `"Kling2.1Master":{"tiers":[{"name":"Basic","isDefault":true,"meters":[{"metric":"duration","unitSize":1,"rate":20,"round":"ceil"}]}]}`).
- Shin `calculateTierCredits` / `getHighestMatchedCredits`.
- jiraiya `POST /credits/estimate` and the meta-schema `models/jsonSchema/trasnsformationPrediction.jsonSchema.js`.
- Builds on `docs/superpowers/plans/2026-11-03-backend-generation.md` (Task 13 model layout).

## Global Constraints
- Work on branch `feat/backend-generation`. Commits end with the `Co-Authored-By:` line. Run one test process at a time. Every task ends with `npm test && npm run lint && npm run typecheck` passing.
- **Credits in our database are integers.** A job's cost is `Math.ceil` of the tier total, which can be fractional. Pixelbin charges fractions; we round up once, at the end.
- **Supported units** (`src/credits/units.ts`, fixed): `duration` (seconds) and `images` (count). A meter's `metric` must be one of them. Adding a unit means editing this file.
- **The mapping is validated at startup.** Each of these is a startup error that names the problem:
  - a registered model with no mapping entry;
  - a mapping entry for an unknown model;
  - zero, or more than one, `isDefault` tier;
  - a meter using a unit the model doesn't declare;
  - a condition `fact` that isn't one of the model's fact names;
  - any unknown property.
- **Tier selection:** tiers that are not default and have `conditions` are checked in ascending `priority` (a missing priority counts as 1; ties keep file order). The first match wins. Otherwise the default tier is used.
  - *Credits* = `tier.credits ?? 0` plus each meter's `round(value / unitSize) × rate`. `round` is `ceil` (the default), `floor`, `round` or `precise`.
  - This is Pixelbin's model, with priority made explicit: lower numbers are checked first.
- **Condition operators:** `equal`, `notEqual`, `greaterThan`, `greaterThanInclusive`, `lessThan`, `lessThanInclusive`, `in`, `notIn`. Nested `{ all: [...] }` / `{ any: [...] }` are allowed.
- **Default mapping** (`// TODO(pricing)`), chosen to keep today's prices:

  | Model | Tier | Meter |
  |---|---|---|
  | `kling21` | `Basic` (default) | `duration`, unitSize 1, rate 6, `ceil` (5 s → 30, 10 s → 60) |
  | `flux-schnell` | `Basic` (default) | `images`, unitSize 1, rate 1, `ceil` |

## Review Focus
1. **The estimate and the job charge always agree.** For the same model, options and upload count, `POST /v1/credits/estimate` `creditsPerJob` equals the `creditCost` `POST /v1/jobs` reserves. (Task 2)
2. **A fractional tier total is rounded up exactly once.** For example, rate 2.5 × 3 s = 7.5 → 8. It is never rounded down, and never rounded once per meter. (Task 2)
3. **A typo in a model schema or the mapping stops the app at startup** with a message naming the key, rather than failing for users later. (Tasks 1–2)
4. **An unknown option in a job or estimate request** (e.g. `{"durations":"5"}`) is rejected with `422 VALIDATION_FAILED` naming the key. Today it's silently dropped. (Task 1)
5. **A malformed `TIERED_CREDIT_MAPPING` env value** (bad JSON, or a negative rate) fails `loadConfig`, rather than falling back silently to the default. (Task 2)

---

### Task 1: Strict model schemas and strict options (like jiraiya's meta-schema)

**Files:**
- Create: `src/models/metaSchema.ts`, `test/models/metaSchema.test.ts`
- Modify: `src/models/types.ts`, `src/models/schemaGenerator.ts`, `src/models/registry.ts`, `src/api/routes/jobs.ts` (strict body)

**Interfaces:**
- **`metaSchema.ts`** exports `ModelSchemaShape`, a strict Zod schema, and `validateModelSchema(key: string, schema: unknown): ModelSchema`. The latter throws `Error("Model <key> schema invalid: <path>: <message>")`.
- **Allowed properties** (any other key fails):

  | Part | Allowed properties |
  |---|---|
  | `info` | `name`, `displayName`, `kind`, `category`, `description`, plus optional `bannerImage` and `logo` |
  | `input` field keys | must match `^[a-zA-Z0-9_]+$` |
  | `string` field | `type`, `description`, `enum`, `default`, `required`, `maxLength` |
  | `integer` field | `type`, `description`, `minimum`, `maximum`, `default` |
  | `boolean` field | `type`, `description`, `default` |
  | `image` field | `type`, `description`, `required`, `maxItems`, `supportedContentTypes` |
  | `output` | `description`, `mimeTypes` |
  | top level | `info`, `input`, `output`, `billing` |
  | `billing` | `units: SupportedUnit[]` (Task 2 adds the type; this task accepts `billing` as optional) |

  Also checked: `prompt` must exist and be a `string` field; there's at most one `image` field; an `enum` field's `default` must be one of the enum values; and `minimum ≤ default ≤ maximum`.
- **`registry.ts`** calls `validateModelSchema` for each model when the module loads, so the app fails at startup.
- **`optionsValidator(schema)`** returns a `.strict()` object, so an unknown option key gives a ZodError, which becomes 422. An optional `string` field with no `default` gets `.optional()`, which fixes Task 13's review minor 3.
- **`POST /v1/jobs`**: the body schema is `.strict()`, so an unknown top-level key gives 422.

- [ ] **Step 1: failing tests**

```ts
// test/models/metaSchema.test.ts
it("accepts both registered models", ...);                                        // validateModelSchema("kling21", kling21.schema) and flux
it.each([["info.bannerImg", ...], ["input.duration.defualt", ...], ["output.extra", ...], ["top-level extra", ...]])
  ("rejects an unknown property at %s with its path in the message", ...);
it("rejects a bad field key", ...);                 // "bad-key" → /input/
it("rejects a default outside the enum", ...);      it("rejects two image fields", ...);  it("rejects a missing prompt", ...);
// test/api/jobs.create.test.ts (add)
it("rejects an unknown option with 422 naming it", ...);   // options {durations:"5"} → 422 VALIDATION_FAILED, meta mentions "durations"; nothing reserved
it("rejects an unknown top-level body key with 422", ...);
```
- [ ] **Step 2:** Run `npm test -- test/models test/api/jobs.create.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(models): strict model-schema validation and strict options`.

---

### Task 2: Tiered credit mapping, supported units and `POST /v1/credits/estimate`

**Files:**
- Create: `src/credits/units.ts`, `src/credits/tieredCredits.ts`, `src/credits/defaultTieredCreditMapping.ts`, `src/services/credits/estimate.ts`, `src/api/routes/credits.ts`, `test/credits/tieredCredits.test.ts`, `test/api/credits.estimate.test.ts`
- Modify: `src/config.ts` (optional `TIERED_CREDIT_MAPPING`), `src/deps.ts` (`creditMapping`), `test/helpers/app.ts`, `src/models/types.ts` + both model folders (`billing.units`, `billingInputs`, `billingRange`; remove `creditCost`), `src/models/registry.ts` (`publicModel` → `credits: { min, max }`), `src/services/jobs/jobs.ts` (cost via `estimateCredits`), `src/api/server.ts`, `.env.example`, `README.md`

**Interfaces:**
- **`units.ts`:** `SUPPORTED_UNITS = { duration: { label: "seconds" }, images: { label: "images" } } as const` and `type SupportedUnit = keyof typeof SUPPORTED_UNITS`.
- **`tieredCredits.ts`:**
  - Strict Zod schemas `Meter`, `Condition` (recursive `all`/`any`, or `{ fact, operator, value }`), `Tier` and `TieredCreditMapping` (`Record<string, { tiers: Tier[] }>`).
  - `validateCreditMapping(mapping: unknown, models: ModelDefinition[]): TieredCreditMapping` applies the startup rules in Global Constraints.
  - `priceTier(entry, facts: BillingFacts): { tier: string; total: number; breakdown: { unit: SupportedUnit; quantity: number; units: number; rate: number; credits: number }[] }` follows the selection and credit rules.
- **Model additions** (in each model's `index.ts` / `requests.ts`):
  - `schema.billing.units: SupportedUnit[]` (kling21 `["duration"]`, flux `["images"]`).
  - `billingInputs(p: { options; uploadCount: number }): BillingFacts`, where `BillingFacts = Record<string, string | number | boolean>`. Facts are the options plus the unit values plus `image: uploadCount > 0`.
    - kling21 → `{ ...options, image, duration: Number(options.duration) }`.
    - flux → `{ ...options, image: false, images: options.num_images }`.
  - `billingRange(): { min: BillingFacts; max: BillingFacts }`, for kling21 duration 5 / 10 and for flux images 1 / 4.
  - `creditCost` is removed.
  - A model's fact names are its `input` keys plus its `billing.units` plus `image`.
- **`estimate.ts`:**
  - `estimateCredits(deps, model, p: { options: unknown; uploadCount: number }): { creditsPerJob: number; tier: string; breakdown }` parses the options strictly, builds the facts with `billingInputs`, calls `priceTier`, and sets `creditsPerJob = Math.ceil(total)`.
  - `creditRange(deps, model): { min: number; max: number }`.
- **Config:** `TIERED_CREDIT_MAPPING` is optional (a JSON string). When it's set it replaces the default mapping completely. `createDeps` validates whichever mapping is used: invalid JSON or a failed check throws at startup. `Deps.creditMapping` holds it.
- **Route:** `POST /v1/credits/estimate` is public, and its body is strict: `{ model: string; options?: object; uploadCount?: int 0–10 (default 0); count?: int 1–20 (default 1) }`.
  - It returns `200 { model, count, tier, creditsPerJob, totalCredits: creditsPerJob × count, breakdown: [{ unit, label, quantity, rate, credits }] }`.
  - An unknown model, bad options or an `uploadCount` above the model's `uploads.max` → 422.
- **`createJob`:** `credit_cost = estimateCredits(...).creditsPerJob`, the same function as the estimate.
- **`GET /v1/models`:** each model has `credits: { min, max }` instead of `creditCost`.

- [ ] **Step 1: failing tests**

```ts
// test/credits/tieredCredits.test.ts
it("uses the default tier's meter: kling21 5 s → 30, 10 s → 60", ...);
it("picks the first matching conditional tier by ascending priority", ...);  // two matching tiers, priority 1 wins over 2; no match → default
it.each(["equal","notEqual","greaterThan","greaterThanInclusive","lessThan","lessThanInclusive","in","notIn"])("supports %s", ...);
it("supports nested all/any", ...);
it.each([["ceil", 7.2, 8], ["floor", 7.8, 7], ["round", 7.5, 8], ["precise", 7.5, 7.5]])("rounds units with %s", ...);
it("adds base credits to meters", ...);                       // credits 2 + duration 5 × 1 → 7
it.each([["unknown unit metric", ...], ["unknown model key", ...], ["missing model", ...], ["two defaults", ...], ["no default", ...],
         ["unknown fact", ...], ["negative rate", ...], ["extra property", ...]])("rejects a mapping with %s", ...);
// test/api/credits.estimate.test.ts
it("estimates kling21 text-to-video 10 s", ...);    // { model:"kling21", options:{duration:"10"} } → creditsPerJob 60, tier "Basic", breakdown [{unit:"duration",label:"seconds",quantity:10,rate:6,credits:60}]
it("multiplies by count", ...);                     // count 3 → totalCredits 90
it("rounds a fractional total up once", ...);       // Review Focus 2: override mapping rate 2.5 → kling 5 s = 12.5 → 13
it("matches what createJob reserves", ...);         // Review Focus 1: same body → estimate.creditsPerJob === job.creditCost
it.each([["unknown model"], ["unknown option"], ["uploadCount above the model's max"], ["extra body key"]])("422 for %s", ...);
it("GET /v1/models shows the credit range", ...);   // kling21 { min: 30, max: 60 }, flux { min: 1, max: 4 }
// test/config.test.ts (add)
it("fails on an invalid TIERED_CREDIT_MAPPING", ...);   // Review Focus 5: "not json" and a negative rate → createDeps/loadConfig throws naming TIERED_CREDIT_MAPPING
```
- [ ] **Step 2:** Run `npm test -- test/credits test/api/credits.estimate.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Document `TIERED_CREDIT_MAPPING`, the supported units and the estimate endpoint in the README, and add a commented `TIERED_CREDIT_MAPPING=` example line to `.env.example`.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(credits): tiered credit mapping, supported units and estimate API`.

---

### Task 3: Each model's `requests.ts` makes its own fal calls (like jiraiya's `requestPrediction`)

Added 2026-11-03 at the user's request. The user chose: `requests.ts` calls the shared `clients/fal.ts` client, which keeps the one-attempt / no-retry / 30 s timeout / error rules in one place.

**Files:**
- Modify: `src/models/types.ts`, `src/models/kling21/requests.ts`, `src/models/kling21/index.ts`, `src/models/flux-schnell/requests.ts`, `src/models/flux-schnell/index.ts`, `src/services/jobs/generate.ts`, `src/services/jobs/falWebhook.ts`, `src/services/jobs/finalize.ts`, `src/services/jobs/reconcile.ts`
- Test: `test/models/models.test.ts`, plus whichever job tests assert fal call arguments

**Interfaces:**
- **`requests.ts` reads like jiraiya's.** It keeps its endpoint constants and a local `endpointFor(hasImage: boolean)`, and exports:
  - `requestPrediction({ fal, input, webhook }): Promise<{ requestId: string }>`.
    - `input` is `{ prompt, ...options, image?: <first input URL> }`.
    - It picks the endpoint from `input.image`, builds the fal payload (the same fields `buildInput` builds today), and returns `fal.submit(endpoint, payload, webhook)`.
  - `checkPredictionStatus({ fal, requestId, hasImage }): Promise<FalStatus>`, which calls `fal.status(endpointFor(hasImage), requestId)`.
  - `getPredictionResult({ fal, requestId, hasImage }): Promise<FalResult>` and `cancelPrediction({ fal, requestId, hasImage }): Promise<void>`, built the same way.
  - `parseOutput` (unchanged).
- **`ModelDefinition`:**
  - `falEndpoint` and `buildInput` are replaced by those four functions. `parseOutput` stays.
  - `PredictionInput = { prompt: string; image?: string } & Record<string, unknown>`.
- **Callers:**
  - `generate.ts` submits and cancels through the model.
  - `falWebhook.ts`, `finalize.ts` and `reconcile.ts` use `model.checkPredictionStatus` / `getPredictionResult` / `cancelPrediction`, with `hasImage: job.upload_ids.length > 0`.
  - No service calls `deps.fal.*` directly any more.
- **Unchanged:** `clients/fal.ts`, `FakeFal`, all job state rules, logging and error handling.

- [ ] **Step 1: failing tests**

```ts
// test/models/models.test.ts (replace the buildInput / falEndpoint tests)
it("kling21 requestPrediction: an image goes to image-to-video with image_url and no aspect_ratio", ...);
                                       // FakeFal.calls[0].args → ["fal-ai/kling-video/v2.1/master/image-to-video", { prompt, duration, image_url }, webhook]
it("kling21 requestPrediction: no image goes to text-to-video with aspect_ratio", ...);
it("flux requestPrediction sends prompt, image_size, num_images", ...);
it.each([[true], [false]])("kling21 status/result/cancel use the same endpoint as submit (hasImage %s)", ...);
// job tests: an image-to-video job's submit, webhook status, finalize result and reconcile cancel all hit one endpoint
```
- [ ] **Step 2:** Run `npm test -- test/models`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `refactor(models): each model's requests.ts makes its own fal calls`.

---

### Task 4: Group the API routes into `public` and `panel` folders (like jiraiya)

Added 2026-11-03 at the user's request: "create two folder public and panel or platform move routes accordingly".
- **Folder choice.** We use `panel`, not `platform`. In Pixelbin, `panel` is for the logged-in dashboard user and `platform` is for developers calling with API tokens. Every Pixel Magic user comes in through the app with a Supabase login.
- **What changes.** Files move and get renamed. Every URL, status code, middleware order and response body stays the same; the one exception is noted under Interfaces.

**Files:**
- **Create:** `src/api/routes/index.ts`, `src/api/routes/public/index.ts`, `src/api/routes/panel/index.ts`.
- **Move and rename** (`git mv`, then edit):
  - `catalog.ts`, `models.ts`, `credits.ts` → `public/catalog.routes.ts`, `public/models.routes.ts`, `public/credits.routes.ts`.
  - `me.ts`, `billing.ts`, `uploads.ts`, `jobs.ts` → `panel/me.routes.ts`, `panel/billing.routes.ts`, `panel/uploads.routes.ts`, `panel/jobs.routes.ts`.
  - `health.ts` → `health.routes.ts`, and `webhooks.ts` → `webhooks.routes.ts`. Both stay at the top level of `routes/`: they aren't user APIs, so they belong in neither folder.
- **Modify:** `src/api/server.ts`, plus any test that imports a route file directly.

**Interfaces:**
- **Each `*.routes.ts`** exports one `Router` factory that takes `deps`.
  - Paths are relative to the folder's `/v1` prefix. Examples: `public/credits.routes.ts` declares `"/credits/estimate"`, and `panel/jobs.routes.ts` declares `"/jobs"`, `"/jobs/:id"` and `"/jobs/:id/download-url"`.
  - Zod validation stays in the route file, like jiraiya's validators.
  - Logic stays in `src/services/`, which is our equivalent of jiraiya's `handlers/`.
- **`public/index.ts`** mounts catalog, models and credits under `/v1`, with no auth.
- **`panel/index.ts`** mounts me, billing, uploads and jobs under `/v1`.
  - It applies `requireUser(deps)` and `ensureUser(deps)` once per area, at the area's prefix, e.g. `router.use("/jobs", ...guard, jobsRoutes(deps))`. Route files no longer list `...guard`.
  - The middleware order stays: auth, then body parser, then validation.
  - The one allowed behaviour change: an unauthenticated request to an unknown path inside a panel area (e.g. `GET /v1/jobs/a/b`) gets 401 instead of 404. A path outside every area (e.g. `GET /v1/nope`) still gets 404.
- **`routes/index.ts`** exports `apiRoutes(deps)`. It mounts routers in today's order: webhooks, health, public, panel.
- **`server.ts`** keeps helmet, cors, `notFound` and `errorHandler`, and mounts `apiRoutes(deps)`.

- [ ] **Step 1: test.** Add `test/api/routes.test.ts` with three checks:
  - every endpoint in the README's API list still answers on its old URL, with a status other than 404;
  - an unauthenticated `GET /v1/jobs/a/b` gets 401;
  - `GET /v1/nope` gets 404.
- [ ] **Step 2: Implement** the moves.
- [ ] **Step 3:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS. Existing API tests stay unchanged apart from import paths.
- [ ] **Step 4:** Update the README's project layout, adding a line on what `public` and `panel` mean. **Commit** with `refactor(api): group routes into public and panel like jiraiya`.
