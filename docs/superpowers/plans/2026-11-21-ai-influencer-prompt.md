# AI influencer prompt and aspect ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every AI influencer Generate uses Nano Banana 2 with the structured prompt from the spec, and the user picks the aspect ratio under the prompt box.

**Architecture:** The prompt is still built in the frontend (`lib/ai-influencer/prompt.ts`) from the panel's option lists, which gain a `description` per option. The job input picks Nano Banana 2 and sends the chosen `aspect_ratio`; the ratio is saved in the project's data, which needs one optional field in the backend's `ai-influencer` schema.

**Tech Stack:** Next.js + React (frontend, vitest), Express + Zod v4 (backend, vitest with Postgres on 54329).

**Spec:** `docs/superpowers/specs/2026-11-21-ai-influencer-prompt-design.md`

## Global Constraints

- Model key: `nanoBanana2_generate`; fall back to the first image model when it is not listed.
- Default aspect ratio: `4:5`; options come from the model's `aspect_ratio` enum.
- The prompt text and option descriptions are exactly the spec's ("The prompt" and "Option descriptions").
- Worst-case prompt (every trait, both references, 500-character notes) ≤ 5000 characters.
- Run tests with Node 22: `export PATH="$HOME/.nvm/versions/node/v22.23.4/bin:$PATH"`.
- No commits on `main`; the user commits and pushes.

## Review Focus

- A project saved before this change (no `aspectRatio`) opens with 4:5. Test in Task 4.
- A saved ratio the current model doesn't offer falls back to 4:5 (or the model's default). Test in Task 4.
- Changing only the ratio marks the influencer changed, so the next Generate saves it. Test in Task 4 (`projectData` includes it).
- Notes with only spaces add no "User notes" section. Test in Task 3.
- An animal character never gets heritage, skin tone or human face wording. Test in Task 3.

---

### Task 1: Backend accepts `aspectRatio` in ai-influencer data

**Files:**
- Modify: `backend/src/projects/types/aiInfluencer.ts`
- Modify: `backend/README.md` (the `POST /v1/projects` row)
- Test: `backend/test/projects/registry.test.ts`

**Interfaces:**
- Produces: `ai-influencer` data `{ traits, extra?, archetypeId?, aspectRatio? }`, `aspectRatio: z.string().max(10).optional()`.

- [ ] **Step 1: Write the failing tests** in `describe("ai-influencer data")`: `it("keeps aspectRatio")` parses `{ aspectRatio: "4:5" }` and expects `out.aspectRatio` to be `"4:5"`; add `["aspectRatio too long", { aspectRatio: "x".repeat(11) }]` to the rejects table.
- [ ] **Step 2: Run** `npx vitest run test/projects/registry.test.ts`. Expected: the two new cases FAIL (unrecognized key / no error).
- [ ] **Step 3: Add the field** to the strict data object, with a comment that the frontend picks it from the model's ratios.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npm run lint` (prettier) passes.

### Task 2: Option descriptions in constants

**Files:**
- Modify: `frontend/src/types/ai-influencer.ts` (`TraitOption.description?: string`)
- Modify: `frontend/src/components/ai-influencer/constants.ts`

