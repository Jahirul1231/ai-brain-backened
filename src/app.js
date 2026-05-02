import express from "express";
import { requestId } from "./middleware/requestId.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { logger } from "./lib/logger.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(requestId);

  app.use((req, _res, next) => {
    logger.info("request", { reqId: req.id, method: req.method, path: req.originalUrl });
    next();
  });

  app.get("/", (_req, res) => res.json({ service: "ai-brain", status: "running" }));
  app.use(healthRouter);
  app.use(authRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
