import { Router } from "express";
import type { Deps } from "../../deps.js";
import { getPlanById } from "../../db/repositories/catalog.repo.js";
import { getCreditSummary } from "../../db/repositories/credits.repo.js";
import { getActiveSubscription } from "../../db/repositories/subscriptions.repo.js";
import { ensureUser } from "../middlewares/ensureUser.js";
import { requireUser } from "../middlewares/auth.js";

export function meRouter(deps: Deps): Router {
  const router = Router();
  router.get(
    "/v1/me",
    requireUser(deps),
    ensureUser(deps),
    async (req, res) => {
      const user = req.user!;
      const sub = (await getActiveSubscription(deps.db, user.id))!;
      const credits = await getCreditSummary(
        deps.db,
        user.id,
        deps.clock.now(),
      );
      const nextPlan =
        sub.next_plan_id === sub.plan_id
          ? null
          : ((await getPlanById(deps.db, sub.next_plan_id))?.name ?? null);
      res.json({
        userId: user.id,
        email: user.email,
        credits,
        subscription: {
          plan: sub.plan.name,
          display: sub.plan.display,
          interval: sub.plan.interval,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          nextPlan,
          paddleStatus: sub.paddle_status,
        },
      });
    },
  );
  return router;
}
