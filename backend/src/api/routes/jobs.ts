import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../deps.js";
import { getUserJob } from "../../db/repositories/jobs.repo.js";
import { AppError } from "../../lib/errors.js";
import { createJob, jobView } from "../../services/jobs/jobs.js";
import { requireUser } from "../middlewares/auth.js";
import { ensureUser } from "../middlewares/ensureUser.js";
import { validate } from "../middlewares/validate.js";

const createBody = z.object({
  model: z.string().min(1),
  prompt: z.string().default(""),
  uploadIds: z.array(z.string().uuid()).max(10).default([]),
  options: z.record(z.string(), z.unknown()).default({}),
});

const idempotencyKey = z.string().min(1).max(200);
const jobId = z.string().uuid();

export function jobsRouter(deps: Deps): Router {
  const router = Router();
  const json = express.json({ limit: "100kb" });
  const guard = [requireUser(deps), ensureUser(deps)];

  router.post(
    "/v1/jobs",
    ...guard,
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

  router.get("/v1/jobs/:id", ...guard, async (req, res) => {
    const id = jobId.safeParse(req.params.id);
    const job = id.success
      ? await getUserJob(deps.db, req.user!.id, id.data)
      : null;
    if (!job) throw new AppError(404, "NOT_FOUND", "Job not found");
    res.json(jobView(job));
  });
  return router;
}
