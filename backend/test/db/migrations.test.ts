import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "../../src/db/knex.js";
import { migrationConfig, runMigrations } from "../../src/db/migrate.js";
import { T } from "../../src/db/tables.js";
import { TEST_DATABASE_URL, testDb } from "../helpers/db.js";

afterAll(() => testDb.destroy());

describe("migrations", () => {
  it("creates every table in schema app with RLS on", async () => {
    const rows = await testDb.raw(
      `select tablename, rowsecurity from pg_tables where schemaname='app'`,
    );
    expect(
      rows.rows.map((r: { tablename: string }) => r.tablename).sort(),
    ).toEqual(
      Object.values(T)
        .map((t) => t.slice(4))
        .sort(),
    );
    expect(
      rows.rows.every((r: { rowsecurity: boolean }) => r.rowsecurity),
    ).toBe(true);
  });

  it("rolls all the way down and up again", async () => {
    await testDb.raw("DROP DATABASE IF EXISTS pixel_magic_scratch");
    await testDb.raw("CREATE DATABASE pixel_magic_scratch");
    const scratch = createDb(
      TEST_DATABASE_URL.replace(/\/[^/]+$/, "/pixel_magic_scratch"),
      1,
    );
    try {
      await runMigrations(scratch);
      await scratch.migrate.rollback(migrationConfig, true);
      const left = await scratch.raw(
        `select count(*)::int as n from pg_tables where schemaname='app'`,
      );
      expect(left.rows[0].n).toBe(0);
      await runMigrations(scratch);
      const again = await scratch.raw(
        `select count(*)::int as n from pg_tables where schemaname='app'`,
      );
      expect(again.rows[0].n).toBe(Object.keys(T).length);
    } finally {
      await scratch.destroy();
      await testDb.raw("DROP DATABASE IF EXISTS pixel_magic_scratch");
    }
  }, 30_000);
});
