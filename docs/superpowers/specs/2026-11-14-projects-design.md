# Pixel Magic: projects (AI Influencer first)

- **Date:** 2026-11-14
- **Status:** awaiting user approval
- **Builds on:** `docs/superpowers/specs/2026-10-28-backend-design.md` (layering, jobs) and `backend/AGENTS.md` (rules every backend change follows).
- **Prior art:** Pixelbin hidan `editor-projects` (`app/routes/panel/v1.0/org/editor-projects.routes.js`, `db/migrations/editorProjects/*`).

## 1. Intent

Features like **AI Influencer** and, later, **Marketing Studio** need to keep a user's work together.

The AI Influencer flow is:
1. A user opens the influencer page.
2. They pick a model, describe an influencer (name and traits) and press **Generate**.
3. The influencer and its images show on the right side, loaded from a GET API.
4. Later they reopen the same influencer and generate more images of it.

Today nothing on the server remembers this. The frontend keeps saved influencers in `localStorage`, and its generation is simulated. This work adds a backend **project**: a named, typed container owned by one user, and the generations (jobs) made inside it.

The idea comes from hidan's `editor-projects`, renamed to `projects`. Hidan pairs it with a second table (`editorEdits`) for each tool run. Here the existing `app.jobs` table already is that record, so jobs get a `project_id` instead.

## 2. Goals

1. A signed-in user can create, list, read, rename/update and delete their own projects.
2. Every project has a `type` (`ai-influencer` first). Adding a new type (for example `marketing-studio`) means adding one entry in code: no migration and no new routes.
3. Each type checks its own `data` (for AI Influencer: the traits and extra prompt text).
4. A job can be created inside a project: `POST /v1/jobs/:plugin/:operation` accepts an optional `projectId`.
5. The jobs of one project can be listed: `GET /v1/jobs?projectId=…`, newest first, with the existing cursor pagination and signed output URLs.
6. The project list shows a cover image (the newest finished output) and puts recently used projects first.

## 3. Non-goals

- **A dedicated influencer model or server-side prompt building.** The frontend keeps composing the prompt (`lib/ai-influencer/prompt.ts`) and creates an ordinary job, for example with `fluxSchnell/generate`.
- **Marketing Studio's data.** Its fields aren't known yet; it is added as a type when they are.
- Sharing, teams or org-level projects (hidan is org-level; here everything is per user).
- Search by title, date filters, expiry (`expiresAt` in hidan), soft delete, moving a job between projects.
- Storing the influencer's reference photo on the project. Reference photos keep using `POST /v1/uploads` inside the job's input.

## 4. Anti-goals

These would make this a failure even if it worked:
- A second record of a generation's state. Status, outputs and credits stay only on the job.
- Deleting a project deletes or alters jobs, outputs or credit records.
- One user can read, change or add jobs to another user's project.
- Existing clients break. Jobs without `projectId` behave exactly as today, including the request hash of existing idempotency keys.

## 5. Approaches

1. **`projects` table and `jobs.project_id` (chosen by the user).** Projects are a thin grouping layer on top of the job pipeline. The frontend makes two calls the first time (create the project, then the job). If the job is then refused (for example not enough credits), an empty project remains, which is acceptable because it is the same as a saved influencer.
2. **One call creating project and job together** (`POST /v1/projects/:id/generate`). This never leaves an empty project, but it gives job creation a second path that has to repeat credits, idempotency and rate-limit rules. Rejected.
3. **Hidan's shape: a separate `project_edits` table.** It would copy prompt, status and outputs from the job, giving two sources of truth. Rejected.

**`projectId` in the body vs a nested route.** The user chose the body (`{input, projectId}`), so `POST /v1/jobs/:plugin/:operation` stays the only way to create a job. A nested `POST /v1/projects/:id/jobs/...` was considered and dropped.

## 6. Design

### 6.1 Data

New migration `20261114000700_projects` (added to `src/db/migrations/index.ts`):

```sql
CREATE TABLE app.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.profiles (id),
  type text NOT NULL,
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_user_updated_at ON app.projects (user_id, updated_at DESC, id DESC);
CREATE INDEX projects_user_type_updated_at ON app.projects (user_id, type, updated_at DESC, id DESC);

ALTER TABLE app.jobs
  ADD COLUMN project_id uuid NULL REFERENCES app.projects (id) ON DELETE SET NULL;
CREATE INDEX jobs_project_created_at ON app.jobs (project_id, created_at DESC, id DESC)
  WHERE project_id IS NOT NULL;
```

