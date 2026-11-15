import type { Knex } from "knex";
import { secureTable } from "../migrationHelpers.js";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE app.projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.profiles (id),
      type text NOT NULL,
      title text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await knex.raw(
    "CREATE INDEX projects_user_updated_at ON app.projects (user_id, updated_at DESC, id DESC)",
  );
  await knex.raw(
    "CREATE INDEX projects_user_type_updated_at ON app.projects (user_id, type, updated_at DESC, id DESC)",
  );
  await knex.raw(`
    ALTER TABLE app.jobs
      ADD COLUMN project_id uuid NULL REFERENCES app.projects (id) ON DELETE SET NULL`);
  await knex.raw(`
    CREATE INDEX jobs_project_created_at ON app.jobs (project_id, created_at DESC, id DESC)
      WHERE project_id IS NOT NULL`);
  await secureTable(knex, "app.projects");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP INDEX IF EXISTS app.jobs_project_created_at");
  await knex.raw("ALTER TABLE app.jobs DROP COLUMN IF EXISTS project_id");
  await knex.raw("DROP TABLE IF EXISTS app.projects");
}
