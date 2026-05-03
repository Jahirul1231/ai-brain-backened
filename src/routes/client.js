import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getSupabase } from "../lib/supabase.js";
import { chatLimiter } from "../middleware/rateLimiter.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { notify, logActivity } from "../lib/notify.js";
import { listSheets } from "../services/sheetsService.js";
import { env } from "../config/env.js";

export const clientRouter = Router();

// All client routes require authentication
clientRouter.use(authenticate);

/* ─── GET /client/me ─────────────────────────────────────────── */
clientRouter.get("/client/me", async (req, res, next) => {
  try {
    const sb = getSupabase();
    const [profileRes, onboardingRes, balanceRes, sheetsRes] = await Promise.all([
      sb.from("profiles")
        .select("role, full_name, phone, city, tenant_id, tenants(id, name, slug, business_slug, industry, subdomain_active, plan, trial_active, trial_ends_at, account_status, max_sheets)")
        .eq("id", req.user.id)
        .single(),
      sb.from("onboarding_progress")
        .select("*")
        .eq("tenant_id", req.user.tenantId)
        .maybeSingle(),
      sb.from("token_balances")
        .select("balance")
        .eq("tenant_id", req.user.tenantId)
        .single(),
      sb.from("sheet_connections")
        .select("id, spreadsheet_id, spreadsheet_name, spreadsheet_url, is_primary, connected_at, tab_count")
        .eq("tenant_id", req.user.tenantId)
        .order("connected_at", { ascending: true }),
    ]);

    if (profileRes.error) throw profileRes.error;
    const tenant = profileRes.data.tenants;

    // Compute trial state
    const trialDaysLeft = tenant?.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      user: { id: req.user.id, email: req.user.email },
      profile: { full_name: profileRes.data.full_name, phone: profileRes.data.phone, city: profileRes.data.city },
      tenant,
      role: profileRes.data.role,
      onboarding: onboardingRes.data,
      tokenBalance: balanceRes.data?.balance ?? 0,
      sheets: sheetsRes.data || [],
      trial: { active: tenant?.trial_active, daysLeft: trialDaysLeft, endsAt: tenant?.trial_ends_at },
      serviceAccountEmail: env.google.serviceAccountEmail || null,
    });
  } catch (err) {
    next(err);
  }
});

