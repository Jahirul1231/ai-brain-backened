import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const customersRouter = Router();
customersRouter.use(authenticate, requireAdmin);

customersRouter.get("/customers", async (_req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("onboarding").select("*, agents(name,role), tenants(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

customersRouter.post("/customers", async (req, res, next) => {
  try {
    const { tenant_id, contact_name, contact_email, stage, health_score } = req.body;
    const { data, error } = await getSupabase().from("onboarding")
      .insert({ tenant_id, contact_name, contact_email, stage, health_score }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

customersRouter.patch("/customers/:id", async (req, res, next) => {
  try {
    const { stage, health_score, notes, assigned_to } = req.body;
    const { data, error } = await getSupabase().from("onboarding")
      .update({ stage, health_score, notes, assigned_to, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});