- `secureTable(knex, "app.projects")`, as for every table.
- `T.projects = "app.projects"` in `src/db/tables.ts`.
- `ProjectRow` in `src/db/rows.ts`, and `project_id: string | null` on `JobRow`.
- `down` drops the index, the column and the table.
- There is deliberately **no CHECK on `type`**: valid types live in the code registry (6.2), so a new type needs no migration. Only the projects service writes this table, and it checks the type.

### 6.2 Project types

The project types are laid out like the model plugins:
- `src/projects/types/aiInfluencer.ts` describes one type.
- `src/projects/registry.ts` lists them:

```ts
export type ProjectTypeDefinition = {
  type: string; // "ai-influencer"
  /** Checks `data` on create and update. */
  data: z.ZodObject;
  /** Which model kinds may create jobs in this project. */
  modelKinds: readonly ModelKind[];
};

const PROJECT_TYPES: Record<string, ProjectTypeDefinition> = {
  "ai-influencer": aiInfluencer,
};

export function getProjectType(type: string): ProjectTypeDefinition | undefined; // Object.hasOwn, like getOperation
export function listProjectTypes(): string[];
```

`aiInfluencer` has `modelKinds: ["image"]` and this `data` schema, which mirrors the frontend's `InfluencerTraits`:

```ts
z.strictObject({
  traits: z
    .strictObject({
      gender, age, ethnicity, skinTone, hairStyle, hairColor,
      eyeColor, build, outfit, setting, // each z.string().max(40).optional()
    })
    .default({}),
  extra: z.string().trim().max(500).optional(), // MAX_EXTRA_LENGTH on the frontend
  archetypeId: z.string().max(60).optional(),
});
```

Trait **values** are not checked against the frontend's option lists, so options can change without a backend release. The name is the project's `title`, not part of `data`.

### 6.3 API (panel, signed-in user)

All routes go under `/v1`, behind `requireUser` and `ensureUser` (add `router.use("/projects", ...guard)` in `panel/index.ts`), with Zod `strictObject` bodies. A project that doesn't exist or belongs to someone else returns `404 NOT_FOUND` everywhere.

| Method and path | Body / query | Result |
| --- | --- | --- |
| `POST /v1/projects` | `{type, title, data?}` | `201` `ProjectView` |
| `GET /v1/projects` | `?type=&limit=1..50 (20)&cursor=` | `{projects: ProjectView[], nextCursor}` |
| `GET /v1/projects/:id` | | `ProjectView` |
| `PATCH /v1/projects/:id` | `{title?, data?}`, at least one | `ProjectView` |
| `DELETE /v1/projects/:id` | | `204` |

Rules:
- `title`: trimmed, 1 to 120 characters. The frontend can be stricter (it uses 2 to 40 for an influencer name).
- `type`: an unknown type returns `422 VALIDATION_FAILED`. The type can't be changed after creation.
- `data`: parsed by the type's schema; errors return `422 VALIDATION_FAILED` with the issues in `meta`, like job input. On `PATCH`, `data` replaces the whole object and is parsed again.
- **Order:** `GET /v1/projects` is ordered by `updated_at DESC, id DESC`, so recently used projects come first. The cursor uses the same encoding as jobs (`{t, id}`, base64url), with `t` = `updated_at`. Because `updated_at` can change while someone pages through the list, a project can rarely appear twice or be skipped. The frontend drops duplicates by id. This is accepted for a UI list.
- **Delete:** `DELETE` removes only the project row. Its jobs keep their outputs and credit records, get `project_id = NULL`, and still show in `GET /v1/jobs`.
  - In one transaction, the service first runs `UPDATE app.jobs SET project_id = NULL WHERE project_id = ?`, then deletes the project row. The `ON DELETE SET NULL` foreign key stays as a safety net.
  - This order (jobs, then project) avoids a three-way deadlock. Without it, delete would hold the project and wait for a job. Finalize holds that job and waits for the profile. A `createJob` in the same project holds the profile and waits for the project.

