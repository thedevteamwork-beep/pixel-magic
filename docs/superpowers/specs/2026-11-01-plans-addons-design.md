# Pixel Magic plans and add-ons — design

- **Date:** 2026-11-01
- **Status:** Draft for review. The user approved the rules in chat on 2026-11-01; this document is under review.
- **Builds on:** [2026-10-28-backend-design.md](2026-10-28-backend-design.md). This document **replaces** that design's credit wallet, its "credits roll over" rule, its Paddle price→credits map and its `subscriptions` table. Everything else there still applies (schema `app`, Knex, Express, the job flow, webhook verification, testing).
- **Reference:** Pixelbin's billing service Rupika (`~/Desktop/Azure Repo/Pixelbin/services/rupika`) and its metering service Shin (`services/shin`).

## 1. Intent

Pixel Magic sells credits the way Pixelbin does: through **plans** (subscriptions that give credits every billing period) and **add-ons** (one-time credit packs with their own expiry). The user asked for the same tables and flows as Pixelbin, so a team that knows Rupika can read this code straight away.

Rupika's flows are copied, but the gaps found while reading it are fixed. The main ones:

- an immediate yearly downgrade loses the unused credits;
- monthly → yearly on the same tier counts as a "downgrade", because per-month prices are compared;
- webhook dedupe isn't atomic;
- a failed cancel of the old Paddle subscription is only logged.

§12 lists every deliberate difference.

**Why correctness matters.** Users pay real money for credits, and every credit spent costs us real money at fal. A payment must grant credits exactly once, a user must never have two live subscriptions charging them, and expired credits must never be spendable.

## 2. Goals, non-goals, anti-goals

### Goals (v1)

1. A catalog of plans and add-ons stored in the database, like Rupika's `plans`, `features`, `planFeatures`, `addons` and `addonFeatures`.
2. Every user starts on a **Free plan** that gives a set number of credits each month.
3. Users buy a plan or an add-on through a Paddle checkout created by the backend.
4. Paddle renews paid plans automatically. Each new period grants fresh plan credits.
5. Upgrades, downgrades and cancellation follow Pixelbin's timing. **Leftover plan credits move over on every upgrade and downgrade.**
6. Spending follows Shin's order: plan credits first, then add-ons, soonest-expiring first.
7. Every expiry is configurable: credit validity per plan, duration per add-on, and the carryover window.

### Non-goals (v1)

- An admin API or panel. The catalog is managed with seed files and migrations (§3.2 call 14).
- Refunding money for unused time. Pixelbin doesn't do this either.
- Overage billing, postpaid plans, coupons and promotions, Apple and Google in-app purchases, teams and orgs.
- Enforcing features other than `credits`. The `features` table exists so others can be added later.
- Frontend billing pages. The backend exposes the API only.
- Multiple currencies. Everything is USD.

### Anti-goals (failure even if everything else works)

- One Paddle payment grants credits twice, or grants nothing.
- A user has two active subscriptions, or keeps paying for an old Paddle subscription after moving plans without anyone noticing.
- Credits can be spent after they expire. The only exception is a carryover, which extends credits by rule (§5.4).
- Leftover plan credits are lost on an upgrade or downgrade.
- A plan change leaves Paddle and the database disagreeing about what happens at the end of the period.
- A webhook is acted on without verifying its signature.

## 3. Decisions

### 3.1 Made by the user (2026-11-01)

- **The Pixelbin way.** Plan credits reset at every renewal, and unused ones are lost. Add-ons expire on their own date. Plan credits are spent first, then add-ons by soonest expiry. This replaces the 2026-10-28 "credits roll over" decision.
- **Plan credit expiry is configurable** so it can be lengthened later. Each plan has a `credit_validity_days` value; by default credits last for the billing period.
- **Leftover credits move over on both upgrade and downgrade.**
- The user approved this playback in chat ("all is good"):
  - Upgrade: immediate, with a new checkout at the full price of the new plan.
  - Monthly → cheaper monthly: at the end of the period.
  - Yearly downgrade or interval change: immediate.
  - Leftover credits become carryover credits for a configurable number of days, 30 by default. Carryover and add-on credits are never moved again.
  - Cancel to Free: the paid plan runs to the end of the period, and its credits aren't moved over.
  - No money refunds.
  - The Free plan replaces `SIGNUP_CREDITS`.
  - Paddle renews paid plans, and an hourly job renews Free plans.
  - Only the `credits` feature is used.
  - The catalog is set up with seed files, and each item is registered on Paddle at its first purchase.

### 3.2 Claude's calls (for the user to check)

