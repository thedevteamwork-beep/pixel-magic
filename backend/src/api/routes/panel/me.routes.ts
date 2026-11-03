import { Router } from "express";
import type { Deps } from "../../../deps.js";
import { getCreditSummary } from "../../../db/repositories/credits.repo.js";
import { getActiveSubscription } from "../../../db/repositories/subscriptions.repo.js";
import { subscriptionView } from "../../subscriptionView.js";

export function meRoutes(deps: Deps): Router {
  const router = Router();
  router.get("/me", async (req, res) => {
    const user = req.user!;
    const sub = (await getActiveSubscription(deps.db, user.id))!;
    const credits = await getCreditSummary(deps.db, user.id, deps.clock.now());
    res.json({
      userId: user.id,
      email: user.email,
      credits,
      subscription: await subscriptionView(deps, sub),
    });
  });
  return router;
}