```ts
type ProjectView = {
  projectId: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  /** First output of the newest completed job in the project, signed; null if none yet. */
  cover: { mimeType: string; url: string; expiresAt: Date } | null;
  createdAt: Date;
  updatedAt: Date;
};
```

Covers are worked out when the projects are read, not stored:
- One query takes the newest completed job per project for the page: `DISTINCT ON (project_id) … WHERE project_id = ANY(?) AND status = 'completed' ORDER BY project_id, completed_at DESC`.
- The first output of each is signed, with one `createSignedUrls` call per bucket.
- The signing loop in `jobViews` is pulled into a shared helper, so jobs and projects sign the same way.
- Storing a cover URL is ruled out, because signed URLs expire.

### 6.4 Jobs inside a project

**`POST /v1/jobs/:plugin/:operation`**
- Body: `z.strictObject({ input, projectId: z.string().uuid().optional() })`.
- Inside `createJob`'s existing transaction, after `lockProfile` and after the idempotency lookup (keep this lock order: profile, then project):
  - A retried request with a known key returns its original job, even if the project was deleted in between.
  1. Load the project with `SELECT … FOR UPDATE`, where `id = projectId AND user_id = userId`. If it isn't found, return `404 NOT_FOUND`. The lock stops a parallel `DELETE` from removing the project before the insert. It is `FOR UPDATE` and not `FOR SHARE` because step 4 updates the same row; two creates for one user are already serialized by the profile lock.
  2. If `model.schema.info.kind` is not in the type's `modelKinds`, return `422 VALIDATION_FAILED` ("This model can't be used in this project").
  3. Write the job with `project_id` set (add `project_id` to `NewJob`).
  4. Set the project's `updated_at` to `now` (from `deps.clock`).
- **Idempotency:** the request hash includes `projectId` **only when it is sent**: `canonicalJson({ model, input, ...(projectId ? { projectId } : {}) })`. Jobs without a project keep exactly today's hash. The same `Idempotency-Key` with a different `projectId` returns `409 IDEMPOTENCY_KEY_REUSED`.
- **Order of checks:** the project checks run before the active-job limit and the credit reservation, so a bad `projectId` never reserves credits.

**`GET /v1/jobs`**
- Takes an optional `projectId` (uuid). The query filters on `user_id` **and** `project_id`, so another user's project id simply returns an empty list.
- Cursor and page size stay as they are.

**`JobView`** gains `projectId: string | null`.

`finalize`, `generate`, `reconcile` and the job state machine do not change.

### 6.5 Code layout (follows `backend/AGENTS.md`)

- `src/db/repositories/projects.repo.ts` holds all the SQL:
  - `insertProject`;
  - `getUserProject(db, userId, id, { forUpdate?: boolean })`;
  - `unlinkProjectJobs(trx, userId, projectId)`;
  - `listUserProjects(db, userId, { type?, limit, before? })`;
  - `updateUserProject`;
  - `deleteUserProject`;
  - `touchProject(trx, id, now)`;
  - `latestCompletedJobs(db, projectIds)`.
- `src/db/repositories/jobs.repo.ts`: `insertJob` writes `project_id`, and `listUserJobs` takes an optional `projectId`.
- `src/services/projects.ts`: create, update and delete (type and data checks, clock), plus `projectViews` (the covers).
- `src/services/jobs/jobs.ts`: `createJob` accepts `projectId`.
- `src/api/routes/panel/projects.routes.ts`: thin routes. A simple read may call the repo directly, as the jobs routes do.
- Timestamps come from `deps.clock.now()` (Clock rule). Errors use `AppError` with existing codes; no new codes are needed.

### 6.6 Tests

- `test/api/projects.test.ts`:
  - create (good input, unknown type, bad data, title limits);
  - list (type filter, order by `updated_at`, cursor, covers signed, `null` cover);
  - get, patch and delete;
  - another user's project gives 404 for every route;
  - delete keeps the jobs and unlinks them.
- `test/api/jobs.create.test.ts`:
  - `projectId` happy path (`project_id` saved, project `updated_at` bumped);
  - unknown or foreign project gives 404 with no credits reserved;
  - a video model in an `ai-influencer` project gives 422;
  - the same key with a different `projectId` gives 409;
  - no `projectId` gives the same hash as before.