1. **Upgrade or downgrade is decided by the plan's `priority` (tier), not its price.** A higher priority is an upgrade. On the same tier, monthly → yearly is an upgrade and yearly → monthly is a downgrade. Rupika compares per-month prices, so monthly Pro → yearly Pro counts as a downgrade there.
2. **`amount` is the price charged per billing period**, which is what Paddle charges. Rupika stores a per-month figure and multiplies it by 12 for yearly plans.
3. **Carryover happens in place.** The old plan's credit grant is relabelled `carryover`, and its expiry becomes `GREATEST(current expiry, change time + CARRYOVER_VALIDITY_DAYS)` (§5.4). No credits are copied. Rupika creates a new custom add-on row for every carryover. Doing it in place keeps jobs that are mid-flight consistent, and it never shortens an expiry: yearly leftovers keep their year if that's longer than 30 days.
4. **Leftover Free-plan credits aren't carried over** when the user buys a plan. This matches Rupika's proration, which skips free plans.
5. **A partial unique index allows only one active subscription per user.** The database enforces this, not the code.
6. **There's no `renewal_pending` status, proration cron or billing status.** Rupika needs them because the billing and metering services are separate. Here, every change happens in one database transaction.
7. **The backend creates the Paddle transaction**, as Rupika does. Checkout transactions therefore arrive with origin `api` and `custom_data.checkout = "true"`, and renewals arrive with origin `subscription_recurring`. This corrects the backend design, which expected `web`.
8. **A failed cancel of the old Paddle subscription is retried.** The row gets `paddle_cancel_pending = true`, and the hourly billing sweep retries it. Rupika only logs this to Sentry.
9. **Plan changes are blocked within 60 minutes of renewal** (`PLAN_CHANGE_LOCK_MINUTES`), as in Rupika.
10. **Releasing credits back onto an expired grant loses them.** This only happens if a job was reserved just before its grant expired and then failed; those credits would have expired unused anyway.
11. **Catalog items are snapshotted when they're used.** A grant copies its credits and expiry when it's created, so editing a plan later only affects new periods. A price change means a new plan row with a new `name`, and the old row is `archived`, because Paddle prices are fixed.
12. **Registering an item on Paddle locks the catalog row** (`SELECT … FOR UPDATE`), so two first purchases at the same moment can't create two Paddle prices. Rupika's `onboardToPaddle` has no lock.
13. **An unpaid checkout is reused** if the same user asks for the same item within `CHECKOUT_REUSE_MINUTES` (30). A double click then opens the same Paddle checkout instead of two that could both be paid.
14. **Seed data lives in a Knex seed file** (`src/db/seeds/catalog.ts`) that upserts by `name`. Changing the catalog means editing that file and running `npm run seed`.
15. **Plan grants get a short grace period after the period ends** (`RENEWAL_GRACE_MINUTES`, 60). Paddle's renewal webhook arrives after the period ends, and the Free sweep runs hourly. Without the grace, a paying user would have zero credits in between. Pixelbin behaves the same way: Shin keeps counting against the old row until the renewal is processed.
16. **A downgrade that happens at renewal carries over the old period's credits even if they expired before the webhook arrived.** The carryover is measured from the new period's start (`billing_period.starts_at`), not from when the webhook arrives. A replay gives the same result, and a payment that recovers late gets a shorter carryover, not a longer one (§5.4).
17. **Paused subscriptions aren't offered, and Paddle must be set so that failed renewals end in cancellation.** While a renewal is `past_due`:
    - upgrades and immediate downgrades are allowed, because they're new checkouts that replace the failing subscription;
    - cancelling cancels the Paddle subscription immediately, and the user moves to Free;
    - scheduled changes are refused with `409 PAYMENT_PAST_DUE`.

    The user gets no fallback credits while the payment is failing; only add-ons and carryover can be spent. This matches Pixelbin, where usage keeps counting against the old row.
18. **Changes made in Paddle are copied into our database.** A customer can cancel in Paddle's portal and staff can edit in the dashboard, so `subscription.updated` is treated as the truth for what happens at the end of the period, and `next_plan_id` is set from it (§6.3). Before any change, the API reads the live Paddle subscription rather than trusting the DB. Rupika does part of this in `handleExternalScheduledDowngradeRevert`.
19. **A move between two plans on the same tier and interval** (for example, from an archived `pro_monthly` to `pro_monthly_v2`) is an upgrade if the new price is higher, and is applied at the next renewal otherwise. Subscribers on an archived plan stay on it until they change plans themselves. Moving them in bulk is a manual script, not part of v1.
20. **Buying a plan ends the leftover Free credits immediately.** This is the only case where closing a row shortens a grant (§5.4). In Rupika, usage stops counting against the old row in the same way.

## 4. Data model (schema `app`)

These tables follow the backend design's rules: UUID ids, `timestamptz`, integer credits, RLS on with no policies, and no privileges for `anon` or `authenticated`. Money is `numeric(12,2)` in USD.

### 4.1 Catalog

**`features`**: `id`, `name` (unique, e.g. `credits`), `display`, `description`, `created_at`, `updated_at`.

**`plans`**

