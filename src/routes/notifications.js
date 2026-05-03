import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate, requireAdmin);

notificationsRouter.get("/notifications", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("notifications").select("*")
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    const unread = (data || []).filter((n) => !n.read).length;
    res.json({ notifications: data || [], unread });
  } catch (err) { next(err); }
});

notificationsRouter.patch("/notifications/read-all", async (_req, res, next) => {
  try {
    await getSupabase().from("notifications").update({ read: true }).eq("read", false);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

notificationsRouter.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    await getSupabase().from("notifications").update({ read: true }).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});
