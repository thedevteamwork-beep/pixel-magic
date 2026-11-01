import type { Knex } from "knex";
import { T } from "../tables.js";

// TODO(pricing): placeholder names, prices and credits (plans spec §4.1, §11).
export const CATALOG = {
  features: [
    { name: "credits", display: "Credits", description: "Generation credits" },
  ],
  plans: [
    {
      name: "free",
      display: "Free",
      description: "Try Pixel Magic for free",
      priority: 0,
      interval: "monthly",
      amount: "0.00",
      credits: 50,
    },
    {
      name: "starter_monthly",
      display: "Starter",
      description: "For regular creators",
      priority: 1,
      interval: "monthly",
      amount: "10.00",
      credits: 500,
    },
    {
      name: "pro_monthly",
      display: "Pro",
      description: "For power users",
      priority: 2,
      interval: "monthly",
      amount: "30.00",
      credits: 2000,
    },
    {
      name: "pro_yearly",
      display: "Pro",
      description: "For power users, billed yearly",
      priority: 2,
      interval: "yearly",
      amount: "300.00",
      credits: 24000,
    },
  ],
  addons: [
    {
      name: "credits_1000",
      display: "1000 credits",
      description: "Extra credits, valid for 30 days",
      amount: "20.00",
      durationDays: 30,
      credits: 1000,
    },
  ],
} as const;

/** Upserts by name. Never touches paddle_product_id / paddle_price_id. */
export async function seedCatalog(
  db: Knex,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction(async (trx) => {
    const featureIds: Record<string, string> = {};
    for (const f of CATALOG.features) {
      const [row] = await trx(T.features)
        .insert({ ...f, created_at: now, updated_at: now })
        .onConflict("name")
        .merge(["display", "description", "updated_at"])
        .returning(["id", "name"]);
      featureIds[row.name] = row.id;
    }
    const creditsId = featureIds.credits;
    for (const p of CATALOG.plans) {
      const [row] = await trx(T.plans)
        .insert({
          name: p.name,
          display: p.display,
          description: p.description,
          priority: p.priority,
          interval: p.interval,
          amount: p.amount,
          created_at: now,
          updated_at: now,
        })
        .onConflict("name")
        .merge([
          "display",
          "description",
          "priority",
          "interval",
          "amount",
          "updated_at",
        ])
        .returning("id");
      await trx(T.planFeatures)
        .insert({
          plan_id: row.id,
          feature_id: creditsId,
          quantity: p.credits,
          created_at: now,
        })
        .onConflict(["plan_id", "feature_id"])
        .merge(["quantity"]);
    }
    for (const a of CATALOG.addons) {
      const [row] = await trx(T.addons)
        .insert({
          name: a.name,
          display: a.display,
          description: a.description,
          amount: a.amount,
          duration_days: a.durationDays,
          created_at: now,
          updated_at: now,
        })
        .onConflict("name")
        .merge([
          "display",
          "description",
          "amount",
          "duration_days",
          "updated_at",
        ])
        .returning("id");
      await trx(T.addonFeatures)
        .insert({
          addon_id: row.id,
          feature_id: creditsId,
          quantity: a.credits,
          created_at: now,
        })
        .onConflict(["addon_id", "feature_id"])
        .merge(["quantity"]);
    }
  });
}
