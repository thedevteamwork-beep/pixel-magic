import { randomUUID } from "node:crypto";
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

  it("keeps knex's bookkeeping tables in schema app_migrations, not public", async () => {
    const pub = await testDb.raw(
      `select count(*)::int as n from pg_tables
       where schemaname='public' and tablename like 'knex%'`,
    );
    expect(pub.rows[0].n).toBe(0);
    const own = await testDb.raw(
      `select tablename from pg_tables
       where schemaname='app_migrations' order by tablename`,
    );
    expect(own.rows.map((r: { tablename: string }) => r.tablename)).toEqual([
      "knex_migrations",
      "knex_migrations_lock",
    ]);
  });

  it("adds a nullable project_id to jobs that is set to null when its project goes", async () => {
    const userId = randomUUID();
    await testDb(T.profiles).insert({ id: userId });
    const [project] = await testDb(T.projects)
      .insert({ user_id: userId, type: "ai-influencer", title: "Mia" })
      .returning("id");
    const [job] = await testDb(T.jobs)
      .insert({
        user_id: userId,
        model_key: "m",
        input: {},
        credit_cost: 1,
        status: "queued",
        idempotency_key: randomUUID(),
        request_hash: "h",
        project_id: project.id,
      })
      .returning("id");
    await testDb(T.projects).where({ id: project.id }).delete();
    const row = await testDb(T.jobs).where({ id: job.id }).first();
    expect(row).toBeDefined();
    expect(row.project_id).toBeNull();
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
      const knexTables = await scratch.raw(
        `select schemaname, count(*)::int as n from pg_tables
         where tablename like 'knex%' group by schemaname`,
      );
      expect(knexTables.rows).toEqual([{ schemaname: "app_migrations", n: 2 }]);
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
