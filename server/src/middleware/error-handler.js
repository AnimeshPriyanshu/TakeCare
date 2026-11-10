import { Prisma } from "../generated/prisma/client.ts";
import { HttpError } from "../utils/http-error.js";
import { env } from "../config/env.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found` } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        message: err.message,
        details: err.details ?? undefined,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "value";
      return res.status(409).json({
        error: { message: `A record with this ${target} already exists` },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Resource not found" } });
    }
  }

  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: { message: "Invalid JSON body" } });
  }

  console.error("[takecare] Unhandled error:", err);

  res.status(500).json({
    error: {
      message: "Something went wrong on our side. Please try again.",
      ...(env.isProduction ? {} : { debug: err.message }),
    },
  });
}
