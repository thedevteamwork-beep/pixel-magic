import { Router } from "express";
import type { Deps } from "../../../deps.js";
import { requireUser } from "../../middlewares/auth.js";
import { ensureUser } from "../../middlewares/ensureUser.js";
import { billingRoutes } from "./billing.routes.js";
import { jobsRoutes } from "./jobs.routes.js";
import { meRoutes } from "./me.routes.js";
import { projectsRoutes } from "./projects.routes.js";
import { uploadsRoutes } from "./uploads.routes.js";

// Panel APIs: for the logged-in app user. The guard runs once per area,
// before each route's body parser and validation. Mounted under /v1.
export function panelRoutes(deps: Deps): Router {
  const router = Router();
  const guard = [requireUser(deps), ensureUser(deps)];

  router.use("/me", ...guard);
  router.use("/billing", ...guard);
  router.use("/uploads", ...guard);
  router.use("/jobs", ...guard);
  router.use("/projects", ...guard);

  router.use(meRoutes(deps));
  router.use(billingRoutes(deps));
  router.use(uploadsRoutes(deps));
  router.use(jobsRoutes(deps));
  router.use(projectsRoutes(deps));
  return router;
}
