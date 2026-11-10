import type { Knex } from "knex";
import { secureTable } from "../migrationHelpers.js";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE app.credit_grants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      kind text NOT NULL CHECK (kind IN ('plan', 'carryover', 'addon', 'manual')),
      subscription_id uuid NULL REFERENCES app.subscriptions (id),
      customer_addon_id uuid NULL REFERENCES app.customer_addons (id),
      total int NOT NULL CHECK (total >= 0),
      used int NOT NULL DEFAULT 0 CHECK (used >= 0),
      reserved int NOT NULL DEFAULT 0 CHECK (reserved >= 0),
      starts_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      converted_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT credit_grants_within_total CHECK (used + reserved <= total)
    )`);
  await knex.raw(
    "CREATE UNIQUE INDEX credit_grants_subscription ON app.credit_grants (subscription_id) WHERE subscription_id IS NOT NULL",
  );
  await knex.raw(
    "CREATE UNIQUE INDEX credit_grants_customer_addon ON app.credit_grants (customer_addon_id) WHERE customer_addon_id IS NOT NULL",
  );
  await knex.raw(
    "CREATE INDEX credit_grants_user_expires ON app.credit_grants (user_id, expires_at)",
  );
  await knex.raw(`
    CREATE TABLE app.credit_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id uuid NOT NULL REFERENCES app.jobs (id),
      grant_id uuid NOT NULL REFERENCES app.credit_grants (id),
      amount int NOT NULL CHECK (amount > 0),
      status text NOT NULL CHECK (status IN ('reserved', 'captured', 'released')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (job_id, grant_id)
    )`);
  await knex.raw(`
    CREATE TABLE app.credit_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      grant_id uuid NULL REFERENCES app.credit_grants (id),
      job_id uuid NULL REFERENCES app.jobs (id),
      invoice_id uuid NULL REFERENCES app.invoices (id),
      type text NOT NULL CHECK (type IN ('grant', 'reserve', 'capture', 'release', 'convert', 'adjust')),
      amount int NOT NULL,
      note text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  for (const t of ["credit_grants", "credit_allocations", "credit_ledger"]) {
    await secureTable(knex, `app.${t}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const t of ["credit_ledger", "credit_allocations", "credit_grants"]) {
    await knex.raw(`DROP TABLE IF EXISTS app.${t}`);
  }
}
