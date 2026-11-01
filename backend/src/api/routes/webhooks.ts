import express, { Router } from "express";
import type { Deps } from "../../deps.js";
import { handlePaddleWebhook } from "../../services/billing/paddleWebhook.js";

export function webhooksRouter(deps: Deps): Router {
  const router = Router();
  router.post(
    "/webhooks/paddle",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
      const status = await handlePaddleWebhook(
        deps,
        raw,
        req.header("Paddle-Signature"),
      );
      res.status(status).end();
    },
  );
  return router;
}
