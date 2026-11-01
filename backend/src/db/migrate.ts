import { pathToFileURL } from "node:url";
import type { Knex } from "knex";
import { createDb } from "./knex.js";
import { migrations } from "./migrations/index.js";

export const migrationSource: Knex.MigrationSource<
  (typeof migrations)[number]
> = {
  getMigrations: async () => [...migrations],
  getMigrationName: (m) => m.name,
  getMigration: async (m) => m,
};

export const migrationConfig: Knex.MigratorConfig = {
  migrationSource,
  // Keep knex's bookkeeping out of search_path-dependent places.
  schemaName: "public",
};

export async function runMigrations(db: Knex): Promise<void> {
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
