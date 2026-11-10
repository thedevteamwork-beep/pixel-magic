import { Router } from "express";
import type { Deps } from "../../../deps.js";
import { catalogRoutes } from "./catalog.routes.js";
import { creditsRoutes } from "./credits.routes.js";
import { modelsRoutes } from "./models.routes.js";

// Public APIs: no login needed. Mounted under /v1 by routes/index.ts.
export function publicRoutes(deps: Deps): Router {
  const router = Router();
  router.use(catalogRoutes(deps));
  router.use(modelsRoutes(deps));
  router.use(creditsRoutes(deps));
  return router;
}