| Column | Notes |
|---|---|
| `id` | |
| `name` | Unique slug used by the API and config, e.g. `free`, `starter_monthly`, `pro_yearly` |
| `display`, `description` | Shown to users |
| `priority` | Tier rank. Free = 0. Decides upgrade or downgrade (§3.2 call 1). |
| `interval` | `monthly` or `yearly` |
| `amount`, `currency` | Price per interval. Free = 0. |
| `credit_validity_days` | Nullable. Null means credits last for the billing period. Set it (≥ 1) to make plan credits last longer or shorter. |
| `custom` | Hidden and not purchasable, like Rupika's custom plans |
| `archived` | Not offered for new purchases. Existing subscribers keep it. |
| `paddle_product_id`, `paddle_price_id` | Nullable and unique. Filled at the first purchase (§3.2 call 12). |
| `metadata` (jsonb), `created_at`, `updated_at` | |

**`plan_features`**: `plan_id`, `feature_id`, `quantity` (integer). Unique `(plan_id, feature_id)`. A plan's credits per period = the `quantity` for the `credits` feature. For a yearly plan this is the whole year's credits, granted at once, as in Pixelbin.

**`addons`**: `id`, `name` (unique), `display`, `description`, `amount`, `currency`, `duration_days` (not null, ≥ 1), `custom`, `archived`, `paddle_product_id`, `paddle_price_id`, `metadata`, `created_at`, `updated_at`.

**`addon_features`**: `addon_id`, `feature_id`, `quantity`. Unique `(addon_id, feature_id)`.

**Sample catalog**

```
plans
name             | display | priority | interval | amount | credit_validity_days
free             | Free    | 0        | monthly  | 0.00   | null
starter_monthly  | Starter | 1        | monthly  | 10.00  | null
pro_monthly      | Pro     | 2        | monthly  | 30.00  | null
pro_yearly       | Pro     | 2        | yearly   | 300.00 | null

plan_features (credits)          addons
free             50              name          | amount | duration_days | credits
starter_monthly  500             credits_1000  | 20.00  | 30            | 1000
pro_monthly      2000
pro_yearly       24000
```

The real names, prices and credits are still open (§11).

### 4.2 Purchases

**`subscriptions`**: one row per billing period, as in Rupika. Renewals and plan changes close the current row and open a new one.

| Column | Notes |
|---|---|
| `id`, `user_id`, `plan_id` | |
| `next_plan_id` | The plan for the next period. Defaults to `plan_id`. A different paid plan means a scheduled downgrade; the Free plan means a scheduled cancellation. |
| `status` | `active`, `renewed`, `upgraded`, `downgraded`, `canceled` |
| `active` | Boolean |
| `started_at`, `current_period_start`, `current_period_end`, `canceled_at` | |
| `previous_subscription_id` | The row this one replaced. Makes the history easy to follow. |
| `invoice_id` | The payment that opened this row. Null for Free. |
| `paddle_subscription_id` | Null for Free. Successive rows on the same Paddle subscription share it. |
| `paddle_status` | Mirrors Paddle's status: `active`, `past_due`, `paused`, `canceled` |
| `paddle_cancel_pending` | True while the old Paddle subscription still has to be cancelled (§3.2 call 8) |
| `last_event_occurred_at` | Ignores older Paddle events that arrive late |
| `metadata`, `created_at`, `updated_at` | |

Indexes:
- Unique `(user_id) WHERE active`: one active subscription per user.
- Unique `(paddle_subscription_id) WHERE active`.
- `(current_period_end) WHERE active`, for the sweep.
- `(paddle_cancel_pending) WHERE paddle_cancel_pending`.

**`invoices`**: one row per Paddle transaction, as in Rupika, which stores Paddle transactions as invoices.

| Column | Notes |
|---|---|
| `id`, `user_id` | |
| `paddle_transaction_id` | Unique. Nullable only between inserting the draft and Paddle replying. |
| `item_type`, `item_id` | `plan` or `addon`, and that item's id |
| `change_type` | `new`, `upgrade` or `downgrade`. Null for add-ons and renewals. |
| `from_subscription_id` | The active row when the checkout was opened |
| `status` | `draft`, `paid`, `canceled`, `past_due` |
| `origin` | Paddle's `origin`: `api`, `subscription_recurring`, … |
| `amount`, `currency`, `checkout_url` | |
| `paddle_subscription_id`, `billing_period_start`, `billing_period_end` | From the completed transaction |
| `paid_at`, `created_at`, `updated_at` | |

**`customer_addons`**: `id`, `user_id`, `addon_id`, `invoice_id` (unique, nullable for free or manual add-ons), `bought_at`, `expires_at`, `created_at`. There's no `active` column; expiry is decided by the date alone (Rupika's `active` column is never updated).

**`payment_events`**: unchanged from the backend design. `paddle_event_id` is unique, which makes webhook dedupe atomic.

### 4.3 Credits (replaces `credit_wallets` and the old `credit_ledger`)

**`credit_grants`**: one credit pot each. Pixelbin's Shin tracks usage per subscription row and per add-on; a grant is the same idea, as a table.

