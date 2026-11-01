import type { Knex } from "knex";
import {
  getAddonByName,
  getPlanByName,
} from "../../src/db/repositories/catalog.repo.js";
import { seedCatalog } from "../../src/db/seeds/catalog.js";
import type { AddonWithCredits, PlanWithCredits } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";

interface ExtraPlan {
  name: string;
  display: string;
  priority: number;
  interval: "monthly" | "yearly";
  amount: string;
  credits: number;
  archived?: boolean;
  custom?: boolean;
}

const EXTRA_PLANS: ExtraPlan[] = [
  {
    name: "starter_yearly",
    display: "Starter",
    priority: 1,
    interval: "yearly",
    amount: "100.00",
    credits: 6000,
  },
  {
    name: "pro_monthly_v2",
    display: "Pro",
    priority: 2,
    interval: "monthly",
    amount: "35.00",
    credits: 2000,
  },
  {
    name: "pro_monthly_v3",
    display: "Pro",
    priority: 2,
    interval: "monthly",
    amount: "25.00",
    credits: 2000,
  },
  {
    name: "archived_plan",
    display: "Archived",
    priority: 1,
    interval: "monthly",
    amount: "5.00",
    credits: 100,
    archived: true,
  },
  {
    name: "custom_plan",
    display: "Custom",
    priority: 3,
    interval: "monthly",
    amount: "99.00",
    credits: 9000,
    custom: true,
  },
];

export async function seedTestCatalog(db: Knex): Promise<{
  plans: Record<string, PlanWithCredits>;
  addons: Record<string, AddonWithCredits>;
}> {
  await seedCatalog(db);
  const feature = await db(T.features).where({ name: "credits" }).first();
  for (const p of EXTRA_PLANS) {
    const [row] = await db(T.plans)
      .insert({
        name: p.name,
        display: p.display,
        description: "",
        priority: p.priority,
        interval: p.interval,
        amount: p.amount,
        archived: p.archived ?? false,
        custom: p.custom ?? false,
      })
      .returning("id");
    await db(T.planFeatures).insert({
      plan_id: row.id,
      feature_id: feature.id,
      quantity: p.credits,
    });
  }
  const extraAddons = [
    {
      name: "credits_999c",
      display: "100 credits",
      amount: "9.99",
      duration_days: 10,
      credits: 100,
      archived: false,
    },
    {
      name: "archived_addon",
      display: "Archived add-on",
      amount: "5.00",
      duration_days: 30,
      credits: 100,
      archived: true,
    },
  ];
  for (const a of extraAddons) {
    const [row] = await db(T.addons)
      .insert({
        name: a.name,
        display: a.display,
        description: "",
        amount: a.amount,
        duration_days: a.duration_days,
        archived: a.archived,
      })
      .returning("id");
    await db(T.addonFeatures).insert({
      addon_id: row.id,
      feature_id: feature.id,
      quantity: a.credits,
    });
  }
  const plans: Record<string, PlanWithCredits> = {};
  for (const name of [
    "free",
    "starter_monthly",
    "pro_monthly",
    "pro_yearly",
    ...EXTRA_PLANS.map((p) => p.name),
  ]) {
    plans[name] = (await getPlanByName(db, name))!;
  }
  const addons: Record<string, AddonWithCredits> = {};
  for (const name of ["credits_1000", "credits_999c", "archived_addon"]) {
    addons[name] = (await getAddonByName(db, name))!;
  }
  return { plans, addons };
}
