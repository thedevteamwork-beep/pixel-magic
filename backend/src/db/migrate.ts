import { pathToFileURL } from "node:url";
import type { Knex } from "knex";
import { createDb } from "./knex.js";
import { revokeIfRolesExist } from "./migrationHelpers.js";
import { migrations } from "./migrations/index.js";

/**
 * Knex's bookkeeping tables live here: not in `public` (Supabase's Data API
 * exposes it) and not in `app` (which holds only the application's tables).
 */
export const MIGRATIONS_SCHEMA = "app_migrations";

export const migrationSource: Knex.MigrationSource<
  (typeof migrations)[number]
> = {
  getMigrations: async () => [...migrations],
  getMigrationName: (m) => m.name,
  getMigration: async (m) => m,
};

export const migrationConfig: Knex.MigratorConfig = {
  migrationSource,
  schemaName: MIGRATIONS_SCHEMA,
};

export async function runMigrations(db: Knex): Promise<void> {
  await db.raw(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
  await revokeIfRolesExist(
    db,
    `REVOKE ALL ON SCHEMA ${MIGRATIONS_SCHEMA} FROM anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA ${MIGRATIONS_SCHEMA} REVOKE ALL ON TABLES FROM anon, authenticated;`,
  );
  await db.migrate.latest(migrationConfig);
}

const isCli =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    process.stderr.write("DATABASE_MIGRATION_URL is required\n");
    process.exit(1);
  }
  const db = createDb(url, 1);
  runMigrations(db)
    .then(() => db.destroy())
    .catch(async (err: unknown) => {
      process.stderr.write(
        `${err instanceof Error ? err.stack : String(err)}\n`,
      );
      await db.destroy();
      process.exit(1);
    });
}
