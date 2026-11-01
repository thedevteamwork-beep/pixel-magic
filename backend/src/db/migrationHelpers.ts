import type { Knex } from "knex";

const REVOKE_ROLES = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    %STATEMENT%
  END IF;
END $$`;

export async function revokeIfRolesExist(
  knex: Knex,
  statement: string,
): Promise<void> {
  await knex.raw(REVOKE_ROLES.replace("%STATEMENT%", statement));
}

/** Enables RLS (no policies) and removes all privileges from Supabase's API roles. */
export async function secureTable(knex: Knex, table: string): Promise<void> {
  await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  await revokeIfRolesExist(
    knex,
    `REVOKE ALL ON ${table} FROM anon, authenticated;`,
  );
}
