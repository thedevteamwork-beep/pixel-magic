import type { Deps } from "../deps.js";
import { getPlanById } from "../db/repositories/catalog.repo.js";
import type { ActiveSubscription } from "../db/rows.js";

/** The `subscription` object shared by /v1/me and the revert endpoint. */
export async function subscriptionView(deps: Deps, sub: ActiveSubscription) {
  const nextPlan =
    sub.next_plan_id === sub.plan_id
      ? null
      : ((await getPlanById(deps.db, sub.next_plan_id))?.name ?? null);
  return {
    plan: sub.plan.name,
    display: sub.plan.display,
    interval: sub.plan.interval,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    nextPlan,
    paddleStatus: sub.paddle_status,
  };
}
