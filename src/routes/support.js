import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { notify } from "../lib/notify.js";
import { postToChannel } from "../lib/channelPost.js";

export const supportRouter = Router();

/* ── Public inbound email webhook (called by Resend/Forwardmail) ── */
supportRouter.post("/support/inbound", async (req, res, next) => {
  try {
    const secret = req.headers["x-webhook-secret"];
    if (process.env.SUPPORT_WEBHOOK_SECRET && secret !== process.env.SUPPORT_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { from, from_name, subject, text, html } = req.body;
    if (!from || !subject) return res.status(400).json({ error: "missing fields" });

    const body = text || html || "";
    const sb = getSupabase();

    // Try to match tenant by email
    const { data: users } = await sb.auth.admin.listUsers();
    const matchedUser = users?.users?.find((u) => u.email === from);
    let tenantId = null;
    let userId = null;
    if (matchedUser) {
      const { data: profile } = await sb
        .from("profiles").select("tenant_id").eq("id", matchedUser.id).single();
      tenantId = profile?.tenant_id;
      userId = matchedUser.id;
    }

    // Create ticket
    const { data: ticket, error } = await sb
      .from("support_tickets")
      .insert({ from_email: from, from_name, subject, body, tenant_id: tenantId, user_id: userId, priority: subject.toLowerCase().includes("urgent") ? "urgent" : "normal" })
      .select()
      .single();
    if (error) throw error;

    // Notify founder dashboard
    await notify({ type: "new_issue", title: `New ticket: ${subject}`, body: `From ${from}`, link: `/dashboard/support` });
    await postToChannel("support", "Support Agent", `🎫 New ticket **${ticket.ticket_number}**: "${subject}" — from ${from_name || from}`, { ticket_id: ticket.id, ticket_number: ticket.ticket_number });

    // AI draft response (non-blocking)
    if (process.env.ANTHROPIC_API_KEY) {
      (async () => {
        try {
          const { messages } = await runPlannerAgent(tenantId || "system", `Draft a helpful support reply to this customer email: Subject: "${subject}". Body: "${body.substring(0, 500)}". Be professional, empathetic, and concise.`, null);
          const reviewed = await runReviewerAgent(messages, subject);
          await sb.from("support_tickets").update({ ai_draft: reviewed.result, status: "in_progress" }).eq("id", ticket.id);
        } catch {}
      })();
    }

    res.status(201).json({ ticket_number: ticket.ticket_number, message: "Ticket created" });
  } catch (err) {
    next(err);
  }
});

/* ── Client: GET /support/tickets ─────────────────────────────── */
supportRouter.get("/support/tickets", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("support_tickets")
      .select("id, ticket_number, subject, status, priority, created_at, updated_at")
      .eq("tenant_id", req.user.tenantId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ tickets: data });
  } catch (err) {
    next(err);
  }
});

