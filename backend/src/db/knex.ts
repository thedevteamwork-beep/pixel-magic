import knex, { type Knex } from "knex";

export function createDb(url: string, poolMax?: number): Knex {
  return knex({
    client: "pg",
    connection: url,
    pool: { min: 0, max: poolMax ?? 5 },
  });
}
