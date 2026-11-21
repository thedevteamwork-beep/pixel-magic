# Generation loader and one-portrait influencer result Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show hinata's generation loader wherever an image is being made, and make the AI influencer result one portrait framed in its aspect ratio, with sample portraits while a flag is on.

**Architecture:** A shared `ui/GenerationLoader` (video + Lottie), loaded with `next/dynamic`. The image studio passes the generation's ratio to its pending tiles. The influencer keeps one variation per Generate, carries each variation's aspect ratio, and a sample branch in `generate()` returns a local portrait when `USE_SAMPLE_PORTRAITS` is on.

**Tech Stack:** Next.js 16 / React 19, CSS modules, vitest (node environment, no React test tooling), `lottie-react@3.1.2`.

**Spec:** `docs/superpowers/specs/2026-11-21-generation-loader-and-influencer-result-design.md`

## Global Constraints

- `lottie-react@3.1.2` (hinata's 2.4.0 doesn't support React 19).
- Loader assets copied from `~/Desktop/FE repos/hinata/src/common/`: `assets/lottie/Video-generator-Loader.lottie.json` → `frontend/src/assets/lottie/generation-loader.json`; `assets/videos/gradient.webm` → `frontend/public/media/generation-gradient.webm`.
- Animation box: 30% of the loader, min 16px, max 100px.
- `VARIATION_COUNT = 1`; `USE_SAMPLE_PORTRAITS = true`; sample wait `SAMPLE_RENDER_MS = 3000`.
- The influencer page no longer writes `?project=`; reading it stays.
- Node 22: `export PATH="$HOME/.nvm/versions/node/v22.23.4/bin:$PATH"`. No commits on `main` unless the user asks.

## Review Focus

- Cancel during a sample Generate stops it and shows no portrait. Browser check in Task 4.
- A reopened influencer whose job had no `aspect_ratio` (older jobs) frames at 4:5, not a broken box. Test in Task 3 (`variationsFromJobs` leaves `aspectRatio` out; the canvas falls back).
- An unknown ratio string ("bad") renders a square frame, not NaN. Test in Task 1.
- Reduced-motion users get no autoplaying video. Code check in Task 1.
- Generate with sample mode spends no credits and makes no API calls. Browser check in Task 4 (network panel shows no `/v1/projects` or `/v1/jobs` POST).

---

### Task 1: Shared GenerationLoader

**Files:**
- Create: `frontend/src/ui/GenerationLoader.tsx`, `frontend/src/ui/GenerationLoaderView.tsx`, `frontend/src/lib/aspectRatio.ts`, `frontend/src/lib/aspectRatio.test.ts`
- Copy: the two assets above
- Modify: `frontend/package.json` (dependency)

**Interfaces:**
- Produces: `cssAspectRatio(ratio: string): string` ("9:16" → "9 / 16", invalid → "1 / 1"); `GenerationLoader({ className?: string })` — a `next/dynamic` (ssr: false) wrapper around `GenerationLoaderView`, filling its parent.

