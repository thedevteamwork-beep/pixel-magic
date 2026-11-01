import type { Knex } from "knex";
import { createDb } from "../../src/db/knex.js";
import { T } from "../../src/db/tables.js";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:54329/pixel_magic_test";

export const testDb: Knex = createDb(TEST_DATABASE_URL, 10);

export async function resetDb(): Promise<void> {
  await testDb.raw(
    `TRUNCATE ${Object.values(T).join(", ")} RESTART IDENTITY CASCADE`,
  );
}
