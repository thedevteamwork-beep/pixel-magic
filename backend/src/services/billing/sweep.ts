import { getPlanByName } from "../../db/repositories/catalog.repo.js";
import { cancelDraftsBefore } from "../../db/repositories/invoices.repo.js";
import {
  listExpiredFreeRows,
  listPendingCancels,
  listStuckRows,
} from "../../db/repositories/subscriptions.repo.js";
import type { Deps } from "../../deps.js";
import { addDays, addMonths } from "../../lib/time.js";
import { cancelReplacedSubscription } from "./paddleCancel.js";
import { moveToPlan, StaleSubscriptionError } from "./subscriptions.js";

const BATCH = 500;
const HOUR_MS = 3_600_000;

export type SweepCounts = {
  freeRenewed: number;
  cancelsRetried: number;
  cancelsCleared: number;
  draftsExpired: number;
  stuck: number;
};

async function renewFreeRows(deps: Deps, now: Date): Promise<number> {
  const freePlan = await getPlanByName(deps.db, deps.config.FREE_PLAN_NAME);
  if (!freePlan) throw new Error("Free plan missing; run npm run seed");
  const rows = await listExpiredFreeRows(deps.db, freePlan.id, now, BATCH);
  let renewed = 0;
  for (const from of rows) {
    try {
      await deps.db.transaction((trx) =>
        moveToPlan(trx, deps, {
          from,
          toPlan: freePlan,
          status: "renewed",
          t: now,
          periodStart: now,
          periodEnd: addMonths(now, 1),
          paddleSubscriptionId: null,
          invoiceId: null,
          paddleCancelPending: false,
        }),
      );
      renewed += 1;
    } catch (err) {
      if (err instanceof StaleSubscriptionError) continue;
      deps.logger.error("Free plan renewal failed", {
        subscriptionId: from.id,
        err,
      });
    }
  }
  return renewed;
}

async function retryPendingCancels(
  deps: Deps,
  now: Date,
): Promise<{ retried: number; cleared: number }> {
  const rows = await listPendingCancels(deps.db, BATCH);
  const stale = new Date(now.getTime() - 24 * HOUR_MS);
  let cleared = 0;
  for (const row of rows) {
    if (await cancelReplacedSubscription(deps, row.id)) {
      cleared += 1;
    } else if (row.canceled_at && row.canceled_at < stale) {
      deps.logger.error("Paddle cancel still failing after 24 hours", {
        subscriptionId: row.id,
        paddleSubscriptionId: row.paddle_subscription_id,
        canceledAt: row.canceled_at,
      });
    }
  }
  return { retried: rows.length, cleared };
}

async function logStuckRows(deps: Deps, now: Date): Promise<number> {
  const rows = await listStuckRows(deps.db, addDays(now, -7), BATCH);
  for (const row of rows) {
    deps.logger.error("Subscription stuck between Paddle and us", {
      subscriptionId: row.id,
      userId: row.user_id,
      paddleSubscriptionId: row.paddle_subscription_id,
      paddleStatus: row.paddle_status,
      currentPeriodEnd: row.current_period_end,
    });
  }
  return rows.length;
}

export async function runBillingSweep(deps: Deps): Promise<SweepCounts> {
  const now = deps.clock.now();
  const freeRenewed = await renewFreeRows(deps, now);
  const { retried, cleared } = await retryPendingCancels(deps, now);
  const draftsExpired = await cancelDraftsBefore(
    deps.db,
    new Date(now.getTime() - 24 * HOUR_MS),
    now,
  );
  const stuck = await logStuckRows(deps, now);
  return {
    freeRenewed,
    cancelsRetried: retried,
    cancelsCleared: cleared,
    draftsExpired,
    stuck,
  };
}
