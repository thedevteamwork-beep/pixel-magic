import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../../deps.js";
import { getUserJob } from "../../../db/repositories/jobs.repo.js";
import { AppError } from "../../../lib/errors.js";
import { getDownloadUrl } from "../../../services/jobs/finalize.js";
import { createJob, jobView } from "../../../services/jobs/jobs.js";
import { validate } from "../../middlewares/validate.js";

const createBody = z
  .object({
    model: z.string().min(1),
    prompt: z.string().default(""),
    uploadIds: z.array(z.string().uuid()).max(10).default([]),
    options: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

const idempotencyKey = z.string().min(1).max(200);
const jobId = z.string().uuid();
const downloadQuery = z.object({
  index: z.coerce.number().int().min(0).default(0),
});

export function jobsRoutes(deps: Deps): Router {
  const router = Router();
  const json = express.json({ limit: "100kb" });

  router.post(
    "/jobs",
    json,
    validate({ body: createBody }),
    async (req, res) => {
      const key = idempotencyKey.parse(req.header("Idempotency-Key"));
      const { status, job } = await createJob(
        deps,
        req.user!.id,
        req.body,
        key,
      );
      res.status(status).json(job);
    },
  );

  router.get("/jobs/:id", async (req, res) => {
    const id = jobId.safeParse(req.params.id);
    const job = id.success
      ? await getUserJob(deps.db, req.user!.id, id.data)
      : null;
    if (!job) throw new AppError(404, "NOT_FOUND", "Job not found");
    res.json(jobView(job));
  });

  router.get(
    "/jobs/:id/download-url",
    validate({ query: downloadQuery }),
    async (req, res) => {
      const id = jobId.safeParse(req.params.id);
      if (!id.success) throw new AppError(404, "NOT_FOUND", "Job not found");
      const { index } = res.locals.query as z.infer<typeof downloadQuery>;
      res.json(await getDownloadUrl(deps, req.user!.id, id.data, index));
    },
  );
  return router;
}