| Column | Notes |
|---|---|
| `id`, `user_id` | |
| `kind` | `plan`, `carryover`, `addon`, `manual` |
| `subscription_id` | For `plan` and `carryover` grants |
| `customer_addon_id` | For `addon` grants |
| `total`, `used`, `reserved` | Integers. Check: `used ≥ 0`, `reserved ≥ 0`, `used + reserved ≤ total`. |
| `starts_at`, `expires_at` | |
| `converted_at` | When a `plan` grant became `carryover` |
| `created_at`, `updated_at` | |

- Unique `(subscription_id) WHERE subscription_id IS NOT NULL`, and unique `(customer_addon_id) WHERE customer_addon_id IS NOT NULL`. Granting twice for the same period or purchase is therefore impossible.
- Index `(user_id, expires_at)`.

**`credit_allocations`**: which grants paid for a job.

- Columns: `id`, `job_id`, `grant_id`, `amount` (> 0), `status` (`reserved`, `captured`, `released`), `created_at`, `updated_at`.
- Unique `(job_id, grant_id)`.

**`credit_ledger`**: append-only audit.

- Columns: `id`, `user_id`, `grant_id`, `job_id`, `invoice_id`, `type` (`grant`, `reserve`, `capture`, `release`, `convert`, `adjust`), `amount`, `note`, `created_at`.
- Idempotency comes from the grant and allocation constraints above, not from the ledger.

**Sample history.** A user signs up on 1 Jan, buys Pro monthly on 10 Jan, renews on 10 Feb, schedules a downgrade to Starter on 20 Feb, and the downgrade happens on 10 Mar.

```
subscriptions
id | plan    | next_plan | status     | active | period            | paddle_sub
S1 | free    | free      | upgraded   | false  | 1 Jan  → 10 Jan   | null
S2 | pro_m   | pro_m     | renewed    | false  | 10 Jan → 10 Feb   | sub_01
S3 | pro_m   | starter_m | downgraded | false  | 10 Feb → 10 Mar   | sub_01
S4 | starter | starter_m | active     | true   | 10 Mar → 10 Apr   | sub_01

credit_grants
sub | kind      | total | used | expires_at
S1  | plan      | 50    | 20   | 10 Jan   (cut to the purchase time; Free leftovers are not carried over)
S2  | plan      | 2000  | 2000 | 10 Feb + 1 h grace
S3  | carryover | 2000  | 1200 | 9 Apr    (was "plan"; 800 left moved over at 10 Mar, + 30 days)
S4  | plan      | 500   | 0    | 10 Apr + 1 h grace
```

## 5. Credits

### 5.1 Grants and their expiry

| Grant | Created when | `total` | `expires_at` |
|---|---|---|---|
| `plan` | A subscription row opens (signup, purchase, renewal, plan change) | The plan's `credits` quantity | `period_start + credit_validity_days`, or `period_end` if that's null, plus `RENEWAL_GRACE_MINUTES` (§3.2 call 15) |
| `carryover` | Not created: a `plan` grant is converted at an upgrade or downgrade (§5.4) | Unchanged | `GREATEST(expires_at, t + CARRYOVER_VALIDITY_DAYS)` |
| `addon` | An add-on purchase completes | The add-on's `credits` quantity | `bought_at + duration_days` |
| `manual` | `npm run credits:grant -- <userId> <n> <days>` | `n` | `now + days` |

A grant can be spent while `starts_at ≤ now < expires_at`. Expiry is passive: nothing runs at expiry, and the date check alone stops spending.

### 5.2 Spending order

`ORDER BY (kind <> 'plan'), expires_at, created_at`

Plan grants come first, then everything else. Within each group the soonest expiry is spent first. This is Shin's `meterUsage` order (plan first, then add-ons sorted by `expiresAt`), with carryover and manual grants counted as add-ons.

### 5.3 Reserve, capture, release (used by the job flow)

**Reserve**, inside the job-creation transaction:

1. `SELECT … FROM profiles WHERE id = $user FOR UPDATE`. This is the per-user lock and replaces the wallet row lock.
2. Select the user's spendable grants with `total - used - reserved > 0`, in spending order, `FOR UPDATE`.
3. Take from each grant in turn until the job's cost is covered. If the grants together aren't enough, roll back and return `402 INSUFFICIENT_CREDITS`. The check fails closed.
4. For each grant used, increase its `reserved` and insert an allocation (`reserved`) and a ledger row.

**Capture** (job completed):
- `UPDATE credit_allocations SET status = 'captured' WHERE job_id = ? AND status = 'reserved' RETURNING grant_id, amount`.
- For each row returned, move `amount` from `reserved` to `used` on that grant.
- This is allowed even if the grant has expired in the meantime, because the reservation was valid when it was made.

**Release** (job failed):
- The same compare-and-set to `released`, then reduce `reserved`.
- A second capture or release finds no `reserved` rows and does nothing.

