import type { Knex } from "knex";
import type {
  AddonRow,
  AddonWithCredits,
  PlanRow,
  PlanWithCredits,
} from "../rows.js";
import { T } from "../tables.js";

function plansQuery(db: Knex): Knex.QueryBuilder {
  return db(`${T.plans} as p`)
    .leftJoin(`${T.features} as f`, "f.name", db.raw("?", ["credits"]))
    .leftJoin(`${T.planFeatures} as pf`, function () {
      this.on("pf.plan_id", "p.id").andOn("pf.feature_id", "f.id");
    })
    .select("p.*", db.raw("coalesce(pf.quantity, 0)::int as credits"));
}

function addonsQuery(db: Knex): Knex.QueryBuilder {
  return db(`${T.addons} as a`)
    .leftJoin(`${T.features} as f`, "f.name", db.raw("?", ["credits"]))
    .leftJoin(`${T.addonFeatures} as af`, function () {
      this.on("af.addon_id", "a.id").andOn("af.feature_id", "f.id");
    })
    .select("a.*", db.raw("coalesce(af.quantity, 0)::int as credits"));
}

export async function listPublicPlans(db: Knex): Promise<PlanWithCredits[]> {
  return plansQuery(db)
    .where({ "p.custom": false, "p.archived": false })
    .orderBy("p.priority")
    .orderByRaw("case p.interval when 'monthly' then 0 else 1 end")
    .orderBy("p.name");
}

export async function getPlanByName(
  db: Knex,
  name: string,
): Promise<PlanWithCredits | null> {
  return (await plansQuery(db).where("p.name", name).first()) ?? null;
}

export async function getPlanById(
  db: Knex,
  id: string,
): Promise<PlanWithCredits | null> {
  return (await plansQuery(db).where("p.id", id).first()) ?? null;
}

export async function getPlanByPaddlePriceId(
  db: Knex,
  priceId: string,
): Promise<PlanWithCredits | null> {
  return (
    (await plansQuery(db).where("p.paddle_price_id", priceId).first()) ?? null
  );
}

export async function listPublicAddons(db: Knex): Promise<AddonWithCredits[]> {
  return addonsQuery(db)
    .where({ "a.custom": false, "a.archived": false })
    .orderBy("a.amount")
    .orderBy("a.name");
}

export async function getAddonByName(
  db: Knex,
  name: string,
): Promise<AddonWithCredits | null> {
  return (await addonsQuery(db).where("a.name", name).first()) ?? null;
}

export async function getAddonById(
  db: Knex,
  id: string,
): Promise<AddonWithCredits | null> {
  return (await addonsQuery(db).where("a.id", id).first()) ?? null;
}

export async function lockCatalogRow(
  trx: Knex.Transaction,
  kind: "plan" | "addon",
  id: string,
): Promise<PlanRow | AddonRow> {
  return trx(kind === "plan" ? T.plans : T.addons)
    .where({ id })
    .forUpdate()
    .first();
}

export async function setPaddleIds(
  trx: Knex.Transaction,
  kind: "plan" | "addon",
  id: string,
  ids: { productId: string; priceId: string },
  now: Date,
): Promise<void> {
  await trx(kind === "plan" ? T.plans : T.addons)
    .where({ id })
    .update({
      paddle_product_id: ids.productId,
      paddle_price_id: ids.priceId,
      updated_at: now,
    });
}
