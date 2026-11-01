import type { Knex } from "knex";
import type { CustomerAddonRow } from "../rows.js";
import { T } from "../tables.js";

export async function insertCustomerAddon(
  trx: Knex | Knex.Transaction,
  p: {
    user_id: string;
    addon_id: string;
    invoice_id: string | null;
    bought_at: Date;
    expires_at: Date;
    created_at: Date;
  },
): Promise<CustomerAddonRow> {
  const [row] = await trx(T.customerAddons).insert(p).returning("*");
  return row;
}
