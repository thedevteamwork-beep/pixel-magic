import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../../deps.js";
import {
  getUserJob,
  listUserJobs,
} from "../../../db/repositories/jobs.repo.js";
import { AppError } from "../../../lib/errors.js";
import { decodeCursor, encodeCursor } from "../../../services/jobs/cursor.js";
import { createJob, jobView, jobViews } from "../../../services/jobs/jobs.js";
import { validate } from "../../middlewares/validate.js";

// The input's fields are checked against the operation's schema in createJob.
const createBody = z.strictObject({
  input: z.record(z.string(), z.unknown()),
  projectId: z.string().uuid().optional(),
});

const idempotencyKey = z.string().min(1).max(200);
const jobId = z.string().uuid();

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
  projectId: z.string().uuid().optional(),
});

export function jobsRoutes(deps: Deps): Router {
  const router = Router();
  const json = express.json({ limit: "100kb" });

  router.post(
    "/jobs/:plugin/:operation",
    json,
    validate({ body: createBody }),
    async (req, res) => {
      const key = idempotencyKey.parse(req.header("Idempotency-Key"));
      const { plugin, operation } = req.params as {
        plugin: string;
        operation: string;
      };
      const body = req.body as z.infer<typeof createBody>;
      const { status, job } = await createJob(
        deps,
        req.user!.id,
        {
          plugin,
          operation,
          input: body.input,
          projectId: body.projectId,
        },
        key,
      );
      res.status(status).json(job);
    },
  );

  router.get("/jobs", async (req, res) => {
    const { limit, cursor, projectId } = listQuery.parse(req.query);
    // One extra row tells us whether another page exists.
    const rows = await listUserJobs(deps.db, req.user!.id, {
      limit: limit + 1,
      before: cursor ? decodeCursor(cursor) : undefined,
      projectId,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    res.json({
      jobs: await jobViews(deps, page),
      nextCursor:
        rows.length > limit
          ? encodeCursor({ at: last.created_at, id: last.id })
          : null,
    });
  });

  router.get("/jobs/:id", async (req, res) => {
    const id = jobId.safeParse(req.params.id);
    const job = id.success
      ? await getUserJob(deps.db, req.user!.id, id.data)
      : null;
    if (!job) throw new AppError(404, "NOT_FOUND", "Job not found");
    res.json(await jobView(deps, job));
  });
  return router;
}
