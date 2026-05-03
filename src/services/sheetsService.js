import { google } from "googleapis";
import { getSupabase } from "../lib/supabase.js";
import { createAuthedClient, createServiceAccountClient } from "../lib/googleAuth.js";
import { env } from "../config/env.js";

const getConnection = async (tenantId) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("google_connections")
    .select("access_token, refresh_token, expiry_date")
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    const err = new Error("Google account not connected. Please connect via /sheets/connect");
    err.status = 403;
    err.code = "google_not_connected";
    throw err;
  }
  return data;
};

const getSheetsClient = async (tenantId) => {
  if (env.google.serviceAccountEmail && env.google.serviceAccountKey) {
    const auth = createServiceAccountClient();
    return google.sheets({ version: "v4", auth });
  }
  const tokens = await getConnection(tenantId);
  const auth = createAuthedClient(tokens);
  return google.sheets({ version: "v4", auth });
};

export const readSheet = async ({ tenantId, spreadsheetId, range }) => {
  const sheets = await getSheetsClient(tenantId);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return {
    range: res.data.range,
    values: res.data.values || [],
    rowCount: (res.data.values || []).length,
  };
};

export const writeSheet = async ({ tenantId, spreadsheetId, range, values }) => {
  const sheets = await getSheetsClient(tenantId);
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return {
    updatedRange: res.data.updatedRange,
    updatedRows: res.data.updatedRows,
    updatedCells: res.data.updatedCells,
  };
};

export const updateRange = async ({ tenantId, spreadsheetId, range, values }) => {
  const sheets = await getSheetsClient(tenantId);
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return {
    updatedRange: res.data.updatedRange,
    updatedRows: res.data.updatedRows,
    updatedCells: res.data.updatedCells,
  };
};

export const appendToSheet = async ({ tenantId, spreadsheetId, range, values }) => {
  const sheets = await getSheetsClient(tenantId);
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
  return {
    updatedRange: res.data.updates?.updatedRange,
    updatedRows: res.data.updates?.updatedRows,
  };
};

export const createSheet = async ({ tenantId, spreadsheetId, title }) => {
  const sheets = await getSheetsClient(tenantId);
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  const newSheet = res.data.replies[0].addSheet.properties;
  return { sheetId: newSheet.sheetId, title: newSheet.title };
};

export const listSheets = async ({ tenantId, spreadsheetId }) => {
  const sheets = await getSheetsClient(tenantId);
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  return res.data.sheets.map((s) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    rowCount: s.properties.gridProperties?.rowCount,
    columnCount: s.properties.gridProperties?.columnCount,
  }));
};
