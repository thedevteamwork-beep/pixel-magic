import { Router } from "express";
import { listModels, publicModel } from "../../models/registry.js";

export function modelsRouter(): Router {
  const router = Router();
  router.get("/v1/models", (_req, res) => {
    res
      .set("Cache-Control", "public, max-age=300")
      .json(listModels().map(publicModel));
  });
  return router;
}
