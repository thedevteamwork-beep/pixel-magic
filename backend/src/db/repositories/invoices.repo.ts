import type { Knex } from "knex";
import type { InvoiceRow } from "../rows.js";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

/** Converts integer cents ("2000") to a dollar string ("20.00") using string math. */
export function centsToDollars(cents: string): string {
  const digits = BigInt(cents).toString().padStart(3, "0");
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

export async function insertDraftInvoice(
  db: Db,
  p: {
    user_id: string;
    item_type: "plan" | "addon";
    item_id: string;
    change_type: "new" | "upgrade" | "downgrade" | null;
    from_subscription_id: string | null;
    amount: string;
    currency: string;
    created_at: Date;
  },
): Promise<InvoiceRow> {
  const [row] = await db(T.invoices)
    .insert({
      ...p,
      status: "draft",
      updated_at: p.created_at,
    })
    .returning("*");
  return row;
}

export async function attachTransaction(
  db: Db,
  id: string,
  p: { paddle_transaction_id: string; checkout_url: string | null },
  now: Date,
): Promise<void> {
  await db(T.invoices)
    .where({ id })
    .update({ ...p, updated_at: now });
}

export async function cancelInvoice(
  db: Db,
  id: string,
  now: Date,
): Promise<void> {
  await db(T.invoices)
    .where({ id, status: "draft" })
    .update({ status: "canceled", updated_at: now });
}

export async function findReusableDraft(
  db: Db,
  p: {
    userId: string;
    itemType: "plan" | "addon";
    itemId: string;
    since: Date;
  },
): Promise<InvoiceRow | null> {
  return (
    (await db(T.invoices)
      .where({
        user_id: p.userId,
        item_type: p.itemType,
        item_id: p.itemId,
        status: "draft",
      })
      .whereNotNull("paddle_transaction_id")
      .where("created_at", ">=", p.since)
      .orderBy("created_at", "desc")
      .first()) ?? null
  );
}

export async function getInvoice(
  trx: Db,
  id: string,
): Promise<InvoiceRow | null> {
  return (await trx(T.invoices).where({ id }).first()) ?? null;
}

/** Compare-and-set draft or canceled to paid; null when already paid (or missing). */
export async function markInvoicePaid(
  trx: Db,
  id: string,
  p: {
    paddleTransactionId: string;
    paddleSubscriptionId: string | null;
    billingPeriod: { startsAt: Date; endsAt: Date } | null;
    origin: string;
    amountCents: string;
    currency: string;
    paidAt: Date;
  },
): Promise<InvoiceRow | null> {
  const [row] = await trx(T.invoices)
    .where({ id })
    .whereIn("status", ["draft", "canceled"])
    .update({
      status: "paid",
      paddle_transaction_id: p.paddleTransactionId,
      paddle_subscription_id: p.paddleSubscriptionId,
      billing_period_start: p.billingPeriod?.startsAt ?? null,
      billing_period_end: p.billingPeriod?.endsAt ?? null,
      origin: p.origin,
      amount: centsToDollars(p.amountCents),
      currency: p.currency,
      paid_at: p.paidAt,
      updated_at: p.paidAt,
    })
    .returning("*");
  return row ?? null;
}

export async function insertPaidInvoice(
  trx: Db,
  p: {
    user_id: string;
    item_type: "plan";
    item_id: string | null;
    origin: string;
    paddle_transaction_id: string;
    paddle_subscription_id: string | null;
    amount: string;
    currency: string;
    billing_period_start: Date | null;
    billing_period_end: Date | null;
    paid_at: Date;
  },
): Promise<InvoiceRow | null> {
  const [row] = await trx(T.invoices)
    .insert({
      ...p,
      status: "paid",
      created_at: p.paid_at,
      updated_at: p.paid_at,
    })
    .onConflict("paddle_transaction_id")
    .ignore()
    .returning("*");
  return row ?? null;
}

export async function listPaidInvoices(
  db: Db,
  userId: string,
): Promise<Array<InvoiceRow & { item_name: string | null }>> {
  return db(`${T.invoices} as i`)
    .leftJoin(`${T.plans} as p`, function () {
      this.on("p.id", "i.item_id").andOnVal("i.item_type", "plan");
    })
    .leftJoin(`${T.addons} as a`, function () {
      this.on("a.id", "i.item_id").andOnVal("i.item_type", "addon");
    })
    .where({ "i.user_id": userId, "i.status": "paid" })
    .orderBy("i.paid_at", "desc")
    .select("i.*", db.raw("coalesce(p.name, a.name) as item_name"));
}

export async function cancelDraftsBefore(
  db: Db,
  before: Date,
  now: Date,
): Promise<number> {
  return db(T.invoices)
    .where({ status: "draft" })
    .where("created_at", "<", before)
    .update({ status: "canceled", updated_at: now });
}
