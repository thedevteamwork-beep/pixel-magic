import type { Knex } from "knex";
import { T } from "../tables.js";

type CatalogPlan = {
  name: string;
  display: string;
  description: string;
  priority: number;
  interval: "monthly" | "yearly";
  amount: string;
  currency?: string;
  credits: number;
};

type CatalogAddon = {
  name: string;
  display: string;
  description: string;
  amount: string;
  currency?: string;
  durationDays: number;
  credits: number;
};

export type Catalog = {
  features: readonly { name: string; display: string; description: string }[];
  plans: readonly CatalogPlan[];
  addons: readonly CatalogAddon[];
};

const DEFAULT_CURRENCY = "USD";

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
} as const satisfies Catalog;

type PriceFields = { amount: string; currency: string; interval?: string };

/**
 * A row registered on Paddle has a Paddle price with its amount, currency and
 * interval fixed; changing them here would bill a different price than the
 * catalog shows. A price change is a new row (and the old one archived).
 */
async function assertSamePrice(
  trx: Knex.Transaction,
  table: string,
  name: string,
  wanted: PriceFields,
): Promise<void> {
  const row: (PriceFields & { paddle_price_id: string | null }) | undefined =
    await trx(table).where({ name }).forNoKeyUpdate().first();
  if (!row?.paddle_price_id) return;
  if (
    Number(row.amount) !== Number(wanted.amount) ||
    row.currency !== wanted.currency ||
    row.interval !== wanted.interval
  ) {
    throw new Error(
      `Price change for ${name} needs a new catalog row; archive the old one`,
    );
  }
}

/**
 * Upserts by name. Never touches paddle_product_id / paddle_price_id, and
 * refuses to re-price a row already registered on Paddle.
 */
export async function seedCatalog(
  db: Knex,
  now: Date = new Date(),
  catalog: Catalog = CATALOG,
): Promise<void> {
  await db.transaction(async (trx) => {
    const featureIds: Record<string, string> = {};
    for (const f of catalog.features) {
      const [row] = await trx(T.features)
        .insert({ ...f, created_at: now, updated_at: now })
        .onConflict("name")
        .merge(["display", "description", "updated_at"])
        .returning(["id", "name"]);
      featureIds[row.name] = row.id;
    }
    const creditsId = featureIds.credits;
    for (const p of catalog.plans) {
      const currency = p.currency ?? DEFAULT_CURRENCY;
      await assertSamePrice(trx, T.plans, p.name, {
        amount: p.amount,
        currency,
        interval: p.interval,
      });
      const [row] = await trx(T.plans)
        .insert({
          name: p.name,
          display: p.display,
          description: p.description,
          priority: p.priority,
          interval: p.interval,
          amount: p.amount,
          currency,
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
          "currency",
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
    for (const a of catalog.addons) {
      const currency = a.currency ?? DEFAULT_CURRENCY;
      await assertSamePrice(trx, T.addons, a.name, {
        amount: a.amount,
        currency,
      });
      const [row] = await trx(T.addons)
        .insert({
          name: a.name,
          display: a.display,
          description: a.description,
          amount: a.amount,
          currency,
          duration_days: a.durationDays,
          created_at: now,
          updated_at: now,
        })
        .onConflict("name")
        .merge([
          "display",
          "description",
          "amount",
          "currency",
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