**Interfaces:**
- Produces: every option of skinTone, hairColor, eyeColor, hairStyle, build, outfit, setting and age has `description` (the spec's table text, colours without the hex). `swatches(entries: Record<string, [hex: string, description: string]>)`. A helper `described(list, descriptions: Record<string, string>)` (by option value) adds descriptions to `options(...)` lists. `INFLUENCER_MODEL_KEY = "nanoBanana2_generate"`, `DEFAULT_ASPECT_RATIO = "4:5"`. `CHARACTER_LOOKS: Record<string, string>` = natural → "natural look", expressive → "bold, expressive features", wild → "extreme, exaggerated, eccentric look".
- Age descriptions are the ranges: "about 20–23", "about 26–29", "about 31–38", "about 41–48", "about 52–60".

- [ ] **Step 1: Add the fields and constants**; keep each hex exactly as today.
- [ ] **Step 2: Run** `npx tsc --noEmit` and `npx vitest run src/lib/ai-influencer`. Expected: no type errors; existing tests still pass (labels and values unchanged).

### Task 3: The structured prompt

**Files:**
- Modify: `frontend/src/lib/ai-influencer/prompt.ts`
- Test: `frontend/src/lib/ai-influencer/prompt.test.ts` (replace the `composeInfluencerPrompt`, `character type` and `reference images` blocks; keep `helpers`)

**Interfaces:**
- Consumes: Task 2's `description` fields and `CHARACTER_LOOKS`, `ANIMAL_SPECIES`.
- Produces: `composeInfluencerPrompt(traits: InfluencerTraits, references?: ReferencesUsed): string` (same signature), the text in the spec's order: intro, Priorities, Output, Photography, Realism details, Character, Style (only with an outfit or setting), Reference images (only when one is used), User notes (only when trimmed notes are non-empty), Avoid.
- Trait line format: `- Skin tone: olive, medium skin with warm golden-olive undertones (#c99a6e)` (label lower-cased, description, hex in brackets); `- Age: late 20s (looks about 26–29)`; `- Outfit: streetwear (oversized hoodie …)`; `- Hair style: <description>`; `- Build: <description>`.
- Animal (`ANIMAL_SPECIES[traits.character]`): character type `anthropomorphic <species> character`; gender `female`/`male` (none for non-binary); no Heritage or Skin tone lines; Output says "a single character"; Realism swaps the Skin, Face and Hair lines for `- Fur or feathers: realistic, detailed fur or feather texture, natural sheen.` and `- Face: expressive, detailed eyes, natural proportions for the species.`; the face reference line says "keep the same character identity".
- Reference lines: photo and style → `Image 1 (face)`, `Image 2 (style)`; one of them → `Image 1 (face)` or `Image 1 (style)`.

- [ ] **Step 1: Write the failing tests:**
  - `it("puts the sections in order")`: indexes of "You are an expert AI influencer creator", "## Priorities", "## Output", "## Photography", "## Realism details", "## Character", "## Avoid" increase.
  - `it("gives user notes the highest priority")`: contains "1. User notes: the user's own words win over everything below." and "never overridden".
  - `it("writes a picked colour as words plus its hex")`: skinTone olive → contains "- Skin tone: olive, medium skin with warm golden-olive undertones (#c99a6e)"; hairColor pastel → "(#c7a7f0)"; eyeColor hazel → "golden brown with green flecks (#8a6a35)".
  - `it("describes hair style, build and age")`: long-waves, athletic, late-20s → the three spec lines.
  - `it("leaves out traits that were not picked")`: defaults → no "Heritage", "Skin tone", "Hair style", "## Style", "## Reference images", "## User notes".
  - `it("adds user notes only when there is text")`: extra "  freckles  " → "## User notes\nfreckles"; extra "   " → no "## User notes".
  - `it("describes an animal character without human-only traits")`: kitty + ethnicity + skinTone → contains "anthropomorphic cat character", "Fur or feathers"; no "Heritage", "Skin tone", "Skin:".
  - `it.each` over `{}`, `{photo}`, `{style}`, `{photo, style}` → the expected Image lines.
  - `it("stays within Nano Banana's 5000-character prompt limit")`: every trait set to its longest-description option, character "wild", both references, extra "x".repeat(500) → `length <= 5000`.
  - `it("lists the safety rules")`: contains "anyone who looks under 18".
- [ ] **Step 2: Run** `npx vitest run src/lib/ai-influencer/prompt.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Rewrite `composeInfluencerPrompt`** with the spec's fixed text as constants in `prompt.ts` and a line builder per trait; `traitLabel` stays.
- [ ] **Step 4: Run** the same command. Expected: PASS.

### Task 4: Model choice, aspect ratio in the job and the project

**Files:**
- Modify: `frontend/src/lib/ai-influencer/projects.ts`
- Test: `frontend/src/lib/ai-influencer/projects.test.ts`

**Interfaces:**
- Consumes: `INFLUENCER_MODEL_KEY`, `DEFAULT_ASPECT_RATIO`.
- Produces:
  - `influencerModel(models: PublicModel[]): PublicModel | undefined`: Nano Banana 2 when listed, else the first.
  - `aspectRatios(model: PublicModel | undefined): string[]`: the `aspect_ratio` enum, or `[]`.
  - `pickAspectRatio(model: PublicModel | undefined, wanted: string | null): string`: `wanted` when offered, else `DEFAULT_ASPECT_RATIO` when offered, else the field's default, else `DEFAULT_ASPECT_RATIO`.
  - `influencerInput(model, traits, uploadIds, aspectRatio: string)`: sets `aspect_ratio` to `pickAspectRatio(model, aspectRatio)` when the model has the field; the `image_size` and `num_images` rules stay.
  - `projectData(traits, archetypeId, aspectRatio?: string)`: adds `aspectRatio` when given.
  - `aspectRatioFromProject(view: ProjectView): string | null`.

- [ ] **Step 1: Write the failing tests:**
  - `influencerModel`: picks `nanoBanana2_generate` from `[flux, nanoBanana]`; returns flux when Nano Banana is absent; `undefined` for `[]`.
  - `pickAspectRatio`: "9:16" offered → "9:16"; "7:3" → "4:5"; `null` → "4:5"; a model without the field → "4:5".
  - `influencerInput` with a Nano Banana fixture (aspect_ratio enum from the spec, default "16:9", image maxItems 14, num_images max 4): sends `aspect_ratio: "4:5"` by default and `"9:16"` when picked, `num_images: 4`, both upload ids.
  - `projectData(traits, null, "4:5")` has `aspectRatio: "4:5"`; without it, no key.
  - `aspectRatioFromProject`: "4:5" → "4:5"; missing or a number → `null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/ai-influencer/projects.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the functions above in `projects.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.

### Task 5: State and the picker

**Files:**
- Modify: `frontend/src/components/ai-influencer/InfluencerContext/index.tsx`
- Create: `frontend/src/components/ai-influencer/ControlPanel/AspectRatioPicker.tsx`
- Modify: `frontend/src/components/ai-influencer/ControlPanel/index.tsx`, `ControlPanel/main.module.css`

**Interfaces:**
- Consumes: Task 4's functions.
- Produces: state `aspectRatio: string` (initial `DEFAULT_ASPECT_RATIO`), action `{ type: "aspectRatio"; value: string }`; `"models"` sets `modelKey` to `influencerModel(models)?.key ?? ""`; `"project"` sets `aspectRatio` to `pickAspectRatio(undefined, aspectRatioFromProject(view))`; `"reset"` restores the default; `savedForm` and both saves pass the ratio; `generate` passes it to `influencerInput`.
- `AspectRatioPicker({ model, value, disabled, onChange })` renders `OptionMenu` (label "Aspect ratio", options from `aspectRatios(model)` with `RatioIcon`), nothing when the list is empty; placed between `PromptField` and `PanelFooter`.

- [ ] **Step 1: Implement** the state, action and picker.
- [ ] **Step 2: Run** `npx tsc --noEmit`, `npx eslint src/components/ai-influencer`, `npx vitest run`. Expected: clean, all tests pass.
- [ ] **Step 3: Check in the browser** at `/influencer`: the picker shows 4:5 with Nano Banana's ratios, picking 9:16 changes the chip, and Prompt details shows the structured prompt. (Saving needs the backend deployed.)
