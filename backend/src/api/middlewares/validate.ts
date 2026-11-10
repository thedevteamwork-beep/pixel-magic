import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export function validate({
  body,
  query,
}: {
  body?: ZodType;
  query?: ZodType;
}): RequestHandler {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) res.locals.query = query.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}
