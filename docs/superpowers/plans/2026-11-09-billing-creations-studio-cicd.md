# Billing pages, My creations, studio and CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can buy plans and add-ons through Paddle, manage their plan and see their invoices, browse their past generations, and see the live credit cost on a redesigned `/generate`. GitHub Actions tests every PR and deploys the backend from `main`.

**Architecture:**
- New Next.js pages (`/pricing`, `/checkout`, `/checkout/finish`, `/account`, `/creations`) call the existing backend through `api` (`frontend/src/lib/api/client.ts`). Billing logic lives in small tested modules under `frontend/src/lib/billing/`.
- Checkout mirrors Pixelbin sharingan:
  - `/checkout?_ptxn=<transactionId>` opens Paddle.js inline;
  - on `checkout.completed` the page moves to `/checkout/finish?txn=<transactionId>`;
  - that page polls `GET /v1/billing/invoices` until the transaction shows as paid.
- CI/CD runs on GitHub Actions. It logs in to GCP with Workload Identity Federation, which `infra/setup.sh` creates, and `infra/deploy.sh` redeploys a new image.

**Tech Stack:** Next.js 16.4.3, React 19.3, Tailwind 4, `@paddle/paddle-js`, Vitest; backend Express 5, Knex, Vitest; GitHub Actions, gcloud.

**Spec:** none. The user skipped the questions ("create it missing part"), so the Decisions below are the controller's calls and every ruling is provisional. References:
- backend API: `backend/README.md` "Endpoints";
- existing frontend conventions: `docs/superpowers/specs/2026-11-07-frontend-generate-and-deploy-design.md`;
- Pixelbin checkout flow: `/Users/tusharbansal/Desktop/Azure Repo/Pixelbin/services/sharingan/docs/CHECKOUT_FLOW.md`.

## Decisions (controller's calls)

- **D1 Checkout:** Paddle.js inline on our own `/checkout` page, as sharingan's `PaddleCheckoutPage`. Paddle's default payment link is set to `https://<site>/checkout`, so the `_ptxn` links in Paddle's emails open there too.
- **D2 Payment confirmation:** `/checkout/finish` polls `GET /v1/billing/invoices` every 2000 ms for at most 60000 ms. Each invoice gains `transactionId`. There is no new route.
- **D3 Plan change:**
  1. Clicking a plan calls `GET /v1/billing/subscription/preview?plan=`.
  2. A confirm panel shows the preview's `description` and effective date.
  3. Confirming calls `POST /v1/billing/subscription`.
  4. The page acts on the returned `action`.
- **D4 Free plan:** choosing it means cancel; the backend already treats plan `free` as a cancel.
- **D5 Sign-in required** for `/generate`, `/account`, `/checkout` (including `/checkout/finish`) and `/creations`. `/pricing` is public.
- **D6 Header:**
  - Signed out: Explore, Pricing.
  - Signed in: Create (`/generate`), My creations (`/creations`), Pricing.
  - The email and the credits count both link to `/account`.
- **D7 `/generate` redesign:**
  - a two-panel studio: controls on the left, result on the right;
  - a "Recent" strip of the last 6 jobs under the result;
  - only existing theme tokens; no new colours.
- **D8 Live estimate:**
  - Call `POST /v1/credits/estimate/:plugin/:operation` with the same `input` the job would get, debounced 400 ms; the latest request wins.
  - If the estimate fails, Generate stays enabled, because the backend still checks credits.
- **D9 CI/CD:**
  - `frontend.yml` runs on PRs touching `frontend/**`.
  - `backend.yml` also becomes callable (`workflow_call`).
  - `deploy.yml` runs on push to `main` touching `backend/**` or `infra/**`, and by hand (`workflow_dispatch`). It runs the backend tests first, then deploys only the new image; secrets and config stay as `setup.sh` left them.
- **D10 GitHub to GCP auth:**
  - Workload Identity Federation limited to one repo and `refs/heads/main`; no JSON keys.
  - `setup.sh` creates it only when `GITHUB_REPO` is set.
- **D11 Frontend deploys** stay with Vercel's Git integration; there is no workflow for them.
- **D12 Money:** amounts arrive as decimal strings (`"10.00"`) with a currency code. Show them with `Intl.NumberFormat("en-US", { style: "currency", currency })`.

**Phase gate:**
- Tasks 1–6 (Phase A) must not modify files the other session has uncommitted (see Global Constraints).
- Tasks 7–9 (Phase B) start only after that session's model-rename commit lands on `feat/frontend-generate` and the controller merges it into this branch.

## Global Constraints

**Toolchain and Next.js**
- Node 22. Frontend: `source ~/.nvm/nvm.sh && nvm use 22`. Backend: `source ~/.nvm/nvm.sh && nvm use`.
- Next.js 16.4.3 differs from older versions. Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing Next code (see `frontend/AGENTS.md`).
- Cache components are on, so read `searchParams` and other request data inside a `<Suspense>` boundary.
- No secrets in the frontend. The only `NEXT_PUBLIC_*` values are:
  - the API URL;
  - the Supabase URL and publishable key;
  - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, Paddle's public client-side token;
  - `NEXT_PUBLIC_PADDLE_ENV` (`sandbox` | `production`).
