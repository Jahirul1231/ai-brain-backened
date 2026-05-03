import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const trialsRouter = Router();
trialsRouter.use(authenticate, requireAdmin);

trialsRouter.get("/trials", async (req, res, next) => {
  try {
    const { status } = req.query;
    let q = getSupabase().from("trials").select("*").order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

trialsRouter.post("/trials", async (req, res, next) => {
  try {
    const { name, email, company, trial_ends_at } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name and email required" });
    const { data, error } = await getSupabase().from("trials")
      .insert({ name, email, company, trial_ends_at }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

trialsRouter.patch("/trials/:id", async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const update = { notes };
    if (status) { update.status = status; if (status === "converted") update.converted_at = new Date().toISOString(); }
    const { data, error } = await getSupabase().from("trials").update(update).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});
