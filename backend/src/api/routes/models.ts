import { Router } from "express";
import type { Deps } from "../../deps.js";
import { listModels, publicModel } from "../../models/registry.js";
import { creditRange } from "../../services/credits/estimate.js";

export function modelsRouter(deps: Deps): Router {
  const router = Router();
  router.get("/v1/models", (_req, res) => {
    res
      .set("Cache-Control", "public, max-age=300")
      .json(listModels().map((m) => publicModel(m, creditRange(deps, m))));
  });
  return router;
}
