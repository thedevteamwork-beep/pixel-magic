import type { RequestHandler } from "express";
import { jwtVerify } from "jose";
import type { Deps } from "../../deps.js";
import { AppError } from "../../lib/errors.js";

const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "Unauthenticated");

export function requireUser(deps: Deps): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      const match = header ? /^Bearer (.+)$/i.exec(header) : null;
      if (!match?.[1]) throw unauthenticated();
      const { payload } = await jwtVerify(match[1], deps.jwks, {
        issuer: `${deps.config.SUPABASE_URL}/auth/v1`,
      });
      if (
        typeof payload.sub !== "string" ||
        payload.sub === "" ||
        payload.role !== "authenticated" ||
        payload.is_anonymous === true
      ) {
        throw unauthenticated();
      }
      req.user = {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
      };
      next();
    } catch {
      next(unauthenticated());
    }
  };
}
