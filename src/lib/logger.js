import { env } from "../config/env.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[env.logLevel] ?? LEVELS.info;

const emit = (level, msg, meta) => {
  if (LEVELS[level] < threshold) return;
  const line = { t: new Date().toISOString(), level, msg, ...(meta || {}) };
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(line));
};

export const logger = {
  debug: (msg, meta) => emit("debug", msg, meta),
  info:  (msg, meta) => emit("info",  msg, meta),
  warn:  (msg, meta) => emit("warn",  msg, meta),
  error: (msg, meta) => emit("error", msg, meta),
  child: (bindings) => ({
    debug: (m, x) => emit("debug", m, { ...bindings, ...x }),
    info:  (m, x) => emit("info",  m, { ...bindings, ...x }),
    warn:  (m, x) => emit("warn",  m, { ...bindings, ...x }),
    error: (m, x) => emit("error", m, { ...bindings, ...x }),
  }),
};
