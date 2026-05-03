import { Router } from "express";
import { register, login, getProfile } from "../services/authService.js";
import { authenticate } from "../middleware/authenticate.js";
import { getSupabase } from "../lib/supabase.js";
import { notify, logActivity } from "../lib/notify.js";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "validation", message: "name, email, password required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "validation", message: "password must be at least 8 characters" });
    }
    const result = await register({ name, email, password });

    // Auto-create onboarding record + fire notification (non-blocking)
    Promise.all([
      getSupabase().from("onboarding").insert({
        tenant_id: result.tenantId,
        contact_email: email,
        contact_name: name,
        stage: "signed_up",
        health_score: 10,
      }),
      notify({ type: "new_tenant", title: "New signup", body: `${name} (${email}) just created an account`, link: `/dashboard/customers` }),
      logActivity({ action: "tenant_registered", entity: "tenant", entityId: result.tenantId, meta: { email, name } }),
    ]).catch(() => null);

    res.status(201).json({ message: "Account created", ...result });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "validation", message: "email and password required" });
    }
    const session = await login({ email, password });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/auth/me", authenticate, async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json({
      user: req.user,
      tenant: profile.tenants,
      role: profile.role,
      tokenBalance: profile.token_balances?.balance ?? 0,
    });
  } catch (err) {
    next(err);
  }
});
