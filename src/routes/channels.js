import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const channelsRouter = Router();

channelsRouter.use(authenticate, requireAdmin);

/* ── GET /channels — all channels with unread + last message ──── */
channelsRouter.get("/channels", async (req, res, next) => {
  try {
    const sb = getSupabase();
    const userId = req.user.id;

    const [{ data: channels }, { data: reads }] = await Promise.all([
      sb.from("agent_channels").select("*").order("sort_order"),
      sb.from("channel_reads").select("channel_slug, last_read_at").eq("user_id", userId),
    ]);

    const readMap = {};
    (reads || []).forEach((r) => { readMap[r.channel_slug] = r.last_read_at; });

    const enriched = await Promise.all((channels || []).map(async (ch) => {
      const lastRead = readMap[ch.slug] || new Date(0).toISOString();
      const [{ data: last }, { count: unread }] = await Promise.all([
        sb.from("agent_messages")
          .select("sender_name, sender_type, content, created_at")
          .eq("channel_slug", ch.slug)
          .order("created_at", { ascending: false })
          .limit(1),
        sb.from("agent_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_slug", ch.slug)
          .gt("created_at", lastRead),
      ]);
      return { ...ch, last_message: last?.[0] || null, unread: unread || 0 };
    }));

    res.json({ channels: enriched });
  } catch (err) { next(err); }
});

/* ── GET /channels/:slug/messages ─────────────────────────────── */
channelsRouter.get("/channels/:slug/messages", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { before, limit = 60 } = req.query;
    const sb = getSupabase();

    let q = sb.from("agent_messages")
      .select("*")
      .eq("channel_slug", slug)
      .order("created_at", { ascending: false })
      .limit(Number(limit));
    if (before) q = q.lt("created_at", before);

    const { data, error } = await q;
    if (error) throw error;

    // Mark as read
    await sb.from("channel_reads").upsert(
      { user_id: req.user.id, channel_slug: slug, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,channel_slug" }
    );

    res.json({ messages: (data || []).reverse() });
  } catch (err) { next(err); }
});

/* ── POST /channels/:slug/post — founder sends a message ─────── */
channelsRouter.post("/channels/:slug/post", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { content, sender_name = "Founder", sender_type = "founder", meta = {} } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "content required" });

    const sb = getSupabase();
    const { data, error } = await sb.from("agent_messages")
      .insert({ channel_slug: slug, sender_type, sender_name, content: content.trim(), meta })
      .select().single();
    if (error) throw error;

    // Keep founder's read pointer current
    await sb.from("channel_reads").upsert(
      { user_id: req.user.id, channel_slug: slug, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,channel_slug" }
    );

    res.json({ message: data });
  } catch (err) { next(err); }
});

/* ── PATCH /channels/:slug/read — mark channel read ──────────── */
channelsRouter.patch("/channels/:slug/read", async (req, res, next) => {
  try {
    await getSupabase().from("channel_reads").upsert(
      { user_id: req.user.id, channel_slug: req.params.slug, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,channel_slug" }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});
