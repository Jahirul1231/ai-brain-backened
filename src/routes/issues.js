import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const issuesRouter = Router();
issuesRouter.use(authenticate, requireAdmin);

issuesRouter.get("/issues", async (req, res, next) => {
  try {
    const { status } = req.query;
    let q = getSupabase().from("client_issues").select("*, agents(name,role)").order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

issuesRouter.post("/issues", async (req, res, next) => {
  try {
    const { title, description, priority, tenant_id } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const { data, error } = await getSupabase().from("client_issues")
      .insert({ title, description, priority: priority || "medium", tenant_id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

issuesRouter.patch("/issues/:id", async (req, res, next) => {
  try {
    const { status, assigned_to, priority } = req.body;
    const update = { updated_at: new Date().toISOString() };
    if (status) { update.status = status; if (status === "resolved") update.resolved_at = new Date().toISOString(); }
    if (assigned_to) update.assigned_to = assigned_to;
    if (priority) update.priority = priority;
    const { data, error } = await getSupabase().from("client_issues").update(update).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});
