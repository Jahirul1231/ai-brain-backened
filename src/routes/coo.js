import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";
import { runCOOAgent } from "../agents/cooAgent.js";
import { chatLimiter } from "../middleware/rateLimiter.js";

export const cooRouter = Router();

cooRouter.use(authenticate, requireAdmin);

/* ── GET /coo/history ─────────────────────────────────────────── */
cooRouter.get("/coo/history", async (req, res, next) => {
  try {
    const { data } = await getSupabase()
      .from("coo_chat_history")
      .select("id, message, response, agents_consulted, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    res.json((data || []).reverse());
  } catch (err) { next(err); }
});

/* ── POST /coo/chat ───────────────────────────────────────────── */
cooRouter.post("/coo/chat", chatLimiter, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "message required" });

    const sb = getSupabase();

    // Load recent history for context (last 6 exchanges)
    const { data: history } = await sb
      .from("coo_chat_history")
      .select("message, response")
      .order("created_at", { ascending: false })
      .limit(6);

    const { response, agentsConsulted } = await runCOOAgent(message, (history || []).reverse());

    // Persist
    await sb.from("coo_chat_history").insert({
      message: message.trim(),
      response,
      agents_consulted: agentsConsulted,
    });

    res.json({ response, agentsConsulted });
  } catch (err) { next(err); }
});
