import type { Deps } from "../../deps.js";
import {
  PaddleProviderError,
  type PaddleSubscriptionState,
} from "../../clients/paddle.js";
import { getPlanByName } from "../../db/repositories/catalog.repo.js";
import { lockProfile } from "../../db/repositories/profiles.repo.js";
import {
  getActiveSubscription,
  setNextPlan,
} from "../../db/repositories/subscriptions.repo.js";
import type { ActiveSubscription, PlanWithCredits } from "../../db/rows.js";
import { AppError } from "../../lib/errors.js";
import { addMonths } from "../../lib/time.js";
import { ensurePaddlePrice, openCheckout } from "./checkout.js";
import type { CheckoutResult, TokenUser } from "./checkout.js";
import {
  describeAction,
  getAction,
  getChangeType,
  type Action,
  type ChangeType,
} from "./rules.js";
import { moveToPlan, StaleSubscriptionError } from "./subscriptions.js";

export type PlanChangeResult =
  | CheckoutResult
  | { action: "scheduled"; effectiveAt: Date }
  | { action: "reverted" }
  | { action: "canceled" };

type Live = PaddleSubscriptionState;

type Evaluation = {
  sub: ActiveSubscription;
  target: PlanWithCredits;
  live: Live | null;
  changeType: Exclude<ChangeType, "same">;
  action: Action;
  effectiveAt: Date;
};

const providerError = () =>
  new AppError(502, "PAYMENT_PROVIDER_ERROR", "Payment provider error");

async function withProviderErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof PaddleProviderError) throw providerError();
    throw err;
  }
}

async function loadActive(
  deps: Deps,
  userId: string,
): Promise<ActiveSubscription> {
  const sub = await getActiveSubscription(deps.db, userId);
  if (!sub) throw new AppError(404, "NOT_FOUND", "No active subscription");
  return sub;
}

async function loadLive(
  deps: Deps,
  sub: ActiveSubscription,
): Promise<Live | null> {
  if (sub.paddle_subscription_id) {
    return deps.paddle.getSubscription(sub.paddle_subscription_id);
  }
  if (sub.plan.name !== deps.config.FREE_PLAN_NAME) {
    deps.logger.error("Paid subscription has no Paddle subscription id", {
      userId: sub.user_id,
      subscriptionId: sub.id,
    });
    throw new AppError(500, "INTERNAL", "Internal error");
  }
  return null;
}

function isScheduled(live: Live | null, sub: ActiveSubscription): boolean {
  if (!live) return false;
  return (
    live.scheduledChange?.action === "cancel" ||
    live.priceId !== sub.plan.paddle_price_id
  );
}

async function setNext(
  deps: Deps,
  sub: ActiveSubscription,
  nextPlanId: string,
): Promise<void> {
  await deps.db.transaction(async (trx) => {
    await lockProfile(trx, sub.user_id);
    await setNextPlan(trx, sub.id, nextPlanId, deps.clock.now());
  });
}

/** Steps 1-6 of plans spec §6.2: validates and works out the action; no Paddle mutation. */
async function evaluate(
  deps: Deps,
  userId: string,
  planName: string,
): Promise<
  Evaluation | { same: true; sub: ActiveSubscription; live: Live | null }
> {
  const sub = await loadActive(deps, userId);
  const target = await getPlanByName(deps.db, planName);
  if (!target || target.custom || target.archived) {
    throw new AppError(422, "PLAN_NOT_AVAILABLE", "This plan is not available");
  }
  const changeType = getChangeType(
    sub.plan,
    target,
    deps.config.FREE_PLAN_NAME,
  );
  const live = await loadLive(deps, sub);
  if (changeType === "same") return { same: true, sub, live };

  const now = deps.clock.now();
  const periodEnd = live?.periodEnd ?? sub.current_period_end;
  if (live) {
    const untilRenewal = periodEnd.getTime() - now.getTime();
    if (
      untilRenewal > 0 &&
      untilRenewal < deps.config.PLAN_CHANGE_LOCK_MINUTES * 60_000
    ) {
      throw new AppError(
        409,
        "RENEWAL_IN_PROGRESS",
        "Your plan is renewing; try again shortly",
      );
    }
  }
  const pastDue = live?.status === "past_due";
  // A past-due cancel is applied immediately (§3.2 call 17).
  const action: Action =
    pastDue && changeType === "cancel"
      ? "now"
      : getAction(sub.plan, target, changeType);
  if (pastDue && action === "period_end") {
    if (changeType === "downgrade") {
      throw new AppError(
        409,
        "PAYMENT_PAST_DUE",
        "Your last payment failed; update your payment method first",
      );
    }
  }
  return {
    sub,
    target,
    live,
    changeType,
    action,
    effectiveAt: action === "now" ? now : periodEnd,
  };
}

export async function previewPlanChange(
  deps: Deps,
  userId: string,
  planName: string,
): Promise<{
  changeType: ChangeType;
  action: Action;
  effectiveAt: Date;
  description: string;
}> {
  return withProviderErrors(async () => {
    const ev = await evaluate(deps, userId, planName);
    if ("same" in ev) {
      throw new AppError(
        409,
        "ALREADY_ON_PLAN",
        "You are already on this plan",
      );
    }
    return {
      changeType: ev.changeType,
      action: ev.action,
      effectiveAt: ev.effectiveAt,
      description: describeAction(ev.target, ev.action),
    };
  });
}

