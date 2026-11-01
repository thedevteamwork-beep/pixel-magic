import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../deps.js";
import { listPaidInvoices } from "../../db/repositories/invoices.repo.js";
import { getActiveSubscription } from "../../db/repositories/subscriptions.repo.js";
import { buyAddon } from "../../services/billing/checkout.js";
import {
  previewPlanChange,
  requestPlanChange,
  revertScheduledChange,
} from "../../services/billing/planChange.js";
import { subscriptionView } from "../subscriptionView.js";
import { requireUser } from "../middlewares/auth.js";
import { ensureUser } from "../middlewares/ensureUser.js";
import { validate } from "../middlewares/validate.js";

const addonBody = z.object({ addon: z.string().min(1) });

const planBody = z.object({ plan: z.string().min(1) });
const planQuery = z.object({ plan: z.string().min(1) });

export function billingRouter(deps: Deps): Router {
  const router = Router();
  const json = express.json({ limit: "100kb" });
  const guard = [requireUser(deps), ensureUser(deps)];

  router.post(
    "/v1/billing/addons",
    ...guard,
    json,
    validate({ body: addonBody }),
    async (req, res) => {
      res.json(await buyAddon(deps, req.user!.id, req.body.addon));
    },
  );

  router.get(
    "/v1/billing/subscription/preview",
    ...guard,
    validate({ query: planQuery }),
    async (req, res) => {
      const { plan } = res.locals.query as z.infer<typeof planQuery>;
      res.json(await previewPlanChange(deps, req.user!.id, plan));
    },
  );

  router.post(
    "/v1/billing/subscription",
    ...guard,
    json,
    validate({ body: planBody }),
    async (req, res) => {
      res.json(await requestPlanChange(deps, req.user!.id, req.body.plan));
    },
  );

  router.delete(
    "/v1/billing/subscription/scheduled-change",
    ...guard,
    async (req, res) => {
      await revertScheduledChange(deps, req.user!.id);
      const sub = (await getActiveSubscription(deps.db, req.user!.id))!;
      res.json({ subscription: await subscriptionView(deps, sub) });
    },
  );

  router.get("/v1/billing/invoices", ...guard, async (req, res) => {
    const rows = await listPaidInvoices(deps.db, req.user!.id);
    res.json(
      rows.map((r) => ({
        id: r.id,
        itemType: r.item_type,
        item: r.item_name,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        paidAt: r.paid_at,
      })),
    );
  });
  return router;
}
