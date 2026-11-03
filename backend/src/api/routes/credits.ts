import express, { Router } from "express";
import { z } from "zod";
import { SUPPORTED_UNITS } from "../../credits/units.js";
import type { Deps } from "../../deps.js";
import { AppError } from "../../lib/errors.js";
import { getModel } from "../../models/registry.js";
import { estimateCredits } from "../../services/credits/estimate.js";
import { validate } from "../middlewares/validate.js";

const estimateBody = z
  .object({
    model: z.string().min(1),
    options: z.record(z.string(), z.unknown()).default({}),
    uploadCount: z.number().int().min(0).max(10).default(0),
    count: z.number().int().min(1).max(20).default(1),
  })
  .strict();

export function creditsRouter(deps: Deps): Router {
  const router = Router();

  // Public: the price list is not secret and needs no account.
  router.post(
    "/v1/credits/estimate",
    express.json({ limit: "100kb" }),
    validate({ body: estimateBody }),
    (req, res) => {
      const body = req.body as z.infer<typeof estimateBody>;
      const model = getModel(body.model);
      if (!model) throw new AppError(422, "VALIDATION_FAILED", "Unknown model");
      const { creditsPerJob, tier, breakdown } = estimateCredits(deps, model, {
        options: body.options,
        uploadCount: body.uploadCount,
      });
      res.json({
        model: model.key,
        count: body.count,
        tier,
        creditsPerJob,
        totalCredits: creditsPerJob * body.count,
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