- `test/api/jobs.list.test.ts`: the `projectId` filter, including a foreign project id returning an empty list.
- `test/db/migrations.test.ts`: up and down with the new table and column.

### 6.7 Docs

- `backend/README.md`: add the project routes to the API table, and `projectId` to the jobs rows.
- `backend/AGENTS.md`: a short "Projects" note:
  - types live in `src/projects/registry.ts`;
  - jobs keep all generation state;
  - deleting a project only unlinks its jobs.

### 6.8 Frontend: the AI Influencer page uses these APIs

The user approved this design and asked for it to be wired into AI Influencer as well. The calls below are mine, made to fit the current page (`components/ai-influencer/*`, `InfluencerContext`).

1. **Sign-in:** `/influencer` stays public, so Explore works signed out. Generate and History need a session. A `401`/`UNAUTHENTICATED` sends the user to `/sign-in?next=/influencer` (`?project=` is kept when set), as `GenerateForm` does.
2. **Model:** the panel footer gets a model picker with the image models from `GET /v1/models`. The first one is selected by default.
3. **Job input:**
   - Built with `buildInput(model, { prompt, values, uploadIds })`, with the prompt from `composeInfluencerPrompt`.
   - `values` start from `defaultOptions(model)`. Then `image_size: "portrait_4_3"` is set when the model's enum has it, and `num_images` is set to `min(VARIATION_COUNT, field.maximum)` when the model has that field.
4. **Reference photo:**
   - If the model has an image field, the photo is uploaded (`POST /v1/uploads` and a signed upload, as in `GenerateForm`) and goes in the input, and `composeInfluencerPrompt` gets `hasReference = true`.
   - If it doesn't (FLUX Schnell), the photo is not sent, and the upload area shows "This model doesn't use a reference photo."
5. **Project lifecycle:**
   - The first Generate with no project calls `POST /v1/projects` (`title` = name, `data` = traits, `extra`, `archetypeId`).
   - Later Generates call `PATCH /v1/projects/:id` first, only when the title or data changed since the last save.
   - The project id goes into the URL with `history.replaceState` (`/influencer?project=<id>`).
   - A page load with `?project=` opens that project.
6. **Generate:**
   - Creates the job with `projectId` and an `Idempotency-Key` (kept for a retry after a network or 5xx error, dropped after a 4xx, as in `GenerateForm`).
   - Polls it with `pollJob` (4 s interval).
   - When it completes, its outputs become the new variations. A failed job shows `messageForError` in the error banner. Cancel stops polling only; the job keeps running on the server.
7. **History tab:**
   - Lists `GET /v1/projects?type=ai-influencer` (50 a page, with a "Load more" button when `nextCursor` is set), and each card uses the project's `cover`.
   - Opening a card loads `GET /v1/jobs?projectId=…&limit=20`, and the completed jobs' outputs become the variations, newest first.
   - Remove calls `DELETE /v1/projects/:id`.
8. **Save button:** "Save influencer" is removed. Every influencer is saved as a project on its first Generate, so the toolbar shows "Saved" once a project exists. The `localStorage` roster and `MAX_ROSTER` go away.
9. **Real outputs:** `InfluencerVariation.hue`, `position` and `seed` become optional. `portraitStyle` returns no tint or crop when they are missing, so real outputs show as they are, and sample art keeps its look.
10. **Code layout:**
    - Pure API helpers and mappers go in `src/lib/ai-influencer/projects.ts`; they take the `api` client as a parameter and have tests.
    - `lib/api/client.ts` gains `patch`, and treats `204` as no body.
    - `lib/api/types.ts` gains `ProjectView`, `ProjectList` and `JobView.projectId`.

## 7. Decided by the user

- Approach 1 (projects table plus `jobs.project_id`).
- `projectId` goes in the job create body, not a nested route.
- Projects are per user, and new project types must be easy to add.
- **My call, from the flow the user described:** for AI Influencer, one project is one influencer, and its generations are the jobs inside it.

## 8. Left to the builder

- Exact Zod messages and helper names.
- Whether the cursor helper is made generic (`{at, id}`) or a second small encoder is added for projects.
- Whether the signing helper lives in `services/jobs/jobs.ts` or a small `services/signing.ts`.
