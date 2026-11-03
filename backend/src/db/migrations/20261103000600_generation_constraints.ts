import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE app.jobs ADD CONSTRAINT jobs_status_check
      CHECK (status IN ('queued', 'submitting', 'submitted', 'finalizing', 'completed', 'failed'))`);
  await knex.raw(`
    CREATE INDEX jobs_user_active ON app.jobs (user_id)
      WHERE status IN ('queued', 'submitting', 'submitted', 'finalizing')`);
  await knex.raw(
    "ALTER TABLE app.uploads ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("ALTER TABLE app.uploads DROP COLUMN IF EXISTS updated_at");
  await knex.raw("DROP INDEX IF EXISTS app.jobs_user_active");
  await knex.raw(
    "ALTER TABLE app.jobs DROP CONSTRAINT IF EXISTS jobs_status_check",
  );
}
