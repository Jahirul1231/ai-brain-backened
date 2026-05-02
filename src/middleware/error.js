import { logger } from "../lib/logger.js";
import { isProd } from "../config/env.js";

export const notFound = (req, res) => {
  res.status(404).json({ error: "not_found", path: req.originalUrl });
};

export const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  logger.error("request_failed", {
    reqId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    err: err.message,
    stack: isProd ? undefined : err.stack,
  });
  res.status(status).json({
    error: err.code || "internal_error",
    message: isProd && status === 500 ? "Internal Server Error" : err.message,
    requestId: req.id,
  });
};
