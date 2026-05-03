import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getStats, getTenants, getTenantDetail, grantTokens } from "../services/adminService.js";
import { getSupabase } from "../lib/supabase.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/admin/stats", async (_req, res, next) => {
  try {
    res.json(await getStats());
  } catch (err) { next(err); }
});

adminRouter.get("/admin/tenants", async (_req, res, next) => {
  try {
    res.json(await getTenants());
  } catch (err) { next(err); }
});

adminRouter.get("/admin/tenants/:id", async (req, res, next) => {
  try {
    res.json(await getTenantDetail(req.params.id));
  } catch (err) { next(err); }
});

adminRouter.post("/admin/tenants/:id/grant", async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: "amount must be >= 1" });
    const result = await grantTokens({
      tenantId: req.params.id,
      amount: parseInt(amount, 10),
      adminEmail: req.user.email,
    });
    res.json(result);
  } catch (err) { next(err); }
});

/* ── Client Epicenter: search ─────────────────────────────────── */
adminRouter.get("/admin/clients/search", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: "query must be at least 2 characters" });
    const sb = getSupabase();
    // Search by email or phone via profiles, or tenant name
    const { data: byEmail } = await sb.auth.admin.listUsers();
    const matchedUsers = byEmail?.users?.filter((u) =>
      u.email?.toLowerCase().includes(q.toLowerCase())
    ) || [];

    const userIds = matchedUsers.map((u) => u.id);
    let profiles = [];
    if (userIds.length > 0) {
      const { data } = await sb
        .from("profiles")
        .select("id, full_name, phone, city, tenant_id, role, tenants(id, name, business_slug, plan, account_status, trial_active, trial_ends_at, created_at)")
        .in("id", userIds);
      profiles = data || [];
    }

    // Also search by tenant name or phone
    const { data: byTenant } = await sb
      .from("profiles")
      .select("id, full_name, phone, city, tenant_id, role, tenants(id, name, business_slug, plan, account_status, trial_active, trial_ends_at, created_at)")
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

    const combined = [...profiles, ...(byTenant || [])];
    const seen = new Set();
    const unique = combined.filter((p) => {
      if (seen.has(p.tenant_id)) return false;
      seen.add(p.tenant_id);
      return true;
    });

    res.json({ results: unique, count: unique.length });
  } catch (err) { next(err); }
});

