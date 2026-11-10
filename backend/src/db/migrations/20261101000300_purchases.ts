import type { Knex } from "knex";
import { secureTable } from "../migrationHelpers.js";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE app.invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      paddle_transaction_id text NULL UNIQUE,
      item_type text NOT NULL CHECK (item_type IN ('plan', 'addon')),
      item_id uuid NULL,
      change_type text NULL CHECK (change_type IN ('new', 'upgrade', 'downgrade')),
      from_subscription_id uuid NULL,
      status text NOT NULL CHECK (status IN ('draft', 'paid', 'canceled', 'past_due')),
      origin text NULL,
      amount numeric(12,2) NULL,
      currency text NOT NULL DEFAULT 'USD',
      checkout_url text NULL,
      paddle_subscription_id text NULL,
      billing_period_start timestamptz NULL,
      billing_period_end timestamptz NULL,
      paid_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(`
    CREATE TABLE app.subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      plan_id uuid NOT NULL REFERENCES app.plans (id),
      next_plan_id uuid NOT NULL REFERENCES app.plans (id),
      status text NOT NULL CHECK (status IN ('active', 'renewed', 'upgraded', 'downgraded', 'canceled')),
      active boolean NOT NULL DEFAULT true,
      started_at timestamptz NOT NULL DEFAULT now(),
      current_period_start timestamptz NOT NULL,
      current_period_end timestamptz NOT NULL,
      canceled_at timestamptz NULL,
      previous_subscription_id uuid NULL REFERENCES app.subscriptions (id),
      invoice_id uuid NULL REFERENCES app.invoices (id),
      paddle_subscription_id text NULL,
      paddle_status text NULL,
      paddle_cancel_pending boolean NOT NULL DEFAULT false,
      last_event_occurred_at timestamptz NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(
    "CREATE UNIQUE INDEX subscriptions_one_active_per_user ON app.subscriptions (user_id) WHERE active",
  );
  await knex.raw(
    "CREATE UNIQUE INDEX subscriptions_active_paddle_subscription ON app.subscriptions (paddle_subscription_id) WHERE active",
  );
  await knex.raw(
    "CREATE INDEX subscriptions_active_period_end ON app.subscriptions (current_period_end) WHERE active",
  );
  await knex.raw(
    "CREATE INDEX subscriptions_cancel_pending ON app.subscriptions (paddle_cancel_pending) WHERE paddle_cancel_pending",
  );
  await knex.raw(`
    CREATE TABLE app.customer_addons (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      addon_id uuid NOT NULL REFERENCES app.addons (id),
      invoice_id uuid NULL UNIQUE REFERENCES app.invoices (id),
      bought_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  for (const t of ["invoices", "subscriptions", "customer_addons"]) {
    await secureTable(knex, `app.${t}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const t of ["customer_addons", "subscriptions", "invoices"]) {
    await knex.raw(`DROP TABLE IF EXISTS app.${t}`);
  }
}
