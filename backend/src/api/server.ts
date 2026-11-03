import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Deps } from "../deps.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { billingRouter } from "./routes/billing.js";
import { catalogRouter } from "./routes/catalog.js";
import { healthRouter } from "./routes/health.js";
import { meRouter } from "./routes/me.js";
import { modelsRouter } from "./routes/models.js";
import { uploadsRouter } from "./routes/uploads.js";
import { webhooksRouter } from "./routes/webhooks.js";

export function createApp(deps: Deps): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: deps.config.CORS_ORIGINS }));
  app.use(webhooksRouter(deps));
  app.use(healthRouter(deps));
  app.use(catalogRouter(deps));
  app.use(modelsRouter());
  app.use(meRouter(deps));
  app.use(billingRouter(deps));
  app.use(uploadsRouter(deps));
  app.use(notFound);
  app.use(errorHandler(deps.logger));
  return app;
}
