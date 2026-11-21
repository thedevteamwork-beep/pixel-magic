import express, { Router } from "express";
import { z } from "zod";
import { SUPPORTED_UNITS } from "../../../credits/units.js";
import type { Deps } from "../../../deps.js";
import { AppError } from "../../../lib/errors.js";
import { getOperation } from "../../../models/registry.js";
import { MAX_IMAGE_SIDE } from "../../../services/uploads.js";
import { estimateCredits } from "../../../services/credits/estimate.js";
import { validate } from "../../middlewares/validate.js";

// The model (`plugin` and `operation`, as GET /v1/models lists them), the same
// input as POST /v1/jobs/:plugin/:operation, and how many jobs. A model priced
// by its image's size (an upscaler) also needs the image's size; the job itself
// is priced on the size measured from the upload.
const estimateBody = z.strictObject({
  plugin: z.string().min(1),
  operation: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  count: z.number().int().min(1).max(20).default(1),
  imageSize: z
    .strictObject({
      width: z.number().int().min(1).max(MAX_IMAGE_SIDE),
      height: z.number().int().min(1).max(MAX_IMAGE_SIDE),
    })
    .optional(),
});

export function creditsRoutes(deps: Deps): Router {
  const router = Router();

  // Public: the price list is not secret and needs no account.
  router.post(
    "/credits/estimate",
    express.json({ limit: "100kb" }),
    validate({ body: estimateBody }),
    (req, res) => {
      const body = req.body as z.infer<typeof estimateBody>;
      const model = getOperation(body.plugin, body.operation);
      if (!model) throw new AppError(404, "NOT_FOUND", "Plugin not found");
      const { creditsPerJob, tier, baseCredits, breakdown, images } =
        estimateCredits(deps, model, body.input, body.imageSize);
      res.json({
        model: model.key,
        count: body.count,
        tier,
        creditsPerJob,
        totalCredits: creditsPerJob * body.count,
        // creditsPerJob = (baseCredits + the breakdown's credits, rounded up) × images
        images,
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