async function undoQuietly(
  deps: Deps,
  what: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    deps.logger.error("Failed to undo Paddle change", {
      what,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function requestPlanChange(
  deps: Deps,
  user: TokenUser,
  planName: string,
): Promise<PlanChangeResult> {
  return withProviderErrors(async () => {
    const ev = await evaluate(deps, user.id, planName);
    if ("same" in ev) {
      if (!isScheduled(ev.live, ev.sub)) {
        throw new AppError(
          409,
          "ALREADY_ON_PLAN",
          "You are already on this plan",
        );
      }
      await revert(deps, ev.sub, ev.live!);
      return { action: "reverted" };
    }
    const { sub, target, live, changeType, action } = ev;
    const paddleId = sub.paddle_subscription_id;

    if (live && paddleId && changeType === "cancel" && action === "now") {
      await deps.paddle.cancelSubscription(paddleId, "immediately");
      await cancelNow(deps, sub);
      return { action: "canceled" };
    }

    if (action === "now" && changeType !== "cancel") {
      return openCheckout(deps, {
        user,
        itemType: "plan",
        itemId: target.id,
        changeType,
        fromSubscriptionId: sub.id,
      });
    }

    if (live && paddleId) {
      if (changeType === "cancel") {
        await scheduleCancel(deps, sub, live, paddleId);
      } else {
        const targetPrice = await ensurePaddlePrice(deps, "plan", target.id);
        await scheduleDowngrade(live, paddleId, targetPrice, deps);
      }
    }
    await setNext(deps, sub, target.id);
    return { action: "scheduled", effectiveAt: ev.effectiveAt };
  });
}

async function cancelNow(deps: Deps, sub: ActiveSubscription): Promise<void> {
  const free = await getPlanByName(deps.db, deps.config.FREE_PLAN_NAME);
  if (!free) throw new Error("Free plan missing; run npm run seed");
  const now = deps.clock.now();
  try {
    await deps.db.transaction((trx) =>
      moveToPlan(trx, deps, {
        from: sub,
        toPlan: free,
        status: "canceled",
        t: now,
        periodStart: now,
        periodEnd: addMonths(now, 1),
        paddleSubscriptionId: null,
        invoiceId: null,
        paddleCancelPending: false,
      }),
    );
  } catch (err) {
    // A webhook already closed this row; the cancellation is done either way.
    if (!(err instanceof StaleSubscriptionError)) throw err;
  }
}

async function scheduleDowngrade(
  live: Live,
  paddleId: string,
  targetPrice: string,
  deps: Deps,
): Promise<void> {
  const cleared = live.scheduledChange !== null;
  if (cleared) await deps.paddle.removeScheduledChange(paddleId);
  try {
    await deps.paddle.updateSubscriptionPrice(paddleId, targetPrice);
  } catch (err) {
    if (cleared) {
      await undoQuietly(deps, "restore scheduled cancel", () =>
        deps.paddle.cancelSubscription(paddleId, "next_billing_period"),
      );
    }
    throw err;
  }
}

async function scheduleCancel(
  deps: Deps,
  sub: ActiveSubscription,
  live: Live,
  paddleId: string,
): Promise<void> {
  const currentPrice = sub.plan.paddle_price_id;
  const resetPrice = currentPrice !== null && live.priceId !== currentPrice;
  if (resetPrice) {
    await deps.paddle.updateSubscriptionPrice(paddleId, currentPrice);
  }
  try {
    await deps.paddle.cancelSubscription(paddleId, "next_billing_period");
  } catch (err) {
    if (resetPrice && live.priceId) {
      const previous = live.priceId;
      await undoQuietly(deps, "restore scheduled downgrade", () =>
        deps.paddle.updateSubscriptionPrice(paddleId, previous),
      );
    }
    throw err;
  }
}

async function revert(
  deps: Deps,
  sub: ActiveSubscription,
  live: Live,
): Promise<void> {
  const paddleId = sub.paddle_subscription_id!;
  const cleared = live.scheduledChange?.action === "cancel";
  if (cleared) await deps.paddle.removeScheduledChange(paddleId);
  const currentPrice = sub.plan.paddle_price_id;
  if (currentPrice && live.priceId !== currentPrice) {
    try {
      await deps.paddle.updateSubscriptionPrice(paddleId, currentPrice);
    } catch (err) {
      if (cleared) {
        await undoQuietly(deps, "restore scheduled cancel", () =>
          deps.paddle.cancelSubscription(paddleId, "next_billing_period"),
        );
      }
      throw err;
    }
  }
  await setNext(deps, sub, sub.plan_id);
}

export async function revertScheduledChange(
  deps: Deps,
  userId: string,
): Promise<void> {
  await withProviderErrors(async () => {
    const sub = await loadActive(deps, userId);
    const live = await loadLive(deps, sub);
    if (!live || !isScheduled(live, sub)) {
      throw new AppError(
        409,
        "NO_SCHEDULED_CHANGE",
        "There is no scheduled change to undo",
      );
    }
    await revert(deps, sub, live);
  });
}
