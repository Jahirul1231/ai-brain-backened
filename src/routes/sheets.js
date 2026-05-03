import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getAuthUrl, getTokensFromCode } from "../lib/googleAuth.js";
import { getSupabase } from "../lib/supabase.js";
import {
  readSheet,
  writeSheet,
  updateRange,
  appendToSheet,
  createSheet,
  listSheets,
} from "../services/sheetsService.js";

export const sheetsRouter = Router();

// Step 1 — redirect user to Google OAuth consent screen
sheetsRouter.get("/sheets/connect", authenticate, (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// Step 2 — Google redirects back here with a code
sheetsRouter.get("/sheets/callback", authenticate, async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "missing_code" });

    const tokens = await getTokensFromCode(code);
    const supabase = getSupabase();

    await supabase.from("google_connections").upsert({
      tenant_id: req.tenant.id,
      user_id: req.user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

    res.json({ message: "Google Sheets connected successfully", scope: tokens.scope });
  } catch (err) {
    next(err);
  }
});

// Check connection status
sheetsRouter.get("/sheets/status", authenticate, async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("google_connections")
      .select("scope, updated_at")
      .eq("tenant_id", req.tenant.id)
      .single();

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
    const result = await listSheets({ tenantId: req.tenant.id, spreadsheetId });
    res.json(result);
  } catch (err) { next(err); }
});

// Read data from a sheet
sheetsRouter.post("/sheets/read", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range } = req.body;
    if (!spreadsheetId || !range) return res.status(400).json({ error: "spreadsheetId and range required" });
    const result = await readSheet({ tenantId: req.tenant.id, spreadsheetId, range });
    res.json(result);
  } catch (err) { next(err); }
});

// Write (overwrite) data to a range
sheetsRouter.post("/sheets/write", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) return res.status(400).json({ error: "spreadsheetId, range and values required" });
    const result = await writeSheet({ tenantId: req.tenant.id, spreadsheetId, range, values });
    res.json(result);
  } catch (err) { next(err); }
});

// Append rows to a sheet
sheetsRouter.post("/sheets/append", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) return res.status(400).json({ error: "spreadsheetId, range and values required" });
    const result = await appendToSheet({ tenantId: req.tenant.id, spreadsheetId, range, values });
    res.json(result);
  } catch (err) { next(err); }
});

// Update a specific range
sheetsRouter.post("/sheets/update", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) return res.status(400).json({ error: "spreadsheetId, range and values required" });
    const result = await updateRange({ tenantId: req.tenant.id, spreadsheetId, range, values });
    res.json(result);
  } catch (err) { next(err); }
});

// Create a new sheet tab
sheetsRouter.post("/sheets/create", authenticate, async (req, res, next) => {
  try {
    const { spreadsheetId, title } = req.body;
    if (!spreadsheetId || !title) return res.status(400).json({ error: "spreadsheetId and title required" });
    const result = await createSheet({ tenantId: req.tenant.id, spreadsheetId, title });
    res.json(result);
  } catch (err) { next(err); }
});
