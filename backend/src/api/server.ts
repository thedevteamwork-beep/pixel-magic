import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Deps } from "../deps.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { apiRoutes } from "./routes/index.js";

export function createApp(deps: Deps): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: deps.config.CORS_ORIGINS }));
  app.use(apiRoutes(deps));
  app.use(notFound);
  app.use(errorHandler(deps.logger));
  return app;
}
