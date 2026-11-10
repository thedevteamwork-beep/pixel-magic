import type { Deps } from "../../deps.js";
import {
  clearPendingCancel,
  getSubscriptionById,
} from "../../db/repositories/subscriptions.repo.js";

/** Cancels the Paddle subscription of a replaced row; false means the sweep should retry. */
export async function cancelReplacedSubscription(
  deps: Deps,
  subscriptionRowId: string,
): Promise<boolean> {
  try {
    const row = await getSubscriptionById(deps.db, subscriptionRowId);
    if (!row?.paddle_cancel_pending || !row.paddle_subscription_id) return true;
    const paddleId = row.paddle_subscription_id;
    const live = await deps.paddle.getSubscription(paddleId);
    if (live.status !== "canceled") {
      if (live.scheduledChange)
        await deps.paddle.removeScheduledChange(paddleId);
      await deps.paddle.cancelSubscription(paddleId, "immediately");
    }
    await clearPendingCancel(deps.db, row.id, deps.clock.now());
    return true;
  } catch (err) {
    deps.logger.warn("Cancel of replaced Paddle subscription failed", {
      subscriptionRowId,
      err,
    });
    return false;
  }
}
