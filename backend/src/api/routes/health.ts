import { Router } from "express";
import type { Deps } from "../../deps.js";

export function healthRouter(deps: Deps): Router {
  const router = Router();
  router.get("/_healthz", (_req, res) => {
    res.json({ status: "ok" });
  });
  router.get("/_readyz", async (_req, res) => {
    try {
      await deps.db.raw("select 1");
      res.json({ status: "ok" });
    } catch (err) {
      deps.logger.warn("Readiness check failed", { err });
      res.status(503).json({ status: "unavailable" });
    }
  });
  return router;
}