/* ── Client: POST /support/tickets ────────────────────────────── */
supportRouter.post("/support/tickets", authenticate, async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: "subject and body required" });
    const sb = getSupabase();
    const { data: ticket, error } = await sb
      .from("support_tickets")
      .insert({ from_email: req.user.email, subject, body, tenant_id: req.user.tenantId, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;
    await notify({ type: "new_issue", title: `New ticket: ${subject}`, body: `From ${req.user.email}`, link: `/dashboard/support` });
    await postToChannel("support", "Support Agent", `🎫 New ticket **${ticket.ticket_number}**: "${subject}" — from client ${req.user.email}`, { ticket_id: ticket.id, ticket_number: ticket.ticket_number });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

/* ── Admin: GET /admin/support/tickets ────────────────────────── */
supportRouter.get("/admin/support/tickets", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { status, priority } = req.query;

    let q = sb.from("support_tickets")
      .select("id, ticket_number, subject, body, status, priority, from_email, from_name, ai_draft, resolved_at, resolution_note, resolved_by, created_at, updated_at, tenant_id, tenants(name, business_slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) q = q.eq("status", status);
    if (priority) q = q.eq("priority", priority);
    const { data, error } = await q;
    if (error) throw error;

    // Per-tenant ticket counts + phone numbers in one pass
    const tenantIds = [...new Set((data || []).map((t) => t.tenant_id).filter(Boolean))];
    const [ticketCountMap, profileMap] = await Promise.all([
      (async () => {
        if (!tenantIds.length) return {};
        const { data: all } = await sb.from("support_tickets").select("tenant_id").in("tenant_id", tenantIds);
        const map = {};
        (all || []).forEach((t) => { map[t.tenant_id] = (map[t.tenant_id] || 0) + 1; });
        return map;
      })(),
      (async () => {
        if (!tenantIds.length) return {};
        const { data: profs } = await sb.from("profiles").select("tenant_id, phone, full_name").in("tenant_id", tenantIds);
        const map = {};
        (profs || []).forEach((p) => { if (!map[p.tenant_id]) map[p.tenant_id] = p; });
        return map;
      })(),
    ]);

    const enriched = (data || []).map((t) => ({
      ...t,
      client_ticket_count: t.tenant_id ? (ticketCountMap[t.tenant_id] || 1) : 1,
      client_phone: t.tenant_id ? (profileMap[t.tenant_id]?.phone || null) : null,
      client_full_name: t.tenant_id ? (profileMap[t.tenant_id]?.full_name || t.from_name) : t.from_name,
    }));

    // Global counts + today stats
    const { data: allMeta } = await sb.from("support_tickets").select("status, resolved_at");
    const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    (allMeta || []).forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const resolvedToday = (allMeta || []).filter((t) => t.resolved_at && new Date(t.resolved_at) >= todayStart).length;

    res.json({ tickets: enriched, counts, resolved_today: resolvedToday });
  } catch (err) { next(err); }
});

/* ── Admin: GET /admin/support/tickets/search ─────────────────── */
supportRouter.get("/admin/support/tickets/search", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.json({ tickets: [] });
    const sb = getSupabase();
    const term = q.trim();

    const COLS = "id, ticket_number, subject, status, priority, from_email, client_full_name, resolved_at, created_at, tenant_id, tenants(name)";

    const [{ data: byNumber }, { data: byEmail }] = await Promise.all([
      sb.from("support_tickets").select(COLS).ilike("ticket_number", `%${term}%`).limit(30),
      sb.from("support_tickets").select(COLS).ilike("from_email", `%${term}%`).limit(30),
    ]);

    // Also search by phone via profiles
    const { data: phoneProfiles } = await sb.from("profiles").select("tenant_id").ilike("phone", `%${term}%`).limit(10);
    const phoneTenantIds = (phoneProfiles || []).map((p) => p.tenant_id).filter(Boolean);
    let byPhone = [];
    if (phoneTenantIds.length) {
      const { data } = await sb.from("support_tickets").select(COLS).in("tenant_id", phoneTenantIds).limit(30);
      byPhone = data || [];
    }

    const seen = new Set();
    const tickets = [...(byNumber || []), ...(byEmail || []), ...byPhone].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    res.json({ tickets });
  } catch (err) { next(err); }
});

/* ── Admin: GET /admin/support/tickets/:id — full QA detail ───── */
supportRouter.get("/admin/support/tickets/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: ticket, error } = await sb.from("support_tickets")
      .select("*, tenants(name, business_slug)")
      .eq("id", req.params.id).single();
    if (error || !ticket) return res.status(404).json({ error: "not_found" });

    const [{ data: messages }, clientHistory, clientProfile] = await Promise.all([
      sb.from("ticket_messages").select("*").eq("ticket_id", req.params.id).order("created_at"),
      ticket.tenant_id
        ? sb.from("support_tickets")
            .select("ticket_number, subject, status, priority, created_at, resolved_at")
            .eq("tenant_id", ticket.tenant_id)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [] },
      ticket.tenant_id
        ? sb.from("profiles").select("full_name, phone, city").eq("tenant_id", ticket.tenant_id).single()
        : { data: null },
    ]);

    res.json({
      ticket,
      messages: messages || [],
      client: {
        name: clientProfile.data?.full_name || ticket.from_name,
        email: ticket.from_email,
        phone: clientProfile.data?.phone,
        city: clientProfile.data?.city,
        total_tickets: clientHistory.data?.length || 1,
        ticket_history: clientHistory.data || [],
      },
    });
  } catch (err) { next(err); }
});

/* ── Admin: PATCH /admin/support/tickets/:id ──────────────────── */
supportRouter.patch("/admin/support/tickets/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["status", "priority", "assigned_to", "ai_draft", "resolution_note"];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (req.body.status === "resolved") {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = "Founder";
    }
    await getSupabase().from("support_tickets").update(updates).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Admin: POST /admin/support/tickets/:id/reply ─────────────── */
supportRouter.post("/admin/support/tickets/:id/reply", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const content = req.body.message || req.body.body;
    if (!content) return res.status(400).json({ error: "message required" });
    const sb = getSupabase();
    await sb.from("ticket_messages").insert({
      ticket_id: req.params.id,
      sender: "staff",
      message: content,
      is_staff_reply: true,
    });
    await sb.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", req.params.id);
    // Post to channel
    await postToChannel("support", "Support Agent", `↩ Staff reply sent on ticket — resolving...`, { ticket_id: req.params.id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
