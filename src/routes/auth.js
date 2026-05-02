import { Router } from "express";
import { register, login, getProfile } from "../services/authService.js";
import { authenticate } from "../middleware/authenticate.js";

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
