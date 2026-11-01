import type { Knex } from "knex";
import { secureTable } from "../migrationHelpers.js";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE app.features (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      display text NOT NULL,
      description text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(`
    CREATE TABLE app.plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      display text NOT NULL,
      description text NOT NULL DEFAULT '',
      priority int NOT NULL,
      interval text NOT NULL CHECK (interval IN ('monthly', 'yearly')),
      amount numeric(12,2) NOT NULL,
      currency text NOT NULL DEFAULT 'USD',
      credit_validity_days int NULL CHECK (credit_validity_days >= 1),
      custom boolean NOT NULL DEFAULT false,
      archived boolean NOT NULL DEFAULT false,
      paddle_product_id text NULL UNIQUE,
      paddle_price_id text NULL UNIQUE,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(`
    CREATE TABLE app.plan_features (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES app.plans (id) ON DELETE CASCADE,
      feature_id uuid NOT NULL REFERENCES app.features (id),
      quantity int NOT NULL CHECK (quantity >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (plan_id, feature_id)
    )`);
  await knex.raw(`
    CREATE TABLE app.addons (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      display text NOT NULL,
      description text NOT NULL DEFAULT '',
      amount numeric(12,2) NOT NULL,
      currency text NOT NULL DEFAULT 'USD',
      duration_days int NOT NULL CHECK (duration_days >= 1),
      custom boolean NOT NULL DEFAULT false,
      archived boolean NOT NULL DEFAULT false,
      paddle_product_id text NULL UNIQUE,
      paddle_price_id text NULL UNIQUE,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(`
    CREATE TABLE app.addon_features (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      addon_id uuid NOT NULL REFERENCES app.addons (id) ON DELETE CASCADE,
      feature_id uuid NOT NULL REFERENCES app.features (id),
      quantity int NOT NULL CHECK (quantity >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (addon_id, feature_id)
    )`);
  for (const t of [
    "features",
    "plans",
    "plan_features",
    "addons",
    "addon_features",
  ]) {
    await secureTable(knex, `app.${t}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const t of [
    "addon_features",
    "addons",
    "plan_features",
    "plans",
    "features",
  ]) {
    await knex.raw(`DROP TABLE IF EXISTS app.${t}`);
  }
}
