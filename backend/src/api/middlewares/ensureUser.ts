import type { RequestHandler } from "express";
import type { Deps } from "../../deps.js";
import { ensureUser as ensureUserService } from "../../services/billing/subscriptions.js";

export function ensureUser(deps: Deps): RequestHandler {
  return async (req, _res, next) => {
    try {
      await ensureUserService(deps, req.user!);
      next();
    } catch (err) {
      next(err);
    }
  };
}