**Available credits** = the sum of `total - used - reserved` over spendable grants.

### 5.4 Carryover (upgrade and downgrade only)

When a plan change takes effect (§6.4, §6.5, §6.6), in the same transaction. `t` is the moment the change takes effect: `now()` for a checkout, and the transaction's `billing_period.starts_at` for a downgrade at renewal (§3.2 call 16).

```
UPDATE credit_grants
   SET kind = 'carryover',
       converted_at = now(),
       expires_at = GREATEST(expires_at, t + CARRYOVER_VALIDITY_DAYS days)
 WHERE user_id = ? AND kind = 'plan'
   AND (expires_at > t OR subscription_id = <closing row A>)
   AND subscription_id IN (<the user's paid subscriptions>)
```

- The `subscription_id = A` condition catches A's own grant even if it expired before a late renewal webhook arrived.
- Free-plan grants are excluded (§3.2 call 4). Instead, when a Free row is closed by a purchase, its grant gets `expires_at = LEAST(expires_at, now())` (§3.2 call 20).
- Grants that are already `carryover`, `addon` or `manual` never match, so carryover can't be chained to keep credits forever.
- Normal renewals and cancellations don't convert anything; their plan grant simply runs to its own `expires_at`.
- A ledger row of type `convert` records each converted grant.

## 6. Flows

### 6.1 First API call (signup)

In the same transaction that upserts the profile:
- If the user has no subscription, insert a Free row: `active`, period `now → now + 1 month`.
- Insert its `plan` grant.

The unique active-subscription index makes this safe when two first calls race.

### 6.2 Opening a checkout

**`POST /v1/billing/subscription {plan}`**. This is one endpoint for buy, upgrade, downgrade and cancel, like Rupika's `POST /subscriptions`. It follows these steps:

1. **Load** the active row and its plan. The target plan must exist and not be `custom` or `archived`, otherwise return `422 PLAN_NOT_AVAILABLE`.
2. **Target is the current plan:**
   - If a change is scheduled, this is a revert (§6.7).
   - Otherwise return `409 ALREADY_ON_PLAN`.
3. **Read the live Paddle subscription** (`GET /subscriptions/{id}`), if the active row is paid. Use its period end and scheduled change from now on (§3.2 call 18).
4. **Renewal lock:** if `0 < period end - now < PLAN_CHANGE_LOCK_MINUTES`, return `409 RENEWAL_IN_PROGRESS`.
5. **Past due:** if Paddle's status is `past_due`, apply the §3.2 call 17 rules. A scheduled change returns `409 PAYMENT_PAST_DUE`, and a cancel is sent to Paddle with `effective_from: immediately`.
6. **Work out the change type** (§3.2 call 1) and the action:

| From → to | Change type | Action |
|---|---|---|
| Free → any paid | `new` | Now: checkout |
| Higher priority, or same priority monthly → yearly | `upgrade` | Now: checkout |
| Paid → Free | cancel | At period end: Paddle `cancel` with `effective_from: next_billing_period`; `next_plan_id = free` |
| Downgrade where the old plan is yearly **or** the interval changes | `downgrade` | Now: checkout |
| Monthly → lower-priority monthly | `downgrade` | At period end: Paddle `PATCH /subscriptions/{id}` with the new price and `proration_billing_mode: do_not_bill`; `next_plan_id = target` |
| Same priority and same interval, higher `amount` | `upgrade` | Now: checkout (§3.2 call 19) |
| Same priority and same interval, same or lower `amount` | `downgrade` | At period end, as the row above |

7. **Now → checkout:**
   - Make sure the user has a Paddle customer (`profiles.paddle_customer_id`) and the plan has a Paddle price (§3.2 call 12).
   - Reuse an unpaid draft invoice for the same item if one exists (§3.2 call 13). Otherwise insert a draft invoice and create a Paddle transaction with `custom_data { userId, invoiceId, checkout: "true" }`.
   - Return `200 {action: "checkout", transactionId, checkoutUrl}`. The frontend opens Paddle.js with `transactionId`. The old plan stays active until payment, so nothing changes if the user never pays.
8. **At period end → scheduled:** return `200 {action: "scheduled", effectiveAt: current_period_end}`.

**Keeping Paddle and the DB in step.** Make the Paddle calls first and update the DB only after they all succeed. If a later Paddle call fails, undo the earlier ones, return `502 PAYMENT_PROVIDER_ERROR` and leave the DB unchanged. Any new change first clears a previously scheduled change, as Rupika's `removeSubScheduledChange` does. This rule exists to avoid Rupika's gap, where clearing a scheduled cancel and then failing the price change leaves no cancel scheduled.

**`GET /v1/billing/subscription/preview?plan=`** returns `{changeType, action, effectiveAt, description}` without changing anything. It uses the same descriptions as Rupika's `getActionType`, for example "You'll be moved to the Starter plan at the end of your current billing cycle."

