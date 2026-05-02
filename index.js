import { createApp } from "./src/app.js";
import { env } from "./src/config/env.js";
import { logger } from "./src/lib/logger.js";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info("server_started", { port: env.port, env: env.nodeEnv });
});

const shutdown = (signal) => {
  logger.info("shutdown", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
