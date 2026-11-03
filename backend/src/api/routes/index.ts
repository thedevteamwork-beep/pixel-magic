import { Router } from "express";
import type { Deps } from "../../deps.js";
import { healthRoutes } from "./health.routes.js";
import { panelRoutes } from "./panel/index.js";
import { publicRoutes } from "./public/index.js";
import { webhooksRoutes } from "./webhooks.routes.js";

export function apiRoutes(deps: Deps): Router {
  const router = Router();
  router.use(webhooksRoutes(deps));
  router.use(healthRoutes(deps));
  router.use("/v1", publicRoutes(deps));
  router.use("/v1", panelRoutes(deps));
  return router;
}
