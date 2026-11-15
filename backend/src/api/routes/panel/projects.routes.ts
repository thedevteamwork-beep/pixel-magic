import express, { Router } from "express";
import { z } from "zod";
import type { Deps } from "../../../deps.js";
import {
  getUserProject,
  listUserProjects,
} from "../../../db/repositories/projects.repo.js";
import { decodeCursor, encodeCursor } from "../../../services/jobs/cursor.js";
import {
  createProject,
  deleteProject,
  notFound,
  projectViews,
  updateProject,
} from "../../../services/projects.js";
import { validate } from "../../middlewares/validate.js";

// `data` is checked against the project type's schema in the service.
const createBody = z.strictObject({
  type: z.string(),
  title: z.string().trim().min(1).max(120),
  data: z.record(z.string(), z.unknown()).optional(),
});

const patchBody = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => b.title !== undefined || b.data !== undefined, {
    message: "Set title or data",
  });

const projectId = z.string().uuid();

const listQuery = z.object({
  type: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

export function projectsRoutes(deps: Deps): Router {
  const router = Router();
  const json = express.json({ limit: "100kb" });

  router.post(
    "/projects",
    json,
    validate({ body: createBody }),
    async (req, res) => {
      const row = await createProject(
        deps,
        req.user!.id,
        req.body as z.infer<typeof createBody>,
      );
      res.status(201).json((await projectViews(deps, [row]))[0]);
    },
  );

  router.get("/projects", async (req, res) => {
    const { type, limit, cursor } = listQuery.parse(req.query);
    // One extra row tells us whether another page exists.
    const rows = await listUserProjects(deps.db, req.user!.id, {
      type,
      limit: limit + 1,
      before: cursor ? decodeCursor(cursor) : undefined,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    res.json({
      projects: await projectViews(deps, page),
      nextCursor:
        rows.length > limit
          ? encodeCursor({ at: last.updated_at, id: last.id })
          : null,
    });
  });

  router.get("/projects/:id", async (req, res) => {
    const id = projectId.safeParse(req.params.id);
    const row = id.success
      ? await getUserProject(deps.db, req.user!.id, id.data)
      : null;
    if (!row) throw notFound();
    res.json((await projectViews(deps, [row]))[0]);
  });

  router.patch(
    "/projects/:id",
    json,
    validate({ body: patchBody }),
    async (req, res) => {
      const id = projectId.safeParse(req.params.id);
      if (!id.success) throw notFound();
      const row = await updateProject(
        deps,
        req.user!.id,
        id.data,
        req.body as z.infer<typeof patchBody>,
      );
      res.json((await projectViews(deps, [row]))[0]);
    },
  );

  router.delete("/projects/:id", async (req, res) => {
    const id = projectId.safeParse(req.params.id);
    if (!id.success) throw notFound();
    await deleteProject(deps, req.user!.id, id.data);
    res.status(204).end();
  });
  return router;
}
