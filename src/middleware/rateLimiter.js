const windows = new Map();

const createLimiter = ({ windowMs, max, message }) => (req, res, next) => {
  const key = req.ip + req.path;
  const now = Date.now();
  const entry = windows.get(key) || { count: 0, start: now };

  if (now - entry.start > windowMs) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }
  windows.set(key, entry);

  if (entry.count > max) {
    return res.status(429).json({ error: "rate_limited", message });
  }
  next();
};

export const authLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many auth attempts. Try again in 15 minutes." });
export const chatLimiter = createLimiter({ windowMs: 60 * 1000, max: 10, message: "Too many messages. Slow down a little." });
export const apiLimiter  = createLimiter({ windowMs: 60 * 1000, max: 60, message: "Too many requests." });