- Read env lazily, following the pattern in `frontend/src/lib/env.ts`: literal `process.env.NEXT_PUBLIC_…` reads, called when needed. `npm run build` must pass with no env set.

**UI**
- Reuse `src/ui/*`: `Button`, `ButtonWithLink`, `Badge`, `Chip`, `Container`, `Media`, `LazyVideo`, `MasonryGrid`, `SectionHeading`.
- Use only the Tailwind theme names from `src/app/globals.css` (`bg-surface`, `bg-surface-raised`, `text-muted`, `text-subtle`, `border-border`, `bg-primary`, …). No new colours or hex values.
- User-facing copy is plain sentences. Never show error codes. Dates use `toLocaleDateString("en-US", { dateStyle: "medium" })`.

**Code**
- Backend style: plain Zod with one `z.strictObject` per part, and numbered plain `if` checks.
- **Phase A must not modify** any of these. They hold another session's uncommitted work; importing from them is fine:
  - `frontend/src/app/generate/**` and `frontend/src/lib/generate/**`;
  - `frontend/src/lib/api/types.ts`;
  - `backend/README.md` and `backend/.env.example`;
  - `backend/test/api/routes.test.ts`;
  - any `backend/src/models/**` or `backend/src/services/jobs/**` file.

**Git**
- Commit on `feat/frontend-billing` only, with `git add <paths>` (never `-A`). Never push.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Tests**
- Frontend: Vitest in the node env. Pure logic in `src/lib/**` gets unit tests; pages are checked by `npm run lint` and `npm run build`.
- Backend: run only the task's own test files, each against its own database:
  `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/pm_<task>_test npx vitest run <files>`.
  The full suite has 7 known failures at this branch's base (README model keys); they are fixed by the Phase B merge.
- Shell: `bash -n` on every script. Never run a gcloud command that changes GCP.

## Review Focus

1. **Paddle's `checkout.completed` arrives before our webhook.** The finish page must keep polling, never show "failed". After 60 s it shows "still processing" with a link to `/account`. Test: `waitForPayment` returns `"pending"` on timeout (Task 2).
2. **`/checkout` with a missing or malformed `_ptxn`, or an unset Paddle token.** Show a clear message and a link to `/pricing`, never a blank page. Test: `parseTransactionId` (Task 2).
3. **Paddle.js blocked (ad blocker) or failing to load.** `loadPaddle` rejects with `PaddleUnavailableError`. The page says checkout couldn't load and suggests turning off ad blockers. Test: loader with a failing init (Task 2).
4. **Double click on Buy or Choose.** Only one request goes out: buttons are disabled while a request is in flight (Tasks 3 and 5). Test: `runOnce` guard (Task 2).
5. **An older estimate response arriving after a newer one.** The latest request's result is shown. Test: `createEstimator` latest-wins (Task 8).

---

### Task 1: Backend — `transactionId` on `GET /v1/billing/invoices`

**Files:**
- Modify: `backend/src/api/routes/panel/billing.routes.ts` (the `/billing/invoices` handler)
- Test: `backend/test/api/billing.addons.test.ts`

**Interfaces:**
- Produces: each invoice item gains `transactionId: string | null`, from `paddle_transaction_id`. The other fields are unchanged: `id`, `itemType`, `item`, `amount`, `currency`, `status`, `paidAt`.

