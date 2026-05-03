import express from "express";
import { requestId } from "./middleware/requestId.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { sheetsRouter } from "./routes/sheets.js";
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

  app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AI Brain — Backend</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #fff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
    .badge { background: #00c853; color: #000; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 999px; letter-spacing: 0.05em; margin-bottom: 1.5rem; }
    h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
    .sub { color: #888; margin-bottom: 3rem; font-size: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; width: 100%; max-width: 800px; margin-bottom: 3rem; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 1.25rem 1.5rem; }
    .card-label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
    .card-value { font-size: 1.1rem; font-weight: 600; color: #fff; }
    .card-value.green { color: #00c853; }
    h2 { font-size: 1rem; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem; }
    .endpoints { width: 100%; max-width: 800px; }
    .endpoint { display: flex; align-items: center; gap: 1rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 0.9rem 1.25rem; margin-bottom: 0.5rem; }
    .method { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 6px; min-width: 52px; text-align: center; }
    .get  { background: #1a3a1a; color: #00c853; }
    .post { background: #1a2a3a; color: #2196f3; }
    .path { font-family: monospace; font-size: 0.95rem; color: #ddd; flex: 1; }
    .desc { font-size: 0.8rem; color: #666; }
    .footer { margin-top: 3rem; color: #444; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="badge">● LIVE</div>
  <h1>AI Brain</h1>
  <p class="sub">Backend API — powered by Express · Supabase · Claude</p>

  <div class="grid">
    <div class="card"><div class="card-label">Status</div><div class="card-value green">Running</div></div>
    <div class="card"><div class="card-label">Environment</div><div class="card-value">${process.env.NODE_ENV || "development"}</div></div>
    <div class="card"><div class="card-label">AI Model</div><div class="card-value">${process.env.CLAUDE_MODEL || "claude-sonnet-4-6"}</div></div>
    <div class="card"><div class="card-label">Uptime</div><div class="card-value">${Math.floor(process.uptime())}s</div></div>
  </div>

  <div class="endpoints">
    <h2>Endpoints</h2>
    <div class="endpoint"><span class="method get">GET</span><span class="path">/health</span><span class="desc">Service health check</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/auth/register</span><span class="desc">Create account + tenant</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/auth/login</span><span class="desc">Login, get JWT token</span></div>
    <div class="endpoint"><span class="method get">GET</span><span class="path">/auth/me</span><span class="desc">Current user + token balance</span></div>
    <div class="endpoint" style="margin-top:1rem"><span class="method get">GET</span><span class="path">/sheets/connect</span><span class="desc">Connect Google account (OAuth)</span></div>
    <div class="endpoint"><span class="method get">GET</span><span class="path">/sheets/status</span><span class="desc">Check Google connection status</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sheets/list</span><span class="desc">List tabs in a spreadsheet</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sheets/read</span><span class="desc">Read data from a range</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sheets/write</span><span class="desc">Write data to a range</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sheets/append</span><span class="desc">Append rows to a sheet</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sheets/update</span><span class="desc">Update a specific range</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sheets/create</span><span class="desc">Create a new sheet tab</span></div>
  </div>

  <div class="footer">AI Brain Backend v0.3.0</div>
</body>
</html>`);
  });
  app.use(healthRouter);
  app.use(authRouter);
  app.use(sheetsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
