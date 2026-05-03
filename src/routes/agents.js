import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const agentsRouter = Router();
agentsRouter.use(authenticate, requireAdmin);

agentsRouter.get("/agents", async (_req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("agents").select("*").order("role");
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

agentsRouter.patch("/agents/:id", async (req, res, next) => {
  try {
    const { status, last_task } = req.body;
    const { data, error } = await getSupabase()
      .from("agents").update({ status, last_task, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});