- [ ] **Step 1: Write the failing test.** In `billing.addons.test.ts`, add `it("lists paid invoices with their Paddle transaction id")`:
  - insert a paid invoice for `userId` with `paddle_transaction_id: "txn_paid_1"` (copy how the file's existing invoices test builds rows; if there is none, insert into `T.invoices` with `status: "paid"`, `paid_at`, `amount: "20.00"`, `item_type: "addon"`);
  - call `GET /v1/billing/invoices` as that user;
  - expect `res.body[0]` to match `{ transactionId: "txn_paid_1", status: "paid" }`.
- [ ] **Step 2: Run it and see it fail:**
  `cd backend && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/pm_t1_test npx vitest run test/api/billing.addons.test.ts`
  Expected: FAIL; `transactionId` is undefined.
- [ ] **Step 3: Add `transactionId: r.paddle_transaction_id`** to the mapped object in the invoices handler.
- [ ] **Step 4: Run Step 2's command again.** Expected: PASS. Also run `npm run lint && npm run typecheck`; expected clean.
- [ ] **Step 5: Commit:** `feat(billing): invoices carry their Paddle transaction id`.

### Task 2: Frontend billing foundation

**Files:**
- Create:
  - `frontend/src/lib/api/billingTypes.ts`
  - `frontend/src/lib/billing/money.ts`, `money.test.ts`
  - `frontend/src/lib/billing/messages.ts`, `messages.test.ts`
  - `frontend/src/lib/billing/purchase.ts`, `purchase.test.ts`
  - `frontend/src/lib/billing/waitForPayment.ts`, `waitForPayment.test.ts`
  - `frontend/src/lib/billing/paddle.ts`, `paddle.test.ts`
- Modify:
  - `frontend/src/lib/env.ts` (+ `env.test.ts`)
  - `frontend/src/lib/api/client.ts` (+ `client.test.ts`)
  - `frontend/src/proxy.ts`
  - `frontend/.env.example`
  - `frontend/package.json` and `package-lock.json` (add `@paddle/paddle-js`)

**Interfaces — Produces:**
- `billingTypes.ts`, hand-written copies of the backend shapes, with dates as ISO strings:
  - `Plan = { name; display; description: string; interval: "monthly" | "yearly"; amount: string; currency: string; credits: number; creditValidityDays: number | null; priority: number }`
  - `Addon = { name; display; description: string; amount: string; currency: string; credits: number; durationDays: number }`
  - `Subscription = { plan: string; display: string; interval: "monthly" | "yearly"; status: string; currentPeriodEnd: string; nextPlan: string | null; paddleStatus: string | null }`
  - `CreditGrant = { kind: "plan" | "carryover" | "addon" | "manual"; remaining: number; expiresAt: string }`
  - `Account = { userId: string; email: string | null; credits: { available: number; reserved: number; grants: CreditGrant[] }; subscription: Subscription }`. This is the full `GET /v1/me`.
  - `Invoice = { id: string; transactionId: string | null; itemType: "plan" | "addon"; item: string | null; amount: string | null; currency: string; status: string; paidAt: string | null }`
  - `CheckoutResult = { action: "checkout"; transactionId: string; checkoutUrl: string | null }`
  - `PlanChangeResult = CheckoutResult | { action: "scheduled"; effectiveAt: string } | { action: "reverted" } | { action: "canceled" }`
  - `PlanChangePreview = { changeType: "new" | "upgrade" | "downgrade" | "cancel"; action: "now" | "period_end"; effectiveAt: string; description: string }`
  - Before writing the `changeType` and `action` unions, check them against `backend/src/services/billing/rules.ts` `ChangeType` and `Action`, and copy the real values.
- `money.ts`: `formatMoney(amount: string, currency: string): string`.
- `messages.ts`: `billingErrorMessage(error: unknown): string`.
- `purchase.ts`:
  - `type PurchaseStep = { kind: "checkout"; path: string } | { kind: "done"; message: string }`
  - `nextStep(result: PlanChangeResult | CheckoutResult): PurchaseStep`
  - `parseTransactionId(value: string | null | undefined): string | null`
  - `checkoutPath(transactionId: string): string`, which returns `/checkout?_ptxn=<id>`
  - `finishPath(transactionId: string): string`, which returns `/checkout/finish?txn=<id>`
  - `runOnce<A extends unknown[], R>(fn: (...a: A) => Promise<R>): (...a: A) => Promise<R | undefined>`. While a call is in flight, further calls resolve `undefined` without calling `fn`.
- `waitForPayment.ts`:
  - `type PaymentResult = { kind: "paid"; invoice: Invoice } | { kind: "pending" }`
  - `waitForPayment(transactionId: string, p: { listInvoices: () => Promise<Invoice[]>; intervalMs?: number /* 2000 */; timeoutMs?: number /* 60000 */; now?: () => number; sleep?: (ms: number, signal?: AbortSignal) => Promise<void>; signal?: AbortSignal }): Promise<PaymentResult>`
  - Reuse `sleepUnlessAborted` from `@/lib/generate/pollJob` as the default `sleep`; importing it is allowed.
- `paddle.ts`:
  - `class PaddleUnavailableError extends Error`
  - `loadPaddle(p?: { init?: typeof initializePaddle; onEvent?: (e: PaddleEventData) => void }): Promise<Paddle>`. It calls `init({ environment: paddleEnv().environment, token: paddleEnv().clientToken, eventCallback })`.
  - It throws `PaddleUnavailableError` when the token is missing, when init throws, or when init resolves `undefined`.
- `env.ts`: `paddleEnv(): { clientToken: string; environment: "sandbox" | "production" }`.
  - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is required.
  - `NEXT_PUBLIC_PADDLE_ENV` defaults to `"sandbox"`; any value other than `sandbox` or `production` throws.
  - It is separate from `publicEnv()`, so pages that don't use Paddle don't need the token.
- `client.ts`: `ApiClient` gains `delete<T>(path: string, opts?: { signal?: AbortSignal }): Promise<T>`, and the exported `api.delete` too.

- [ ] **Step 1: Install Paddle.js:** `cd frontend && npm install @paddle/paddle-js`. Use the latest 1.x. Read its README in `node_modules/@paddle/paddle-js` for `initializePaddle`, `Checkout.open` and the event names; the later tasks rely on them.
- [ ] **Step 2: Write the failing tests:**
  - `money.test.ts`:
    - `formatMoney("10.00","USD")` is `"$10.00"`;
    - `formatMoney("0.00","USD")` is `"$0.00"`;
    - `formatMoney("300.00","EUR")` is `"€300.00"`.
  - `messages.test.ts`: `billingErrorMessage(new ApiError(status, code, "server text"))` gives:
    - `ALREADY_ON_PLAN`: "You're already on this plan."
    - `PAYMENT_PAST_DUE`: "Your last payment failed. Update your payment method first."
    - `PAYMENT_PROVIDER_ERROR`: "The payment service didn't respond. Try again in a minute."
    - `RENEWAL_IN_PROGRESS`: "Your plan is renewing right now. Try again in a few minutes."
    - `PLAN_NOT_AVAILABLE` and `ADDON_NOT_AVAILABLE`: "That option isn't available any more."
    - `NO_SCHEDULED_CHANGE`: "There's no scheduled change to undo."
    - `VALIDATION_FAILED`: the server message.
    - `NETWORK_ERROR`: "Can't reach Pixel Magic. Check your connection and try again."
    - anything else, including a non-`ApiError`: "Something went wrong. Try again."
  - `purchase.test.ts`:
    - `nextStep({action:"checkout",transactionId:"txn_01abc",checkoutUrl:null})` is `{kind:"checkout",path:"/checkout?_ptxn=txn_01abc"}`;
    - `scheduled` with `effectiveAt:"2026-12-01T00:00:00.000Z"` is `{kind:"done", message:"Your plan changes on Dec 1, 2026."}`;
    - `reverted` is `{kind:"done",message:"Your scheduled change was undone."}`;
    - `canceled` is `{kind:"done",message:"Your plan was canceled."}`;
    - `parseTransactionId`: `"txn_01h2abc"` is kept; `null`, `""`, `"abc"`, `"txn_"`, `"txn_01/../x"` and a 200-character value give `null` (the rule is `/^txn_[a-z0-9]{1,64}$/`);
    - `runOnce`: two calls before the first resolves call `fn` once and the second resolves `undefined`; after the first settles, either way, the next call runs `fn` again.
  - `waitForPayment.test.ts`, with a fake `now`, a fake `sleep` and a stub `listInvoices`:
    - (a) the invoice appears on the 3rd call: the result is `paid` with that invoice, after 3 calls;
    - (b) it never appears: the result is `pending` once 60000 ms of fake time pass, and no call starts after the deadline;
    - (c) `listInvoices` throws twice, then returns the invoice: still `paid`, since errors count as "not yet";
    - (d) the signal aborts: the promise rejects with an AbortError;
    - (e) an invoice with the same `transactionId` but `status:"draft"` does not count.
  - `paddle.test.ts`, with the env stubbed via `vi.stubEnv`:
    - (a) the token is missing: rejects with `PaddleUnavailableError`;
    - (b) `init` rejects: rejects with `PaddleUnavailableError`;
    - (c) `init` resolves `undefined`: rejects with `PaddleUnavailableError`;
    - (d) success: resolves the instance and passes `{environment:"sandbox", token}`.
  - `env.test.ts`: `paddleEnv()` defaults to sandbox, accepts `production`, and throws on `"live"` and on a missing token.
  - `client.test.ts`: `delete` sends `method: "DELETE"` with the bearer token and parses the JSON.
- [ ] **Step 3: Run them and see them fail:** `cd frontend && npx vitest run src/lib/billing src/lib/env.test.ts src/lib/api/client.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 4: Implement the modules** to the Interfaces above.
  - **`proxy.ts`:** protect `/generate`, `/account`, `/checkout` and `/creations`. A path matches when it equals the prefix or starts with `prefix + "/"`. Keep the existing redirect and cookie code unchanged, and update the doc comment.
  - **`.env.example`:** add, with comments:
    - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=`: from Paddle > Developer tools > Authentication > Client-side tokens. Starts with `test_` in sandbox. It is public by design; never the API key.
    - `NEXT_PUBLIC_PADDLE_ENV=sandbox`.
- [ ] **Step 5: Run Step 3's command again.** Expected: PASS. Then run `npx vitest run && npm run lint && npm run build`; expected all green, with the build passing while no env is set.
- [ ] **Step 6: Commit:** `feat(frontend): billing types, Paddle loader, payment wait and protected billing routes`.

### Task 3: `/pricing` page and navigation

**Files:**
- Create:
  - `frontend/src/app/pricing/page.tsx` (server component: heading and Suspense shell)
  - `frontend/src/app/pricing/PricingView.tsx` (client: loads data, holds state)
  - `frontend/src/app/pricing/PlanCard.tsx`, `AddonCard.tsx`, `ConfirmChange.tsx`
- Modify:
  - `frontend/src/constants/navigation.ts`: header and footer "Pricing" go to `/pricing`; add `signedInLinks: NavLink[]` = Create `/generate`, My creations `/creations`, Pricing `/pricing`.
  - `frontend/src/components/layout/Header.tsx` and `HeaderAccount.tsx`: show `signedInLinks` when signed in; the email and the credits count become links to `/account`.

**Interfaces:**
- Consumes from Task 2:
  - `Plan`, `Addon`, `Account`, `PlanChangePreview`, `PlanChangeResult`, `CheckoutResult`;
  - `formatMoney`, `billingErrorMessage`, `nextStep`, `runOnce`;
  - `api.get` / `api.post`.
- **Signed-in check:** use the Supabase browser client's session, the same way `HeaderAccount.tsx` does.

**Behaviour:**
- **Data:**
  - `GET /v1/plans` and `GET /v1/addons` are public and always loaded.
  - `GET /v1/me` is loaded only when signed in.
- **Plan list and interval:**
  - Show a Monthly / Yearly switch only when there are yearly plans.
  - Free (`amount "0.00"`) shows in both views.
  - Sort plans by `priority`, then `amount`.
- **Plan card shows:**
  - `display`, `description`;
  - the price with "/ month" or "/ year";
  - "`credits` credits each month" (or "each year"), using the interval's word;
  - "Credits last `creditValidityDays` days" when that isn't null.
- **Plan card button:**
  - Signed out: "Get started", a link to `/sign-in?next=%2Fpricing`.
  - The user's current plan: a disabled "Current plan" button. If `subscription.nextPlan` is set, also show "Changes to <next plan display> on <currentPeriodEnd>" and a link to `/account`.
  - Any other plan:
    1. "Switch to <display>" calls `GET /v1/billing/subscription/preview?plan=<name>` (encoded).
    2. `ConfirmChange` opens inline under the card with the preview's `description`, "Starts <effectiveAt>", and Confirm / Back.
    3. Confirm calls `POST /v1/billing/subscription {plan}`, then `nextStep(result)`.
    4. On `checkout`: `router.push(path)`.
    5. On `done`: show the message, reload `/v1/me` and call `notifyCreditsChanged()` (`frontend/src/lib/balance.ts`).
  - Wrap every action in `runOnce`, and disable its button while it is pending.
- **Add-ons section,** below the plans: `display`, `description`, the price, "`credits` credits, valid `durationDays` days", and a "Buy" button.
  - Signed out: a link to sign in.
  - Signed in: `POST /v1/billing/addons {addon}`, then `nextStep`, then `router.push`.
- **Errors:** any failure shows `billingErrorMessage(error)` next to the button that caused it. A load failure of plans or add-ons shows "Couldn't load prices." with a "Try again" button.

- [ ] **Step 1: Read the Next docs** for client components, `useRouter` and Suspense in `frontend/node_modules/next/dist/docs/01-app`.
- [ ] **Step 2: Build the page and update the navigation** as described.
- [ ] **Step 3: Verify:** `cd frontend && npx vitest run && npm run lint && npm run build`. Expected: all green, and `/pricing` is listed in the build output.
- [ ] **Step 4: Commit:** `feat(frontend): pricing page with plan change and add-on checkout`.

### Task 4: `/checkout` and `/checkout/finish`

**Files:**
- Create:
  - `frontend/src/app/checkout/page.tsx`, `PaddleCheckout.tsx` (client)
  - `frontend/src/app/checkout/finish/page.tsx`, `CheckoutFinish.tsx` (client)

**Interfaces:**
- Consumes from Task 2: `parseTransactionId`, `finishPath`, `loadPaddle`, `PaddleUnavailableError`, `waitForPayment`, `Invoice`, `api.get`.
- Also `notifyCreditsChanged()` from `frontend/src/lib/balance.ts`.

**Behaviour — `/checkout`:**
1. Read `_ptxn` with `useSearchParams` inside Suspense and pass it through `parseTransactionId`. If it's `null`: "This checkout link isn't valid." and a link "See plans" to `/pricing`.
2. Otherwise call `loadPaddle({ onEvent })`, then `paddle.Checkout.open(...)`:
   - `transactionId`;
   - `settings.displayMode: "inline"`, `frameTarget: "paddle-checkout"` (a div with that class);
   - `frameInitialHeight: 450`, `frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;"`;
   - `theme: "dark"`, `variant: "one-page"`.
3. While loading, show "Loading checkout…".
4. On `checkout.completed`: `router.replace(finishPath(transactionId))`.
5. On `PaddleUnavailableError`: "Checkout couldn't load. If you use an ad blocker, turn it off for this site and try again." with a "Try again" button that re-runs the load.
6. On `checkout.error`: "Something went wrong with the payment form." with Try again.
7. Open Paddle once per transaction id; React's dev double-render must not open two frames.
8. Layout: a narrow centred column with the frame, and "Payments are handled by Paddle." in `text-muted`.

**Behaviour — `/checkout/finish`:**
1. Read `txn` and parse it. If invalid: the same invalid-link message as `/checkout`.
2. Run `waitForPayment(txn, { listInvoices: () => api.get<Invoice[]>("/v1/billing/invoices"), signal })`, aborting on unmount.
3. While waiting: "Confirming your payment…".
4. On `paid`:
   - "Payment received." plus "<item> is now active." (or "Your credits were added." when `item` is null);
   - call `notifyCreditsChanged()`;
   - buttons "Start creating" (`/generate`) and "View account" (`/account`).
5. On `pending`: "Your payment is still being confirmed. Credits appear within a few minutes; check your account page." with "View account" and "Check again", which re-runs the wait.

- [ ] **Step 1: Read** the `@paddle/paddle-js` README in `node_modules` for `Checkout.open` settings and `CheckoutEventNames`; use the enum, not strings. Read sharingan's `CHECKOUT_FLOW.md` (path in the header).
- [ ] **Step 2: Build both pages** as described.
- [ ] **Step 3: Verify:** `cd frontend && npx vitest run && npm run lint && npm run build`. Expected: all green, with both routes in the build output.
- [ ] **Step 4: Commit:** `feat(frontend): Paddle inline checkout and payment confirmation pages`.

### Task 5: `/account` page

**Files:**
- Create:
  - `frontend/src/app/account/page.tsx`, `AccountView.tsx` (client)
  - `frontend/src/app/account/PlanSection.tsx`, `CreditsSection.tsx`, `InvoicesSection.tsx`

**Interfaces:**
- Consumes from Task 2: `Account`, `Invoice`, `formatMoney`, `billingErrorMessage`, `runOnce`, `api.get` / `api.delete`.
- Consumes from Task 3: the `/pricing` route.

**Behaviour:**
- **Data:** load `GET /v1/me` and `GET /v1/billing/invoices` side by side. A failure shows `billingErrorMessage` with "Try again".
- **Plan section:**
  - `subscription.display` with "Monthly" or "Yearly".
  - "Renews on <currentPeriodEnd>"; for the free plan, "Credits refresh on <currentPeriodEnd>".
  - If `nextPlan` is set:
    - for `nextPlan === "free"`: "Your plan ends on <date>.";
    - otherwise: "Changes to <nextPlan> on <date>.";
    - an "Undo" button calls `DELETE /v1/billing/subscription/scheduled-change`, then replaces the subscription with the response's `subscription`.
  - If `paddleStatus === "past_due"`: a notice "Your last payment failed. Paddle will retry; update your card from the link in Paddle's email."
  - A "Change plan" link to `/pricing`.
- **Credits section:**
  - "Available": `credits.available`, large;
  - "Reserved for running jobs": `credits.reserved`, shown only when it is more than 0;
  - a table of grants: Kind (Plan, Carried over, Add-on, Bonus), Remaining, Expires on.
- **Invoices section:**
  - a table of Date (`paidAt`), Item (`item ?? "Credits"`), Amount (`formatMoney`; "—" when null);
  - empty state "No payments yet.";
  - the note "Paddle emails a receipt for every payment."
- **Undo:** wrap it in `runOnce`, and call `notifyCreditsChanged()` after it succeeds.

- [ ] **Step 1: Build the page** as described.
- [ ] **Step 2: Verify:** `cd frontend && npx vitest run && npm run lint && npm run build`. Expected: all green, with `/account` in the build output.
- [ ] **Step 3: Commit:** `feat(frontend): account page with plan, credits and invoices`.

### Task 6: CI/CD

**Files:**
- Create:
  - `.github/workflows/frontend.yml`
  - `.github/workflows/deploy.yml`
  - `infra/deploy.sh` (executable)
- Modify:
  - `.github/workflows/backend.yml`: add `workflow_call:` to `on:`.
  - `infra/setup.sh`: a new step `setup_github_deploy`, run only when `GITHUB_REPO` is set; add it to `main` after `create_scheduler_jobs`, and add its values to `print_summary`.
  - `infra/deploy.env.example`: add `GITHUB_REPO=` (format `owner/name`), with a comment.

**Interfaces:**
- **`deploy.sh` needs:** `GCP_PROJECT_ID`, `GCP_REGION` and `IMAGE_TAG` from the environment. In Actions they come from repo variables, with `IMAGE_TAG=${GITHUB_SHA::7}`.
- **`deploy.sh` does, using the names from `setup.sh`:**
  1. `gcloud builds submit backend --tag <region>-docker.pkg.dev/<project>/pixel-magic/backend:<tag>`;
  2. `gcloud run jobs update pixel-magic-migrate --image <img>`, then `gcloud run jobs execute pixel-magic-migrate --wait`;
  3. `gcloud run services update pixel-magic-worker --image <img>`, then `update-traffic --to-latest`;
  4. the same for `pixel-magic-api`.
- **`deploy.sh` rules:**
  - It never creates resources or touches secrets.
  - If a service or the job is missing, it fails with "Run infra/setup.sh first".
  - Every gcloud call targets the project through `CLOUDSDK_CORE_PROJECT`, as `setup.sh` does.
- **`setup_github_deploy` creates idempotently,** following `setup.sh`'s describe-then-create pattern:
  - enables `iamcredentials.googleapis.com` and `sts.googleapis.com`;
  - a workload identity pool `github`;
  - an OIDC provider `github-actions`:
    - issuer `https://token.actions.githubusercontent.com`;
    - mapping `google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref`;
    - condition `assertion.repository=='<GITHUB_REPO>' && assertion.ref=='refs/heads/main'`;
  - a service account `deployer-sa`, with:
    - `roles/iam.workloadIdentityUser` for `principalSet://iam.googleapis.com/projects/<number>/locations/global/workloadIdentityPools/github/attribute.repository/<GITHUB_REPO>`;
    - on the project: `roles/run.developer`, `roles/cloudbuild.builds.editor`, `roles/serviceusage.serviceUsageConsumer`, `roles/logging.viewer` (to stream build logs);
    - `roles/storage.admin` on `gs://<project>_cloudbuild` only;
    - `roles/iam.serviceAccountUser` on `api-sa` and `worker-sa` only.
- **`print_summary` prints** the four GitHub repository variables to set: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER` (the provider's full resource name) and `GCP_DEPLOY_SA` (the deployer-sa email).

**Workflows:**
- **`frontend.yml`:**
  - runs on `pull_request` with paths `frontend/**`;
  - Node from `frontend/.nvmrc` if it exists, else `22`; npm cache on `frontend/package-lock.json`;
  - `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- **`deploy.yml`:**
  - triggers on `push` to `main` with paths `backend/**`, `infra/**`, `.github/workflows/deploy.yml`, plus `workflow_dispatch`;
  - `concurrency: { group: deploy, cancel-in-progress: false }`;
  - job `test`: `uses: ./.github/workflows/backend.yml`;
  - job `deploy`, `needs: test`, with `permissions: { contents: read, id-token: write }`:
    - checkout;
    - `google-github-actions/auth@v2` with `workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}` and `service_account: ${{ vars.GCP_DEPLOY_SA }}`;
    - `google-github-actions/setup-gcloud@v2`;
    - `bash infra/deploy.sh`, with env from `vars.*` and `IMAGE_TAG`.

- [ ] **Step 1: Write the files** as described. Keep `setup.sh`'s style: the `step` headings, `quiet` describe checks, and no secret printing.
- [ ] **Step 2: Verify:**
  - `bash -n infra/setup.sh && bash -n infra/deploy.sh`: no output.
  - `test -x infra/deploy.sh`.
  - If `actionlint` is installed, run it on `.github/workflows/*.yml`; otherwise parse each file with `node -e "require('yaml')"`, or `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/*.yml`. Expected: no errors.
  - Run `bash infra/setup.sh /dev/null` to confirm it still stops before touching GCP when values are missing.
- [ ] **Step 3: Commit:** `feat(ci): frontend checks, reusable backend checks, main-branch deploy via Workload Identity`.

---

## Phase B: starts after the other session's commit is merged in

**Controller gate:**
1. Merge `feat/frontend-generate` into `feat/frontend-billing`, and resolve any conflicts.
2. Run the full backend suite with its own DB, and frontend `vitest`, lint and build.
3. Continue only when all are green.

From here, the files under `frontend/src/app/generate/`, `frontend/src/lib/generate/` and `frontend/src/lib/api/types.ts` may be modified.

### Task 7: `/creations`

**Files:**
- Create:
  - `frontend/src/app/creations/page.tsx`, `CreationsView.tsx` (client), `CreationCard.tsx`
  - `frontend/src/lib/creations/pages.ts`, `pages.test.ts`

**Interfaces — Produces:**
- `appendPage(current: JobView[], page: JobView[]): JobView[]`: appends, dropping any job whose `jobId` is already present.
- `replaceJob(list: JobView[], job: JobView): JobView[]`.

**Behaviour:**
- **Loading:** `GET /v1/jobs?limit=24`, then "Load more" with `&cursor=<nextCursor>` (encoded) until `nextCursor` is null.
- **Grid:** use `MasonryGrid`. Each card shows:
  - the first output: `Media` for images, `LazyVideo` for videos, picked by `mimeType`;
  - the model's name (look up `model` in `GET /v1/models` by `key`; otherwise show the key);
  - the date and the `creditCost`;
  - a download link to the output `url` with a `download` attribute.
- **Running jobs** (not `completed` or `failed`): show a "Working…" card. One page-level timer every 8000 ms re-fetches each running job with `GET /v1/jobs/:id` and swaps it in with `replaceJob`; it stops when none are left running.
- **Failed jobs:** the job's error message in `text-muted`, and "Credits returned".
- **Empty:** "Nothing here yet." with "Start creating" linking to `/generate`.
- **Errors:** use `messageForError` from `@/lib/generate/messages` with "Try again".

- [ ] **Step 1: Write the failing tests** in `pages.test.ts`:
  - `appendPage` drops duplicates and keeps the order;
  - `replaceJob` swaps by `jobId` and leaves the others alone.
  Run them: `cd frontend && npx vitest run src/lib/creations`. Expected: FAIL.
- [ ] **Step 2: Implement** `pages.ts` and the page.
- [ ] **Step 3: Verify:** `npx vitest run && npm run lint && npm run build`. Expected: all green.
- [ ] **Step 4: Commit:** `feat(frontend): my creations page`.

### Task 8: `/generate` studio redesign and live estimate

**Files:**
- Create: `frontend/src/lib/generate/estimate.ts`, `estimate.test.ts`
- Modify:
  - `frontend/src/app/generate/page.tsx`, `GenerateForm.tsx`, `JobResult.tsx`, `OptionField.tsx`, `fieldClasses.ts`
  - `frontend/src/lib/generate/messages.ts`: `INSUFFICIENT_CREDITS` gains a link to `/pricing`; the copy is "Not enough credits for this job." plus a link "Get more credits".
  - `frontend/src/lib/api/types.ts`: add `Estimate`.

**Interfaces — Produces:**
- `Estimate = { model: string; count: number; tier: string; creditsPerJob: number; totalCredits: number; baseCredits: number; breakdown: { unit: string; label: string; quantity: number; rate: number; credits: number }[] }`.
- `createEstimator(p: { post: (path: string, body: unknown, opts?: { signal?: AbortSignal }) => Promise<Estimate>; delayMs?: number /* 400 */; onResult: (e: Estimate | null) => void; setTimer?: typeof setTimeout; clearTimer?: typeof clearTimeout }): { request(model: PublicModel, input: Record<string, unknown>): void; dispose(): void }`.
- **Path:** `POST /v1/credits/estimate/<plugin>/<operation>` with body `{ input }`, where `input` is built with the same `buildInput` that `submit.ts` uses. The image is left out, because the upload ID doesn't exist yet.
- **Rules:**
  - Each `request` aborts the previous in-flight call and restarts the delay.
  - Only the newest request's result reaches `onResult`.
  - A failure calls `onResult(null)`.

**Layout:**
- `lg` and up: two columns.
  - **Left, 380–420 px, `bg-surface`, rounded, scrolls on its own**, top to bottom:
    1. the model picker as selectable cards (name, kind badge, credits range);
    2. the prompt textarea;
    3. the image drop zone, when the model takes an image;
    4. the options;
    5. a sticky footer with the cost ("≈ N credits", or the model's range while no estimate is in), "You have M", and the full-width Generate button.
  - **Right:** the result canvas (`JobResult`), filling the height. Under it, a "Recent" strip of the last 6 jobs from `GET /v1/jobs?limit=6`, each linking to `/creations`.
- Below `lg`: one column in the same order.
- **Disabled Generate:** when the estimate's `creditsPerJob` is more than the balance, Generate is disabled with "Not enough credits" and a "Get more credits" link to `/pricing`. While the estimate is `null`, the button follows today's rules.
- **Unchanged behaviour:** the existing poll, retry, resume and check-again behaviour must keep working as it does now.

- [ ] **Step 1: Write the failing tests** in `estimate.test.ts`, with fake timers and a stub `post`:
  - (a) three `request`s within 400 ms make one `post`;
  - (b) a slow first response that resolves after a second request's response does not reach `onResult`;
  - (c) `post` rejects, so `onResult(null)` is called;
  - (d) `dispose` cancels the pending timer and aborts the in-flight call;
  - (e) the path is `/v1/credits/estimate/kling21/generate`, with the segments encoded, and the body is `{ input }`.
  Run them: `cd frontend && npx vitest run src/lib/generate/estimate.test.ts`. Expected: FAIL.
- [ ] **Step 2: Implement** `estimate.ts` and the redesign. Check that every existing test in `src/lib/generate` still passes.
- [ ] **Step 3: Verify:** `npx vitest run && npm run lint && npm run build`. Expected: all green.
- [ ] **Step 4: Commit:** `feat(frontend): studio layout for generate with live credit estimate`.

### Task 9: Docs sweep

**Files:** `backend/README.md`, `frontend/README.md`, `infra/deploy.env.example`.

- [ ] **Step 1: `backend/README.md` "Set up Supabase, Google and Vercel":**
  - **Supabase:**
    - the Site URL is the production (Vercel) URL;
    - the redirect URLs are `http://localhost:3000/**` and `https://<your-vercel-domain>/**`, because Supabase matches the whole URL, including `?next=`;
    - Project Settings > JWT Keys must show an asymmetric current key, because the backend verifies tokens via JWKS;
    - the confirmation email link must be opened in the same browser.
  - **`CORS_ORIGINS`:** origins only, with no path or trailing slash; Vercel preview URLs aren't covered.
  - **Vercel:** add `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` and `NEXT_PUBLIC_PADDLE_ENV`; Vercel deploys on every push through its Git integration.