/* ── Client Epicenter: full list with filters ─────────────────── */
adminRouter.get("/admin/clients", async (req, res, next) => {
  try {
    const { status, trial, page = 1, limit = 50 } = req.query;
    const sb = getSupabase();
    let q = sb.from("tenants")
      .select(`
        id, name, business_slug, plan, account_status,
        trial_active, trial_started_at, trial_ends_at,
        created_at, industry, subdomain_active, notes,
        profiles(id, full_name, phone, city, role),
        token_balances(balance),
        onboarding_progress(step, completed),
        sheet_connections(count)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) q = q.eq("account_status", status);
    if (trial === "active") q = q.eq("trial_active", true);
    if (trial === "expired") q = q.eq("trial_active", false);

    const { data, error, count } = await q;
    if (error) throw error;

    // Attach emails from auth
    const { data: users } = await sb.auth.admin.listUsers();
    const emailMap = {};
    users?.users?.forEach((u) => { emailMap[u.id] = u.email; });

    const enriched = (data || []).map((t) => {
      const adminProfile = t.profiles?.find((p) => p.role === "admin") || t.profiles?.[0];
      return {
        ...t,
        admin_email: adminProfile ? emailMap[adminProfile.id] : null,
        admin_profile: adminProfile,
        token_balance: t.token_balances?.balance ?? 0,
        onboarding: t.onboarding_progress,
        sheets_connected: t.sheet_connections?.[0]?.count || 0,
      };
    });

    res.json({ clients: enriched, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

/* ── Client Epicenter: export CSV (must be before /:id) ──────── */
adminRouter.get("/admin/clients/export/csv", async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: tenants } = await sb
      .from("tenants")
      .select("id, name, business_slug, plan, account_status, trial_active, trial_ends_at, created_at, industry, profiles(id, full_name, phone, city), token_balances(balance), onboarding_progress(step, completed)")
      .order("created_at", { ascending: false });

    const { data: users } = await sb.auth.admin.listUsers();
    const emailMap = {};
    users?.users?.forEach((u) => { emailMap[u.id] = u.email; });

    const rows = [["Client ID", "Business Name", "Slug", "Admin Name", "Email", "Phone", "City", "Plan", "Status", "Trial Active", "Trial Ends", "Tokens", "Onboarding Step", "Onboarding Done", "Industry", "Joined"]];

    (tenants || []).forEach((t) => {
      const p = t.profiles?.[0] || {};
      rows.push([
        t.id, t.name, t.business_slug, p.full_name || "", emailMap[p.id] || "", p.phone || "", p.city || "",
        t.plan, t.account_status, t.trial_active ? "Yes" : "No",
        t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString() : "",
        t.token_balances?.balance ?? 0,
        t.onboarding_progress?.step || 1,
        t.onboarding_progress?.completed ? "Yes" : "No",
        t.industry || "", new Date(t.created_at).toLocaleDateString(),
      ]);
    });

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="clients-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

/* ── Client Epicenter: single client detail ───────────────────── */
adminRouter.get("/admin/clients/:id", async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: tenant, error } = await sb
      .from("tenants")
      .select(`
        *, profiles(id, full_name, phone, city, role, avatar_url),
        token_balances(balance),
        onboarding_progress(*),
        sheet_connections(*),
        data_consents(consented_at, version, ip_address)
      `)
      .eq("id", req.params.id)
      .single();
    if (error || !tenant) return res.status(404).json({ error: "not_found" });

    // Get email from auth
    const { data: users } = await sb.auth.admin.listUsers();
    const emailMap = {};
    users?.users?.forEach((u) => { emailMap[u.id] = u.email; });

    const enrichedProfiles = (tenant.profiles || []).map((p) => ({
      ...p,
      email: emailMap[p.id] || null,
    }));

    // Activity log
    const { data: activity } = await sb
      .from("activity_log")
      .select("action, entity, meta, created_at")
      .eq("entity_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Recent reports
    const { data: reports } = await sb
      .from("client_reports")
      .select("id, title, status, format, created_at")
      .eq("tenant_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Support tickets
    const { data: tickets } = await sb
      .from("support_tickets")
      .select("ticket_number, subject, status, priority, created_at")
      .eq("tenant_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(5);

    res.json({
      ...tenant,
      profiles: enrichedProfiles,
      token_balance: tenant.token_balances?.balance ?? 0,
      activity: activity || [],
      reports: reports || [],
      tickets: tickets || [],
    });
  } catch (err) { next(err); }
});

/* ── Client Epicenter: update client ──────────────────────────── */
adminRouter.patch("/admin/clients/:id", async (req, res, next) => {
  try {
    const sb = getSupabase();
    const tenantAllowed = ["name", "plan", "account_status", "trial_ends_at", "trial_active", "notes", "max_sheets", "industry"];
    const profileAllowed = ["full_name", "phone", "city"];

    const tenantUpdates = {};
    const profileUpdates = {};
    for (const k of tenantAllowed) if (req.body[k] !== undefined) tenantUpdates[k] = req.body[k];
    for (const k of profileAllowed) if (req.body[k] !== undefined) profileUpdates[k] = req.body[k];

    if (Object.keys(tenantUpdates).length > 0) {
      await sb.from("tenants").update(tenantUpdates).eq("id", req.params.id);
    }
    if (Object.keys(profileUpdates).length > 0) {
      await sb.from("profiles").update(profileUpdates).eq("tenant_id", req.params.id);
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Admin: extend trial ──────────────────────────────────────── */
adminRouter.post("/admin/clients/:id/extend-trial", async (req, res, next) => {
  try {
    const { days = 7 } = req.body;
    const newEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await getSupabase().from("tenants")
      .update({ trial_ends_at: newEnd.toISOString(), trial_active: true })
      .eq("id", req.params.id);
    res.json({ ok: true, trial_ends_at: newEnd.toISOString() });
  } catch (err) { next(err); }
});
