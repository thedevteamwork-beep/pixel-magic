import { Router } from "express";
import type { Deps } from "../../../deps.js";
import { listModels, publicModel } from "../../../models/registry.js";
import { creditRange } from "../../../services/credits/estimate.js";

export function modelsRoutes(deps: Deps): Router {
  const router = Router();
  router.get("/models", (_req, res) => {
    res
      .set("Cache-Control", "public, max-age=300")
      .json(listModels().map((m) => publicModel(m, creditRange(deps, m))));
  });
  return router;
}
