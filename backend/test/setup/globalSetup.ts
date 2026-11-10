import { createDb } from "../../src/db/knex.js";
import { runMigrations } from "../../src/db/migrate.js";
import { TEST_DATABASE_URL } from "../helpers/db.js";

/**
 * Recreates the test database and migrates it from scratch, so every run
 * starts from the current migrations whatever an earlier run left behind.
 */
export async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^\w+_test$/.test(name)) {
    throw new Error(`Refusing to recreate "${name}": not a *_test database`);
  }
  url.pathname = "/postgres";
  const admin = createDb(url.toString(), 1);
  try {
    await admin.raw("DROP DATABASE IF EXISTS ?? WITH (FORCE)", [name]);
    await admin.raw("CREATE DATABASE ??", [name]);
  } finally {
    await admin.destroy();
  }
  const db = createDb(TEST_DATABASE_URL, 1);
  try {
    await runMigrations(db);
  } finally {
    await db.destroy();
  }
}