**`POST /v1/billing/addons {addon}`** follows the same checkout steps with the add-on's one-time Paddle price (`billing_cycle: null`). Any user can buy one, including Free users.

### 6.3 Paddle webhook routing

Signature checks and `payment_events` dedupe are as in backend design §7.5. Then the event is routed, as in Rupika's `handlePaddlePaidInvoice`:

| Event | Origin or condition | Handler |
|---|---|---|
| `transaction.completed` | `api` and `custom_data.checkout = "true"` | Plan checkout (§6.4) or add-on checkout (§6.8), chosen by the invoice's `item_type` |
| `transaction.completed` | `subscription_recurring` | Renewal (§6.5) |
| `transaction.completed` | `subscription_payment_method_change`, `subscription_update` | Record the invoice only |
| `subscription.canceled` | | Cancellation (§6.7) |
| `subscription.updated`, `subscription.past_due` | Only if `occurred_at > last_event_occurred_at` | Update `paddle_status`, and set `next_plan_id` from Paddle (§3.2 call 18): a scheduled cancel → Free; no scheduled change and the current price → `plan_id`; a different price → that price's plan, or log an error if the price is unknown |
| `subscription.paused` | | Update `paddle_status` and log at `ERROR`. Pausing isn't offered (§3.2 call 17). |
| Anything else | | Record only |

The webhook always returns `200` once the event is recorded. Unexpected data, such as an unknown user, price or subscription, is logged as an error and not retried.

### 6.4 Plan checkout completed

In one transaction:

1. Mark the invoice `draft → paid` with a compare-and-set. If it was already `paid`, stop: this is a repeat.
2. Lock the profile and load the **current** active row A. It may differ from the invoice's `from_subscription_id` if something changed since the checkout was opened. Always work from the current row.
3. **Close A:**
   - Set `active = false`, `canceled_at = now`, `current_period_end = now`.
   - Set `status` to `upgraded` or `downgraded`, worked out against A's plan.
   - If A has a Paddle subscription other than the new one, set `paddle_cancel_pending = true`.
4. **Handle A's leftover plan credits** (§5.4). If A is paid, convert them with `t = now()`. If A is Free, end its grant now.
5. **Open the new row B:**
   - `active`, with the plan from the invoice and the period from the transaction's `billing_period`.
   - Fill `paddle_subscription_id`, `invoice_id` and `previous_subscription_id = A`.
6. **Insert B's `plan` grant.**

After the commit, cancel A's Paddle subscription immediately: remove any scheduled change, then cancel with `effective_from: immediately`. Then clear `paddle_cancel_pending`. If the cancel fails, leave the flag set; the sweep retries it (§6.9).

### 6.5 Renewal (`subscription_recurring`)

1. Insert the invoice by `paddle_transaction_id`. If it's already `paid`, stop.
2. Find the active row A by `paddle_subscription_id`. If there's none, the subscription was already replaced: log and stop.
3. If `billing_period.starts_at ≤ A.current_period_start`, the renewal is already applied: stop.
4. Work out the new plan from the transaction's `price_id`. The price Paddle actually charged is the truth.
   - **Same plan as A (normal renewal):**
     - A becomes `renewed` and inactive.
     - B opens on the same plan with the new `billing_period` and gets a fresh `plan` grant.
     - A's grant isn't touched. It expires on its own date, which is "use it or lose it".
   - **A different plan (scheduled downgrade):**
     - A becomes `downgraded`.
     - A's plan credits are converted (§5.4) with `t = billing_period.starts_at`, including A's own grant if it has already expired.
     - B opens on the new plan and gets a `plan` grant.
     - If the price doesn't match `next_plan_id`, log an error and still use the price.

### 6.6 Immediate downgrade

Yearly → anything cheaper, or any interval change, goes through the same checkout as an upgrade (§6.2 step 7 and §6.4). The only difference is that A's status is `downgraded`. The leftover credits are converted, which fixes Rupika's loss.

### 6.7 Cancel, revert and failed payments

**Cancel**
- `POST /v1/billing/subscription {plan: "free"}` schedules the cancellation (§6.2).
- At the end of the period, Paddle sends `subscription.canceled`. If it's for the active row, A becomes `canceled` and a Free row and its grant open.
- A's credits are **not** converted. They expire on their own date.
- If the event is for a row that isn't active, for example the old subscription cancelled after an upgrade, only record it. This is the same check as Rupika's `handleExternalCancellation`.

**Revert**
- `DELETE /v1/billing/subscription/scheduled-change`, or a request for the current plan, undoes a scheduled downgrade or cancel.
- For a scheduled downgrade, Paddle gets a `PATCH` back to the current price with `do_not_bill`. For a scheduled cancel, it gets `scheduled_change: null`.
- Then `next_plan_id = plan_id`.

