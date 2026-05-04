import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getAuthUrl, getTokensFromCode, createOAuthClient } from "../lib/googleAuth.js";
import { getSupabase } from "../lib/supabase.js";
import { logActivity } from "../lib/notify.js";
import {
  readSheet,
  writeSheet,
  updateRange,
  appendToSheet,
  createSheet,
  listSheets,
} from "../services/sheetsService.js";

export const sheetsRouter = Router();

// Step 1 — open Google OAuth consent in a popup
// No auth middleware — token comes from query string, encoded in state
sheetsRouter.get("/sheets/connect", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Missing token");

  const state = Buffer.from(token).toString("base64");
  const client = createOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    state,
  });
  res.redirect(url);
});

// Step 2 — Google redirects here with code + state (state = base64 JWT)
sheetsRouter.get("/sheets/callback", async (req, res) => {
  const { code, state, error } = req.query;

  const closePopup = (success, message) => {
    const color = success ? "#00c853" : "#ef4444";
    const icon = success ? "✓" : "✕";
    res.send(`<!DOCTYPE html>
<html>
<head><title>${success ? "Connected!" : "Error"}</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#fff">
  <div style="text-align:center;padding:24px">
    <div style="font-size:40px;margin-bottom:12px;color:${color}">${icon}</div>
    <p style="color:${color};font-weight:700;font-size:16px;margin:0 0 8px">${message}</p>
    ${success ? '<p style="color:#555;font-size:13px">Closing window…</p>' : '<p style="color:#555;font-size:13px">You can close this window.</p>'}
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage('${success ? "google_connected" : "google_error"}', '*');
      setTimeout(() => window.close(), ${success ? 800 : 2000});
    }
  </script>
</body>
</html>`);
  };

  if (error) return closePopup(false, "Google access denied");
  if (!code || !state) return closePopup(false, "Invalid callback");

  try {
    // Decode JWT from state
    const token = Buffer.from(state, "base64").toString("utf8");

    // Validate JWT via Supabase
    const supabase = getSupabase();
    const { data, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !data?.user) return closePopup(false, "Session expired — please try again");

    // Get tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.user.id)
      .single();
    if (!profile) return closePopup(false, "Profile not found");

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Store OAuth tokens for this tenant
    await supabase.from("google_connections").upsert({
      tenant_id: profile.tenant_id,
      user_id: data.user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

    // Update onboarding
    supabase.from("onboarding_progress")
      .update({ google_connected: true, updated_at: new Date().toISOString() })
      .eq("tenant_id", profile.tenant_id)
      .then(() => null).catch(() => null);

    logActivity({ action: "google_connected", entity: "tenant", entityId: profile.tenant_id }).catch(() => null);

    closePopup(true, "Google account connected!");
  } catch (err) {
    closePopup(false, "Something went wrong — please try again");
  }
});

// Check connection status
sheetsRouter.get("/sheets/status", authenticate, async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("google_connections")
      .select("scope, updated_at")
      .eq("tenant_id", req.user.tenantId)
      .maybeSingle();

    res.json({ connected: !!data, ...(data || {}) });
  } catch (err) {
    next(err);
  }
});

// List all sheets in a spreadsheet
sheetsRouter.post("/sheets/list", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId } = req.body;
    if (!spreadsheetId) return res.status(400).json({ error: "spreadsheetId required" });
    const result = await listSheets({ tenantId: req.user.tenantId, spreadsheetId });
    res.json(result);
  } catch (err) { next(err); }
});

// Read data from a sheet
sheetsRouter.post("/sheets/read", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range } = req.body;
    if (!spreadsheetId || !range) return res.status(400).json({ error: "spreadsheetId and range required" });
    const result = await readSheet({ tenantId: req.user.tenantId, spreadsheetId, range });
    res.json(result);
  } catch (err) { next(err); }
});

// Write (overwrite) data to a range
sheetsRouter.post("/sheets/write", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) return res.status(400).json({ error: "spreadsheetId, range and values required" });
    const result = await writeSheet({ tenantId: req.user.tenantId, spreadsheetId, range, values });
    res.json(result);
  } catch (err) { next(err); }
});

// Append rows to a sheet
sheetsRouter.post("/sheets/append", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) return res.status(400).json({ error: "spreadsheetId, range and values required" });
    const result = await appendToSheet({ tenantId: req.user.tenantId, spreadsheetId, range, values });
    res.json(result);
  } catch (err) { next(err); }
});

// Update a specific range
sheetsRouter.post("/sheets/update", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) return res.status(400).json({ error: "spreadsheetId, range and values required" });
    const result = await updateRange({ tenantId: req.user.tenantId, spreadsheetId, range, values });
    res.json(result);
  } catch (err) { next(err); }
});

// Create a new sheet tab
sheetsRouter.post("/sheets/create", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, title } = req.body;
    if (!spreadsheetId || !title) return res.status(400).json({ error: "spreadsheetId and title required" });
    const result = await createSheet({ tenantId: req.user.tenantId, spreadsheetId, title });
    res.json(result);
  } catch (err) { next(err); }
});