- [ ] **Step 1: Write the failing test** `aspectRatio.test.ts`: `cssAspectRatio("9:16")` → `"9 / 16"`, `"4:5"` → `"4 / 5"`, `"bad"` → `"1 / 1"`, `"0:5"` → `"1 / 1"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/aspectRatio.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `cssAspectRatio`.
- [ ] **Step 4: Run** it. Expected: PASS.
- [ ] **Step 5: Install and build the loader:** `npm install lottie-react@3.1.2`; copy the assets; `GenerationLoaderView` renders a muted, looping, `playsInline` `<video src="/media/generation-gradient.webm">` covering the box and a centred `<Lottie animationData loop>`; under `prefers-reduced-motion: reduce` the video doesn't autoplay and the animation is paused. `role="presentation"`/`aria-hidden` (callers carry the status text).
- [ ] **Step 6: Run** `npx tsc --noEmit` and `npx eslint src/ui src/lib`. Expected: clean.

### Task 2: Image studio pending tiles use the loader

**Files:**
- Modify: `frontend/src/components/image-generator/useImageJobs.ts` (`ActiveRender`), `ImageResults.tsx`, `index.tsx`, `main.module.css`

**Interfaces:**
- Consumes: `GenerationLoader`, `cssAspectRatio`.
- Produces: `ActiveRender = { count: number; modelName: string; ratio: string }` (`shapeOf(request.model, request.options)?.ratio ?? "1:1"`); `ImageResults` prop `pendingRatio?: string`.

- [ ] **Step 1: Implement**: each grid pending card and the canvas placeholder show `GenerationLoader` in a box with `aspect-ratio: cssAspectRatio(pendingRatio)`; the "Creating image N" / model text stays below; the old sparkle art and orbit go.
- [ ] **Step 2: Run** `npx tsc --noEmit`, `npx eslint src/components/image-generator`, `npx vitest run src/components/image-generator src/lib/image-generator`. Expected: clean, PASS.

### Task 3: One portrait per Generate, with its ratio, and sample portraits

**Files:**
- Modify: `frontend/src/components/ai-influencer/constants.ts`, `frontend/src/types/ai-influencer.ts`, `frontend/src/lib/ai-influencer/projects.ts`
- Create: `frontend/src/lib/ai-influencer/samples.ts`, `samples.test.ts`
- Test: `frontend/src/lib/ai-influencer/projects.test.ts`

**Interfaces:**
- Produces: `VARIATION_COUNT = 1`, `USE_SAMPLE_PORTRAITS = true`, `SAMPLE_RENDER_MS = 3000`; `InfluencerVariation` gains `aspectRatio?: string` and `sample?: boolean`; `variationsFromJobs` sets `aspectRatio` from `job.input.aspect_ratio` when it's a string; `samplePortrait(traits: InfluencerTraits, archetypeId: string | null, aspectRatio: string): InfluencerVariation` — `{ id: "sample-…", url, alt, aspectRatio, sample: true }`.
- Sample choice: the archetype's `asset` when `archetypeId` matches; else `characterImages[traits.character]` for an animal character; else one of the human archetypes (fashion, fitness, travel, beauty, streetwear, luxury) at `seedFrom(JSON.stringify(traits)) % 6`.

- [ ] **Step 1: Write the failing tests:**
  - `samples.test.ts`: archetype "fitness" → `url` is the fitness template's `src`; character "kitty" (no archetype) → kitty character image `src`; the same human traits twice → the same `url`, and the url is one of the six human templates; result has `sample: true` and the given `aspectRatio`.
  - `projects.test.ts`: `influencerInput(nanoBanana, …).num_images` is `1`; update the flux test's expected `num_images` to `1`; `variationsFromJobs` with `input: { aspect_ratio: "9:16" }` gives `aspectRatio: "9:16"`, and without it no `aspectRatio` key.
- [ ] **Step 2: Run** `npx vitest run src/lib/ai-influencer`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the constants, type fields, `variationsFromJobs` change and `samples.ts`.
- [ ] **Step 4: Run** it. Expected: PASS.

### Task 4: Result screen, sample Generate and refresh

**Files:**
- Modify: `frontend/src/components/ai-influencer/InfluencerContext/index.tsx`, `ResultView/index.tsx`, `ResultView/ResultCanvas.tsx`, `ResultView/main.module.css`
- Delete: `ResultView/VariationStrip.tsx` (and its CSS rules)

**Interfaces:**
- Consumes: Tasks 1 and 3.
- `generate()`: when `USE_SAMPLE_PORTRAITS`, after validation it dispatches `start`, waits `SAMPLE_RENDER_MS` (aborted by `cancel`), then dispatches `done` with `[samplePortrait(submitted, archetypeId, aspectRatio)]` — no save, no upload, no job, no credits notice.
- `showProjectInUrl` is removed with its two calls.
- `ResultCanvas({ selected, busy, name, aspectRatio, onCancel })`: a frame with `aspect-ratio: cssAspectRatio(busy ? aspectRatio : selected?.aspectRatio ?? aspectRatio)` fitted to the available height; the portrait covers it; while busy the frame shows `GenerationLoader` with "Creating {name}…" and Cancel over it; a sample portrait shows a small "Sample" badge.

- [ ] **Step 1: Implement** the above; `ResultView` passes the context's `aspectRatio` and drops the strip.
- [ ] **Step 2: Run** `npx tsc --noEmit`, `npx eslint src/components/ai-influencer src/ui src/lib`, `npx vitest run`. Expected: clean, all PASS.
- [ ] **Step 3: Check in the browser** (`/influencer`, `/image`): Generate shows the loader in the 4:5 frame, then one sample portrait with "Sample"; pick 9:16 and Generate → tall loader frame; Cancel mid-way → no portrait; network shows no project/job POST; refresh → Explore tab; image studio pending tiles show the loader.
