import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../deps.js";
import { listPaidInvoices } from "../../db/repositories/invoices.repo.js";
import { buyAddon } from "../../services/billing/checkout.js";
import { requireUser } from "../middlewares/auth.js";
import { ensureUser } from "../middlewares/ensureUser.js";
import { validate } from "../middlewares/validate.js";

const addonBody = z.object({ addon: z.string().min(1) });

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
