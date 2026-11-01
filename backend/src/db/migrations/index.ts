import type { Knex } from "knex";
import * as appSchema from "./20261101000100_app_schema.js";
import * as catalog from "./20261101000200_catalog.js";
import * as purchases from "./20261101000300_purchases.js";
import * as generation from "./20261101000400_generation.js";
import * as credits from "./20261101000500_credits.js";

export interface MigrationEntry {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
}

/** Static, ordered list: works identically under tsx, vitest and compiled dist. */
export const migrations: readonly MigrationEntry[] = [
  { name: "20261101000100_app_schema", ...appSchema },
  { name: "20261101000200_catalog", ...catalog },
  { name: "20261101000300_purchases", ...purchases },
  { name: "20261101000400_generation", ...generation },
  { name: "20261101000500_credits", ...credits },
];
