const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);

export const requireAdmin = (req, res, next) => {
  if (!req.user?.email) return res.status(401).json({ error: "unauthorized" });
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  next();
};