- [ ] **Step 2: `backend/README.md` "Paddle sandbox setup":**
  - step 3's default payment link becomes `https://<your-vercel-domain>/checkout`;
  - add creating a client-side token for the frontend.
- [ ] **Step 3: `backend/README.md`, a new section "CI/CD (GitHub Actions)":**
  - what each workflow does;
  - set `GITHUB_REPO` in `deploy.env` and re-run `setup.sh`;
  - the four repository variables to add under Settings > Secrets and variables > Actions > Variables;
  - deploys run on push to `main` (backend or infra) or by hand from the Actions tab;
  - roll back as in "Roll back".
- [ ] **Step 4: Add rows to the Endpoints table only if needed.** The invoices row text stays the same.
- [ ] **Step 5: `frontend/README.md`:** the new pages, the two new env vars, and a sandbox test card note pointing to Paddle's docs.
- [ ] **Step 6: `infra/deploy.env.example`:** fix the `TIERED_CREDIT_MAPPING` example key to the current model key, read from `backend/src/models/registry.ts`.
- [ ] **Step 7: Verify:** the backend full suite with its own DB is green (the README example mapping is parsed by tests), and `grep -n "auth/callback" backend/README.md` shows no exact-path redirect entries.
- [ ] **Step 8: Commit:** `docs: billing, checkout, CI/CD and Supabase setup`.
