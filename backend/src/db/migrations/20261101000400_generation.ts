import type { Knex } from "knex";
import { secureTable } from "../migrationHelpers.js";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE app.uploads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      bucket text NOT NULL,
      path text NOT NULL,
      mime_type text NOT NULL,
      size_bytes bigint NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(`
    CREATE TABLE app.jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      model_key text NOT NULL,
      input jsonb NOT NULL,
      upload_ids uuid[] NOT NULL DEFAULT '{}',
      credit_cost int NOT NULL,
      status text NOT NULL,
      idempotency_key text NOT NULL,
      request_hash text NOT NULL,
      fal_request_id text NULL UNIQUE,
      lease_expires_at timestamptz NULL,
      attempts int NOT NULL DEFAULT 0,
      outputs jsonb NULL,
      error_code text NULL,
      error_message text NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      submitted_at timestamptz NULL,
      completed_at timestamptz NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, idempotency_key)
    )`);
  await knex.raw(
    "CREATE INDEX jobs_status_updated_at ON app.jobs (status, updated_at)",
  );
  await knex.raw(
    "CREATE INDEX jobs_user_created_at ON app.jobs (user_id, created_at DESC)",
  );
  await knex.raw(`
    CREATE TABLE app.provider_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text NOT NULL CHECK (provider IN ('fal')),
      request_id text NOT NULL,
      status text NOT NULL,
      payload jsonb NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (provider, request_id)
    )`);
  for (const t of ["uploads", "jobs", "provider_events"]) {
    await secureTable(knex, `app.${t}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const t of ["provider_events", "jobs", "uploads"]) {
    await knex.raw(`DROP TABLE IF EXISTS app.${t}`);
  }
}
