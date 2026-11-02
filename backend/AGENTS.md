# Backend notes for agents

## Layering

`routes` (HTTP, validation, auth) call `services` (business rules, transactions), which call `db/repositories` (SQL) and `clients` (Paddle). Dependencies are passed in through `Deps` (`src/deps.ts`). Routes may call a repository directly for a simple read (for example the catalog, `GET /v1/billing/invoices`, the active subscription for a response); anything with a business rule, a write or a Paddle call goes through a service. Routes never call Paddle or write SQL; repositories contain no business rules; clients know nothing about the DB.

## SQL only in repositories

All Knex queries live in `src/db/repositories/*.repo.ts`. Services pass a `db` or `trx` into them. Row types are in `src/db/rows.ts`.

## Schema-qualified tables

Use the `T` map in `src/db/tables.ts` (for example `app.subscriptions`), never bare table names. Migrations create everything in the `app` schema. Knex's own bookkeeping tables live in `app_migrations` (revoked from Supabase's API roles), never in `public`.

## Clock rule

Never call `new Date()` or the DB `now()` for business timestamps. Use `deps.clock.now()` and pass the time into repositories, which write `created_at`, `updated_at` and any compared timestamp from it. DB defaults are only a fallback. Tests fake the clock.

## Errors

Throw `AppError(status, code, message)` from `src/lib/errors.ts`. Codes: `UNAUTHENTICATED`, `VALIDATION_FAILED`, `NOT_FOUND`, `PLAN_NOT_AVAILABLE`, `ADDON_NOT_AVAILABLE`, `ALREADY_ON_PLAN`, `RENEWAL_IN_PROGRESS`, `PAYMENT_PAST_DUE`, `NO_SCHEDULED_CHANGE`, `INSUFFICIENT_CREDITS`, `PAYMENT_PROVIDER_ERROR`, `INTERNAL`. Add new codes to the `ErrorCode` union.

## Conventions

- ESM with NodeNext: relative imports end in `.js`.
- Node 22 (`nvm use`).
- Webhook handling must be idempotent (unique `paddle_event_id`, compare-and-set on invoices).
- Before committing run `npm run lint`, `npm run typecheck` and `npm test`, and all must pass.