/* ─── GET /client/sheets ─────────────────────────────────────── */
clientRouter.get("/client/sheets", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("sheet_connections")
      .select("*")
      .eq("tenant_id", req.user.tenantId)
      .order("connected_at", { ascending: true });
    if (error) throw error;
    const { data: tenant } = await getSupabase().from("tenants").select("max_sheets").eq("id", req.user.tenantId).single();
    res.json({ sheets: data || [], maxSheets: tenant?.max_sheets ?? 4 });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /client/sheets ────────────────────────────────────── */
clientRouter.post("/client/sheets", async (req, res, next) => {
  try {
    const { spreadsheetId, spreadsheetName, spreadsheetUrl, tabCount } = req.body;
    if (!spreadsheetId) return res.status(400).json({ error: "spreadsheetId required" });

    const sb = getSupabase();
    const { data: tenant } = await sb.from("tenants").select("max_sheets").eq("id", req.user.tenantId).single();
    const maxSheets = tenant?.max_sheets ?? 4;

    const { data: existing } = await sb.from("sheet_connections").select("id").eq("tenant_id", req.user.tenantId);
    if ((existing?.length || 0) >= maxSheets) {
      return res.status(400).json({ error: "limit_reached", message: `Your plan allows up to ${maxSheets} connected spreadsheets. Remove one to add another.` });
    }

    // Extract ID from URL if full URL given
    let sheetId = spreadsheetId;
    const urlMatch = spreadsheetId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) sheetId = urlMatch[1];

    const isPrimary = (existing?.length || 0) === 0;
    const { data, error } = await sb.from("sheet_connections")
      .upsert({ tenant_id: req.user.tenantId, user_id: req.user.id, spreadsheet_id: sheetId, spreadsheet_name: spreadsheetName || sheetId, spreadsheet_url: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}`, is_primary: isPrimary, tab_count: tabCount || 0 }, { onConflict: "tenant_id,spreadsheet_id" })
      .select().single();
    if (error) throw error;

    await logActivity({ action: "sheet_connected", entity: "tenant", entityId: req.user.tenantId, meta: { sheetId } });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/* ─── POST /client/sheets/verify ─────────────────────────────── */
clientRouter.post("/client/sheets/verify", async (req, res, next) => {
  try {
    const { spreadsheetId } = req.body;
    if (!spreadsheetId) return res.status(400).json({ error: "spreadsheetId required" });

    let sheetId = spreadsheetId;
    const urlMatch = spreadsheetId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) sheetId = urlMatch[1];

    if (!env.google.serviceAccountEmail || !env.google.serviceAccountKey) {
      return res.json({ ok: false, not_configured: true, spreadsheetId: sheetId });
    }

    const tabs = await listSheets({ tenantId: req.user.tenantId, spreadsheetId: sheetId });
    res.json({ ok: true, spreadsheetId: sheetId, tabs, tabCount: tabs.length });
  } catch (err) {
    const msg = err.message || "";
    const code = err.code || err.status || 0;

    if (msg.includes("API has not been used") || msg.includes("it is disabled") || msg.includes("accessNotConfigured")) {
      return res.status(400).json({
        error: "api_disabled",
        message: "Google Sheets API is not enabled. Go to Google Cloud Console → APIs & Services → enable Google Sheets API and Google Drive API.",
      });
    }
    if (code === 403 || msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("does not have")) {
      return res.status(403).json({
        error: "no_access",
        message: `Sheet not shared. Please open the sheet → Share → add ${env.google.serviceAccountEmail} as Viewer → click Send.`,
      });
    }
    if (code === 404 || msg.toLowerCase().includes("not found")) {
      return res.status(404).json({
        error: "not_found",
        message: "Sheet not found. Check the URL is correct.",
      });
    }
    // Return actual Google error so we can debug
    return res.status(500).json({ error: "google_error", message: msg || "Unknown error from Google API" });
  }
});

/* ─── DELETE /client/sheets/:id ──────────────────────────────── */
clientRouter.delete("/client/sheets/:id", async (req, res, next) => {
  try {
    const { error } = await getSupabase()
      .from("sheet_connections")
      .delete()
      .eq("id", req.params.id)
      .eq("tenant_id", req.user.tenantId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ─── PATCH /client/profile ──────────────────────────────────── */
clientRouter.patch("/client/profile", async (req, res, next) => {
  try {
    const allowed = ["full_name", "phone", "city"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "no fields to update" });
    const { error } = await getSupabase().from("profiles").update(updates).eq("id", req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ─── GET /client/onboarding ─────────────────────────────────── */
clientRouter.get("/client/onboarding", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("onboarding_progress")
      .select("*")
      .eq("tenant_id", req.user.tenantId)
      .maybeSingle();
    if (error) throw error;
    res.json(data || { step: 1, completed: false });
  } catch (err) {
    next(err);
  }
});

/* ─── PATCH /client/onboarding ───────────────────────────────── */
clientRouter.patch("/client/onboarding", async (req, res, next) => {
  try {
    const sb = getSupabase();
    const allowed = ["step", "business_name", "industry", "use_case", "sheets_shared", "consent_given", "dashboard_generated", "completed"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data: existing } = await sb
      .from("onboarding_progress")
      .select("id")
      .eq("tenant_id", req.user.tenantId)
      .maybeSingle();

    let result;
    if (existing) {
      result = await sb
        .from("onboarding_progress")
        .update(updates)
        .eq("tenant_id", req.user.tenantId)
        .select()
        .single();
    } else {
      result = await sb
        .from("onboarding_progress")
        .insert({ tenant_id: req.user.tenantId, ...updates })
        .select()
        .single();
    }
    if (result.error) throw result.error;

    // Update industry on tenant if provided
    if (updates.industry) {
      await sb.from("tenants").update({ industry: updates.industry }).eq("id", req.user.tenantId);
    }

    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

/* ─── POST /client/consent ───────────────────────────────────── */
clientRouter.post("/client/consent", async (req, res, next) => {
  try {
    const { version = "1.0" } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    const userAgent = req.headers["user-agent"] || "";

    const { data, error } = await getSupabase()
      .from("data_consents")
      .insert({
        tenant_id: req.user.tenantId,
        user_id: req.user.id,
        version,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single();
    if (error) throw error;

    // Mark consent in onboarding
    await getSupabase()
      .from("onboarding_progress")
      .update({ consent_given: true, updated_at: new Date().toISOString() })
      .eq("tenant_id", req.user.tenantId);

    await logActivity({
      action: "consent_given",
      entity: "tenant",
      entityId: req.user.tenantId,
      meta: { version, ip },
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/* ─── GET /client/reports ────────────────────────────────────── */
clientRouter.get("/client/reports", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("client_reports")
      .select("*")
      .eq("tenant_id", req.user.tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ reports: data });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /client/reports ───────────────────────────────────── */
clientRouter.post("/client/reports", chatLimiter, async (req, res, next) => {
  try {
    const { title, prompt, format = "table", spreadsheetId, deliverTo = [] } = req.body;
    if (!title || !prompt) {
      return res.status(400).json({ error: "validation", message: "title and prompt required" });
    }

    // Check token balance
    const { data: bal } = await getSupabase()
      .from("token_balances")
      .select("balance")
      .eq("tenant_id", req.user.tenantId)
      .single();
    if ((bal?.balance ?? 0) < 2) {
      return res.status(402).json({ error: "insufficient_tokens", message: "Not enough tokens. Please top up." });
    }

    // Create report record in pending state
    const { data: report, error: insertErr } = await getSupabase()
      .from("client_reports")
      .insert({
        tenant_id: req.user.tenantId,
        user_id: req.user.id,
        title,
        prompt,
        format,
        status: "generating",
        delivered_to: deliverTo,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Run AI agent asynchronously
    (async () => {
      try {
        const { messages } = await runPlannerAgent(req.user.tenantId, prompt, spreadsheetId);
        const reviewed = await runReviewerAgent(messages, prompt);

        // Debit 2 tokens
        await getSupabase().rpc("debit_tokens", { p_tenant_id: req.user.tenantId, p_amount: 2, p_reason: "report_generated" });

        let sheetUrl = null;
        if (format === "sheet" && reviewed.result?.includes("docs.google.com")) {
          sheetUrl = reviewed.result.match(/https:\/\/docs\.google\.com\/[^\s"]+/)?.[0];
        }

        await getSupabase()
          .from("client_reports")
          .update({ status: "ready", result: reviewed.result, sheet_url: sheetUrl })
          .eq("id", report.id);
      } catch {
        await getSupabase()
          .from("client_reports")
          .update({ status: "failed" })
          .eq("id", report.id);
      }
    })();

    res.status(202).json({ report, message: "Report is being generated. Check back shortly." });
  } catch (err) {
    next(err);
  }
});

/* ─── GET /client/reports/:id ────────────────────────────────── */
clientRouter.get("/client/reports/:id", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("client_reports")
      .select("*")
      .eq("id", req.params.id)
      .eq("tenant_id", req.user.tenantId)
      .single();
    if (error || !data) return res.status(404).json({ error: "not_found" });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* ─── GET /client/updates ────────────────────────────────────── */
clientRouter.get("/client/updates", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("data_updates")
      .select("*")
      .eq("tenant_id", req.user.tenantId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    const unread = data.filter((u) => !u.read).length;
    res.json({ updates: data, unread });
  } catch (err) {
    next(err);
  }
});

/* ─── PATCH /client/updates/:id/read ─────────────────────────── */
clientRouter.patch("/client/updates/:id/read", async (req, res, next) => {
  try {
    const { error } = await getSupabase()
      .from("data_updates")
      .update({ read: true })
      .eq("id", req.params.id)
      .eq("tenant_id", req.user.tenantId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /client/subdomain ─────────────────────────────────── */
clientRouter.post("/client/subdomain", async (req, res, next) => {
  try {
    const { slug } = req.body;
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: "validation", message: "slug must be lowercase alphanumeric with hyphens only" });
    }

    const sb = getSupabase();

    // Check slug uniqueness
    const { data: existing } = await sb
      .from("tenants")
      .select("id")
      .eq("business_slug", slug)
      .neq("id", req.user.tenantId)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: "slug_taken", message: "This subdomain is already taken. Please choose another." });
    }

    // Update tenant with slug
    const { error: updateErr } = await sb
      .from("tenants")
      .update({ business_slug: slug })
      .eq("id", req.user.tenantId);
    if (updateErr) throw updateErr;

    // Attempt to add subdomain via Vercel API
    const vercelToken = process.env.VERCEL_TOKEN;
    const clientProjectId = process.env.CLIENT_VERCEL_PROJECT_ID;
    let subdomainActive = false;

    if (vercelToken && clientProjectId) {
      const domain = `${slug}.reportude.com`;
      const vercelRes = await fetch(
        `https://api.vercel.com/v10/projects/${clientProjectId}/domains`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: domain }),
        }
      );
      if (vercelRes.ok) {
        subdomainActive = true;
        await sb.from("tenants").update({ subdomain_active: true }).eq("id", req.user.tenantId);
      }
    }

    await logActivity({
      action: "subdomain_configured",
      entity: "tenant",
      entityId: req.user.tenantId,
      meta: { slug, subdomainActive },
    });

    res.json({
      slug,
      subdomain: `${slug}.reportude.com`,
      active: subdomainActive,
      message: subdomainActive
        ? `Your subdomain ${slug}.reportude.com is being configured (may take a few minutes to propagate)`
        : `Subdomain slug saved. Full activation requires reportude.com DNS to be configured.`,
    });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /client/chat ──────────────────────────────────────── */
clientRouter.post("/client/chat", chatLimiter, async (req, res, next) => {
  try {
    const { message, spreadsheetId, confirmed = false } = req.body;
    if (!message) return res.status(400).json({ error: "validation", message: "message required" });

    const sb = getSupabase();
    const { data: bal } = await sb.from("token_balances").select("balance").eq("tenant_id", req.user.tenantId).single();
    if ((bal?.balance ?? 0) < 1) {
      return res.status(402).json({ error: "insufficient_tokens", message: "Not enough tokens. Please contact support." });
    }

    // Check if this is a write/modify operation and needs confirmation
    const isModifyOp = /\b(update|modify|change|set|write|delete|remove|add|insert|edit)\b/i.test(message);
    if (isModifyOp && !confirmed) {
      return res.json({
        requiresConfirmation: true,
        message: "This action will modify your spreadsheet data. Do you want to proceed?",
        originalMessage: message,
      });
    }

    const { messages, toolResults } = await runPlannerAgent(req.user.tenantId, message, spreadsheetId);
    const reviewed = await runReviewerAgent(messages, message);

    // Debit 1 token
    await sb.rpc("debit_tokens", { p_tenant_id: req.user.tenantId, p_amount: 1, p_reason: "client_chat" });

    // Save chat history
    await sb.from("chat_history").insert({
      tenant_id: req.user.tenantId,
      user_id: req.user.id,
      role: "user",
      content: message,
    });
    await sb.from("chat_history").insert({
      tenant_id: req.user.tenantId,
      user_id: req.user.id,
      role: "assistant",
      content: reviewed.result || "",
    });

    const { data: newBal } = await sb.from("token_balances").select("balance").eq("tenant_id", req.user.tenantId).single();
    res.json({ response: reviewed.result, toolResults, tokensRemaining: newBal?.balance ?? 0 });
  } catch (err) {
    next(err);
  }
});

/* ─── GET /client/chat/history ───────────────────────────────── */
clientRouter.get("/client/chat/history", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("chat_history")
      .select("role, content, created_at")
      .eq("tenant_id", req.user.tenantId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    res.json({ history: data });
  } catch (err) {
    next(err);
  }
});
