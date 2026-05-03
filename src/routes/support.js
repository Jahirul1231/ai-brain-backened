import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { notify } from "../lib/notify.js";

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

    // Filtered tickets
    let q = sb.from("support_tickets")
      .select("*, tenants(name, business_slug)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (status) q = q.eq("status", status);
    if (priority) q = q.eq("priority", priority);
    const { data, error } = await q;
    if (error) throw error;

    // Global counts (unfiltered) for tab badges
    const { data: allStatuses } = await sb.from("support_tickets")
      .select("status");
    const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    (allStatuses || []).forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });

    res.json({ tickets: data || [], counts });
  } catch (err) {
    next(err);
  }
});

/* ── Admin: PATCH /admin/support/tickets/:id ──────────────────── */
supportRouter.patch("/admin/support/tickets/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["status", "priority", "assigned_to", "ai_draft"];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (req.body.status === "resolved") updates.resolved_at = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("support_tickets")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* ── Admin: POST /admin/support/tickets/:id/reply ─────────────── */
supportRouter.post("/admin/support/tickets/:id/reply", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: "body required" });
    const sb = getSupabase();
    const { data: ticket } = await sb.from("support_tickets").select("from_email").eq("id", req.params.id).single();
    await sb.from("ticket_messages").insert({ ticket_id: req.params.id, from_email: "support@reportude.com", body, is_staff_reply: true });
    await sb.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", req.params.id);
    res.json({ ok: true, sent_to: ticket?.from_email });
  } catch (err) {
    next(err);
  }
});
