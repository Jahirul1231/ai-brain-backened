import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const intelRouter = Router();
intelRouter.use(authenticate, requireAdmin);

intelRouter.get("/intel", async (req, res, next) => {
  try {
    const { category, unread } = req.query;
    let q = getSupabase().from("intel_items").select("*").order("created_at", { ascending: false }).limit(50);
    if (category) q = q.eq("category", category);
    if (unread === "true") q = q.eq("read", false);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

intelRouter.post("/intel", async (req, res, next) => {
  try {
    const { title, summary, url, source, category, relevance, published_at } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const { data, error } = await getSupabase().from("intel_items")
      .insert({ title, summary, url, source, category: category || "ai", relevance: relevance || 5, published_at }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

intelRouter.patch("/intel/:id/read", async (_req, res, next) => {
  try {
    const { error } = await getSupabase().from("intel_items").update({ read: true }).eq("id", _req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