**Failed renewal payment**
- Paddle keeps the subscription `past_due` and retries the payment itself. No new grant is created until a `transaction.completed` arrives. Once the last period's grant and its grace have passed, the user has no plan credits (§3.2 call 17).
- If the payment recovers, the renewal flow (§6.5) runs as normal, with the period Paddle billed.
- If Paddle finally cancels the subscription, the cancellation flow above moves the user to Free.
- **Setup requirement:** in Paddle, configure failed-payment handling (dunning) to end in cancellation, and don't enable pausing.

### 6.8 Add-on checkout completed

In one transaction:
1. Mark the invoice `draft → paid` with a compare-and-set, or stop if it's already paid.
2. Insert `customer_addons` with `bought_at = now` and `expires_at = now + duration_days`.
3. Insert the `addon` grant with the same expiry.

The unique `invoice_id` and `customer_addon_id` constraints make a replay a no-op.

### 6.9 Billing sweep (`/tasks/billing-sweep`, Cloud Scheduler hourly)

This runs on the worker, with Cloud Run IAM, like the reconciler. It handles up to 500 rows per run.

| Finds | Does |
|---|---|
| Active Free rows with `current_period_end ≤ now` | Renew: A becomes `renewed`, and B opens on Free for `now → now + 1 month` with a fresh grant. It doesn't backfill missed months. |
| Rows with `paddle_cancel_pending` | Retry the immediate Paddle cancel, then clear the flag. After 24 h of failures, log at `ERROR` every run so it gets noticed. |
| Draft invoices older than 24 h | Mark them `canceled`, so the reuse rule (§3.2 call 13) stops offering them |
| Active paid rows whose period ended more than 7 days ago, or that are `paused` | Log at `ERROR`; take no action. Something is stuck between Paddle and us. |

## 7. API

All routes require a user except where marked public. Errors use the backend design's error body.

| Method | Path | Success | Notable errors |
|---|---|---|---|
| GET | `/v1/plans` (public) | `200 [{name, display, description, interval, amount, currency, credits, creditValidityDays, priority}]`, with no custom or archived rows | — |
| GET | `/v1/addons` (public) | `200 [{name, display, description, amount, currency, credits, durationDays}]` | — |
| GET | `/v1/me` | `200 {userId, email, credits: {available, reserved, grants: [{kind, remaining, expiresAt}]}, subscription: {plan, interval, status, currentPeriodEnd, nextPlan, paddleStatus}}` | 401 |
| GET | `/v1/billing/subscription/preview?plan=` | `200 {changeType, action, effectiveAt, description}` | 409, 422 |
| POST | `/v1/billing/subscription` `{plan}` | `200 {action: "checkout", transactionId, checkoutUrl}` or `200 {action: "scheduled", effectiveAt}` | 409 `ALREADY_ON_PLAN`, 409 `RENEWAL_IN_PROGRESS`, 422 `PLAN_NOT_AVAILABLE`, 502 |
| DELETE | `/v1/billing/subscription/scheduled-change` | `200 {subscription}` | 409 `NO_SCHEDULED_CHANGE`, 502 |
| POST | `/v1/billing/addons` `{addon}` | `200 {action: "checkout", transactionId, checkoutUrl}` | 422, 502 |
| GET | `/v1/billing/invoices` | `200 [{id, itemType, item, amount, currency, status, paidAt}]`, paid only, newest first | — |
| POST | `/tasks/billing-sweep` (Cloud Run IAM) | `200 {counts}` | — |

## 8. Config

New variables:

| Variable | Default | Meaning |
|---|---|---|
| `FREE_PLAN_NAME` | `free` | The plan given to every new user, and the target of a cancellation |
| `CARRYOVER_VALIDITY_DAYS` | `30` | Minimum days leftover credits stay usable after a plan change (Rupika's `PRORATED_CREDITS_DURATION`) |
| `PLAN_CHANGE_LOCK_MINUTES` | `60` | No plan changes this close to renewal |
| `CHECKOUT_REUSE_MINUTES` | `30` | Reuse an unpaid checkout for the same item |
| `RENEWAL_GRACE_MINUTES` | `60` | How long plan credits stay spendable after their period ends, so they last until the renewal arrives |
| `PADDLE_ENV` | `sandbox` | `sandbox` or `production`; selects the Paddle API base URL |

Removed from the backend design: `PADDLE_PRICE_CREDITS` and `SIGNUP_CREDITS`.

## 9. Tests that must exist

These are in addition to the backend design's list. They run against Postgres, with a fake Paddle client.

- **Spending order.** It's correct across plan, carryover and add-on grants. Expired grants are never spent. Concurrent reservations never overspend across several grants.
- **Capture and release.** A capture after the grant has expired still works. A second capture or release does nothing.
- **Every row of the §6.2 matrix** gets the right change type and action, including Free → paid, same-tier monthly ↔ yearly, and paid → Free.
- **Upgrade.** The old row is closed, the new row opens, leftover plan credits become carryover with the `GREATEST` expiry, and `paddle_cancel_pending` is set and then cleared.
- **Immediate yearly → monthly.** Leftover credits are carried over, and a 10-month yearly leftover keeps its longer expiry.
- **Scheduled downgrade.** It becomes a downgrade at renewal, with leftovers carried over, including when the webhook arrives after the old grant and its grace have expired. A renewal that recovers late gets its carryover measured from the billed period's start. A normal renewal carries nothing over.
- **Free → paid.** The Free grant ends at once, and the paid grant is spent next.
- **Same tier, same interval.** A higher price applies now; the same or a lower price applies at renewal.
- **Past due.** Scheduled changes return `409 PAYMENT_PAST_DUE`, a cancel is immediate and moves the user to Free, and an upgrade checkout replaces the failing subscription.
- **Changes made in Paddle.** A `subscription.updated` carrying a scheduled cancel, a removed scheduled change or a new price sets `next_plan_id` correctly. An older one that arrives late is ignored.
- **Grace period.** Plan credits stay spendable for `RENEWAL_GRACE_MINUTES` after the period ends, and not after that.
- **Cancel.** The user moves to Free at `subscription.canceled` with nothing carried over. A cancel event for an inactive row is ignored.
- **Carryover never chains.** After a downgrade followed by an upgrade, the first carryover keeps its own expiry.
- **Replays.** Repeated or out-of-order webhooks for checkout, renewal and add-ons grant exactly once, and a late, older `subscription.updated` is ignored.
- **One active subscription.** Two checkouts that both get paid still leave one active row, and both old Paddle subscriptions are flagged for cancel.
- **Paddle failure mid-change.** When the second Paddle call fails, the first is undone and the DB is unchanged.
- **Sweep.** It renews expired Free rows once, retries pending cancels, and expires old drafts.

## 10. Milestones (replaces backend design milestone 3)

- **Milestone 1 (skeleton)** now creates these tables instead of the wallet. "`GET /v1/me` returns a wallet" becomes "`GET /v1/me` returns credits and a Free subscription".
- **Milestone 2 (generation)** reserves, captures and releases through grants (§5.3). Its end-to-end check becomes: available credits drop by the job's cost, and nothing stays reserved.
- **Milestone 3 (plans and add-ons)**
  - The catalog seed with placeholder plans and one add-on, and Paddle registration.
  - Checkout, the webhook routing, renewal, plan changes, cancel and revert.
  - Add-ons, the billing sweep and the §7 API.
  - *Done when:* every §9 test passes, and in the Paddle sandbox all of these work, each granting credits exactly once even when the webhook is replayed:
    - buying Starter;
    - upgrading to Pro;
    - scheduling a downgrade and letting it renew (using a sandbox subscription with a short billing period);
    - cancelling;
    - buying an add-on.

## 11. Open questions for the user

1. **The launch catalog:** plan names, prices, credits per period and the Free plan's credits, plus the add-on packs and their durations. Until then, the builder uses the sample in §4.1, marked `TODO(pricing)`. This doesn't change the design.

## 12. Pixelbin (Rupika) patterns deliberately not copied

| Rupika | Here | Why |
|---|---|---|
| Upgrade or downgrade by comparing per-month `amount` | Compare `priority`, then interval | Monthly → yearly on the same tier was counted as a downgrade |
| `amount` is per month, multiplied for yearly | `amount` is the price per interval | What's stored is what Paddle charges |
| Proration cron, 3 h later, credits only for `UPGRADED` | Carryover in the same transaction, for upgrades and downgrades | Immediate downgrades lost their credits. Our usage is counted synchronously, so no delay is needed. |
| One custom add-on row per carryover (`{orgId}_prorated_{epoch}`) | Relabel the old grant in place | Doesn't clutter the catalog, and in-flight reservations stay valid |
| `RENEWAL_PENDING`, `billingStatus`, `prorationStatus`, `overageLimitPerc`, `billingType` | Not needed | One service and one DB transaction; no overage or postpaid |
| `cancelAtPeriodEnd` and `nextPlanId = freePlanId` both | `next_plan_id` only | One source of truth |
| Failed Paddle cancel → Sentry, "pray someone notices" | `paddle_cancel_pending` plus a sweep retry | Anti-goal: paying for two subscriptions |
| Webhook dedupe with a read, then a write, and no unique index | Unique `paddle_event_id` | Atomic |
| `onboardToPaddle` without a lock | Row lock | No duplicate Paddle prices |
| `customers` table keyed by `orgId` | `profiles.paddle_customer_id` | Pixel Magic has users, not orgs |
| `active` column on `customerAddons` that nothing updates | Expiry by date only | One source of truth |
| Shin, a separate metering service | `credit_grants` and `credit_allocations` in the same DB | One service in v1 |

## 13. Left to the builder

- Internal names, file layout inside `services/billing/`, and how the Paddle client is split into calls.
- How Paddle customer creation handles an email that already exists. Paddle returns a conflict; reuse the existing customer.
- Batch sizes and exact retry timing in the sweep.
- The exact wording of the preview descriptions.
