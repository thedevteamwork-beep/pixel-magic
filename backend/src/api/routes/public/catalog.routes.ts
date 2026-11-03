import { Router } from "express";
import type { Deps } from "../../../deps.js";
import {
  listPublicAddons,
  listPublicPlans,
} from "../../../db/repositories/catalog.repo.js";

const CACHE_CONTROL = "public, max-age=300";

export function catalogRoutes(deps: Deps): Router {
  const router = Router();
  router.get("/plans", async (_req, res) => {
    const plans = await listPublicPlans(deps.db);
    res.set("Cache-Control", CACHE_CONTROL).json(
      plans.map((p) => ({
        name: p.name,
        display: p.display,
        description: p.description,
        interval: p.interval,
        amount: p.amount,
        currency: p.currency,
        credits: p.credits,
        creditValidityDays: p.credit_validity_days,
        priority: p.priority,
      })),
    );
  });
  router.get("/addons", async (_req, res) => {
    const addons = await listPublicAddons(deps.db);
    res.set("Cache-Control", CACHE_CONTROL).json(
      addons.map((a) => ({
        name: a.name,
        display: a.display,
        description: a.description,
        amount: a.amount,
        currency: a.currency,
        credits: a.credits,
        durationDays: a.duration_days,
      })),
    );
  });
  return router;
}
