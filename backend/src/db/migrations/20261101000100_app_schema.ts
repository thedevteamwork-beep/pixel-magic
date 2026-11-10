import type { Knex } from "knex";
import { revokeIfRolesExist, secureTable } from "../migrationHelpers.js";

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SCHEMA IF NOT EXISTS app");
  await revokeIfRolesExist(
    knex,
    "REVOKE ALL ON SCHEMA app FROM anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM anon, authenticated;",
  );
  await knex.raw(`
    CREATE TABLE app.profiles (
      id uuid PRIMARY KEY,
      email text NULL,
      paddle_customer_id text NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(`
    CREATE TABLE app.payment_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      paddle_event_id text NOT NULL UNIQUE,
      event_type text NOT NULL,
      occurred_at timestamptz NOT NULL,
      payload jsonb NOT NULL,
      processed_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await secureTable(knex, "app.profiles");
  await secureTable(knex, "app.payment_events");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS app.payment_events");
  await knex.raw("DROP TABLE IF EXISTS app.profiles");
  await knex.raw("DROP SCHEMA IF EXISTS app");
}
