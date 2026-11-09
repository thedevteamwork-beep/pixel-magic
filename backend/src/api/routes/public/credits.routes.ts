import express, { Router } from "express";
import { z } from "zod";
import { SUPPORTED_UNITS } from "../../../credits/units.js";
import type { Deps } from "../../../deps.js";
import { AppError } from "../../../lib/errors.js";
import { getOperation } from "../../../models/registry.js";
import { estimateCredits } from "../../../services/credits/estimate.js";
import { validate } from "../../middlewares/validate.js";

// The same input as POST /v1/jobs/:plugin/:operation, plus how many jobs.
const estimateBody = z.strictObject({
  input: z.record(z.string(), z.unknown()),
  count: z.number().int().min(1).max(20).default(1),
});

export function creditsRoutes(deps: Deps): Router {
  const router = Router();

  // Public: the price list is not secret and needs no account.
  router.post(
    "/credits/estimate/:plugin/:operation",
    express.json({ limit: "100kb" }),
    validate({ body: estimateBody }),
    (req, res) => {
      const body = req.body as z.infer<typeof estimateBody>;
      const { plugin, operation } = req.params as {
        plugin: string;
        operation: string;
      };
      const model = getOperation(plugin, operation);
      if (!model) throw new AppError(404, "NOT_FOUND", "Plugin not found");
      const { creditsPerJob, tier, baseCredits, breakdown } = estimateCredits(
        deps,
        model,
        body.input,
      );
      res.json({
        model: model.key,
        count: body.count,
        tier,
        creditsPerJob,
        totalCredits: creditsPerJob * body.count,
        // creditsPerJob = baseCredits + the breakdown's credits, rounded up
        baseCredits,
        breakdown: breakdown.map((b) => ({
          unit: b.unit,
          label: SUPPORTED_UNITS[b.unit].label,
          quantity: b.quantity,
          rate: b.rate,
          credits: b.credits,
        })),
      });
    },
  );
  return router;
}
