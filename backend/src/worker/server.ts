import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler, notFound } from "../api/middlewares/errorHandler.js";
import { healthRouter } from "../api/routes/health.js";
import type { Deps } from "../deps.js";

export function createWorkerApp(deps: Deps): Express {
  const app = express();
  app.use(helmet());
  app.use(healthRouter(deps));
  app.use(notFound);
  app.use(errorHandler(deps.logger));
  return app;
}
