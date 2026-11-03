import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../deps.js";
import { createUpload } from "../../services/uploads.js";
import { requireUser } from "../middlewares/auth.js";
import { ensureUser } from "../middlewares/ensureUser.js";
import { validate } from "../middlewares/validate.js";

const uploadBody = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int(),
});

export function uploadsRouter(deps: Deps): Router {
  const router = Router();
  const json = express.json({ limit: "100kb" });
  const guard = [requireUser(deps), ensureUser(deps)];

  router.post(
    "/v1/uploads",
    ...guard,
    json,
    validate({ body: uploadBody }),
    async (req, res) => {
      res.status(201).json(await createUpload(deps, req.user!.id, req.body));
    },
  );
  return router;
}
