import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const systemRouter = Router();

systemRouter.get("/system/status", authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const checks = await Promise.allSettled([
      // Supabase
      getSupabase().from("tenants").select("id", { count: "exact", head: true }),
      // Claude API
      Promise.resolve(!!process.env.ANTHROPIC_API_KEY),
      // Google OAuth
      Promise.resolve(!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)),
    ]);

    const supabaseOk = checks[0].status === "fulfilled" && !checks[0].value.error;
    const claudeOk   = checks[1].value === true;
    const googleOk   = checks[2].value === true;

    const allOk = supabaseOk && claudeOk && googleOk;

    res.json({
      overall: allOk ? "healthy" : "degraded",
      services: {
        backend:  { status: "ok",                    message: "Express API running" },
        supabase: { status: supabaseOk ? "ok" : "error", message: supabaseOk ? "Connected" : "Cannot reach database" },
        claude:   { status: claudeOk   ? "ok" : "missing", message: claudeOk ? "API key configured" : "ANTHROPIC_API_KEY not set — AI features inactive" },
        google:   { status: googleOk   ? "ok" : "missing", message: googleOk ? "OAuth credentials configured" : "Google credentials not set" },
        email:    { status: process.env.RESEND_API_KEY ? "ok" : "missing", message: process.env.RESEND_API_KEY ? "Email configured" : "RESEND_API_KEY not set — emails inactive" },
        stripe:   { status: process.env.STRIPE_SECRET_KEY ? "ok" : "missing", message: process.env.STRIPE_SECRET_KEY ? "Payments configured" : "STRIPE_SECRET_KEY not set — payments inactive" },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});
