import { Router } from "express";
import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "reportude-ai",
    env: env.nodeEnv,
    model: env.claude.model,
    uptime: process.uptime(),
  });
});
