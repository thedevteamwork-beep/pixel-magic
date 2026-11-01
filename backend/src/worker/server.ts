import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler, notFound } from "../api/middlewares/errorHandler.js";
import { healthRouter } from "../api/routes/health.js";
import type { Deps } from "../deps.js";
import { runBillingSweep } from "../services/billing/sweep.js";

export function createWorkerApp(deps: Deps): Express {
  const app = express();
  app.use(helmet());
  app.use(healthRouter(deps));
  app.post("/tasks/billing-sweep", async (_req, res, next) => {
    try {
      res.status(200).json(await runBillingSweep(deps));
    } catch (err) {
      next(err);
    }
  });
  app.use(notFound);
  app.use(errorHandler(deps.logger));
  return app;
}
