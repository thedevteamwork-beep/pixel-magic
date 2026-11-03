import express, { Router } from "express";
import type { Deps } from "../../deps.js";
import { handleFalWebhook } from "../../services/jobs/falWebhook.js";
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
  router.post(
    "/webhooks/fal",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const jobId =
        typeof req.query.jobId === "string" ? req.query.jobId : undefined;
      const status = await handleFalWebhook(
        deps,
        rawBody,
        {
          requestId: req.header("X-Fal-Webhook-Request-Id"),
          userId: req.header("X-Fal-Webhook-User-Id"),
          timestamp: req.header("X-Fal-Webhook-Timestamp"),
          signature: req.header("X-Fal-Webhook-Signature"),
        },
        jobId,
      );
      res.status(status).end();
    },
  );
  return router;
}
