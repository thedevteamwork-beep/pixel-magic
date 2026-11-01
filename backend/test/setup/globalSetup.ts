import { createDb } from "../../src/db/knex.js";
import { runMigrations } from "../../src/db/migrate.js";
import { TEST_DATABASE_URL } from "../helpers/db.js";

export async function setup(): Promise<void> {
  const db = createDb(TEST_DATABASE_URL, 1);
  try {
    await runMigrations(db);
  } finally {
    await db.destroy();
  }
}
