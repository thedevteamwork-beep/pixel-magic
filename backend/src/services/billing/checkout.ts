import type { Deps } from "../../deps.js";
import { PaddleProviderError } from "../../clients/paddle.js";
import {
  getAddonById,
  getAddonByName,
  getPlanById,
  lockCatalogRow,
  setPaddleIds,
} from "../../db/repositories/catalog.repo.js";
import {
  attachTransaction,
  cancelInvoice,
  findReusableDraft,
  insertDraftInvoice,
} from "../../db/repositories/invoices.repo.js";
import {
  getProfile,
  lockProfile,
  setPaddleCustomerId,
} from "../../db/repositories/profiles.repo.js";
import type { PlanRow } from "../../db/rows.js";
import { AppError } from "../../lib/errors.js";
import { addMinutes } from "../../lib/time.js";
import { paddleInterval, toCents } from "./rules.js";

export type CheckoutResult = {
  action: "checkout";
  transactionId: string;
  checkoutUrl: string | null;
};

const providerError = () =>
  new AppError(502, "PAYMENT_PROVIDER_ERROR", "Payment provider error");

export async function ensurePaddleCustomer(
  deps: Deps,
  userId: string,
): Promise<string> {
  const existing = await getProfile(deps.db, userId);
  if (existing?.paddle_customer_id) return existing.paddle_customer_id;
  return deps.db.transaction(async (trx) => {
    const profile = await lockProfile(trx, userId);
    if (profile.paddle_customer_id) return profile.paddle_customer_id;
    if (!profile.email) {
      throw new AppError(
        422,
        "VALIDATION_FAILED",
        "An email address is required to buy",
      );
    }
    const customer = await deps.paddle.createCustomer(profile.email);
    await setPaddleCustomerId(trx, userId, customer.id);
    return customer.id;
  });
}

export async function ensurePaddlePrice(
  deps: Deps,
  kind: "plan" | "addon",
  id: string,
): Promise<string> {
  return deps.db.transaction(async (trx) => {
    const row = await lockCatalogRow(trx, kind, id);
    if (!row) throw new AppError(404, "NOT_FOUND", "Item not found");
    if (row.paddle_price_id) return row.paddle_price_id;
    const interval = kind === "plan" ? paddleInterval(row as PlanRow) : null;
    const product = await deps.paddle.createProduct({
      name: row.display,
      customData: { itemId: id, itemType: kind },
    });
    const price = await deps.paddle.createPrice({
      productId: product.id,
      name: `${row.display} ${interval ?? "Addon"}`,
      amountCents: toCents(row.amount),
      currency: row.currency,
      interval,
    });
    await setPaddleIds(
      trx,
      kind,
      id,
      { productId: product.id, priceId: price.id },
      deps.clock.now(),
    );
    return price.id;
  });
}

export async function openCheckout(
  deps: Deps,
  p: {
    userId: string;
    itemType: "plan" | "addon";
    itemId: string;
    changeType: "new" | "upgrade" | "downgrade" | null;
    fromSubscriptionId: string | null;
  },
): Promise<CheckoutResult> {
  const now = deps.clock.now();
  const reusable = await findReusableDraft(deps.db, {
    userId: p.userId,
    itemType: p.itemType,
    itemId: p.itemId,
    since: addMinutes(now, -deps.config.CHECKOUT_REUSE_MINUTES),
  });
  if (reusable) {
    return {
      action: "checkout",
      transactionId: reusable.paddle_transaction_id!,
      checkoutUrl: reusable.checkout_url,
    };
  }

  let invoiceId: string | null = null;
  try {
    const customerId = await ensurePaddleCustomer(deps, p.userId);
    const priceId = await ensurePaddlePrice(deps, p.itemType, p.itemId);
    const item =
      p.itemType === "plan"
        ? await getPlanById(deps.db, p.itemId)
        : await getAddonById(deps.db, p.itemId);
    if (!item) throw new AppError(404, "NOT_FOUND", "Item not found");
    const invoice = await insertDraftInvoice(deps.db, {
      user_id: p.userId,
      item_type: p.itemType,
      item_id: p.itemId,
      change_type: p.changeType,
      from_subscription_id: p.fromSubscriptionId,
      amount: item.amount,
      currency: item.currency,
      created_at: now,
    });
    invoiceId = invoice.id;
    const txn = await deps.paddle.createTransaction({
      customerId,
      priceId,
      customData: { userId: p.userId, invoiceId: invoice.id, checkout: "true" },
    });
    await attachTransaction(
      deps.db,
      invoice.id,
      { paddle_transaction_id: txn.id, checkout_url: txn.checkoutUrl },
      deps.clock.now(),
    );
    return {
      action: "checkout",
      transactionId: txn.id,
      checkoutUrl: txn.checkoutUrl,
    };
  } catch (err) {
    if (err instanceof PaddleProviderError) {
      if (invoiceId) await cancelInvoice(deps.db, invoiceId, deps.clock.now());
      throw providerError();
    }
    throw err;
  }
}

export async function buyAddon(
  deps: Deps,
  userId: string,
  addonName: string,
): Promise<CheckoutResult> {
  const addon = await getAddonByName(deps.db, addonName);
  if (!addon || addon.archived || addon.custom) {
    throw new AppError(
      422,
      "ADDON_NOT_AVAILABLE",
      "This add-on is not available",
    );
  }
  return openCheckout(deps, {
    userId,
    itemType: "addon",
    itemId: addon.id,
    changeType: null,
    fromSubscriptionId: null,
  });
}
