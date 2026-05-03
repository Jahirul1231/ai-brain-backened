const BASE = "/api/proxy";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""}`,
});

export const login = async (email, password) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Login failed");
  return data;
};

export const register = async (name, email, password) => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Registration failed");
  return data;
};

export const getMe = async () => {
  const res = await fetch(`${BASE}/client/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Auth required");
  return res.json();
};

export const getOnboarding = async () => {
  const res = await fetch(`${BASE}/client/onboarding`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch onboarding");
  return res.json();
};

export const updateOnboarding = async (data) => {
  const res = await fetch(`${BASE}/client/onboarding`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Failed to update");
  return result;
};

export const submitConsent = async (version = "1.0") => {
  const res = await fetch(`${BASE}/client/consent`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ version }),
  });
  if (!res.ok) throw new Error("Failed to submit consent");
  return res.json();
};

export const configureSubdomain = async (slug) => {
  const res = await fetch(`${BASE}/client/subdomain`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ slug }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to configure subdomain");
  return data;
};

export const getChatHistory = async () => {
  const res = await fetch(`${BASE}/client/chat/history`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
};

export const sendMessage = async (message, spreadsheetId, confirmed = false, sheetIds = []) => {
  const res = await fetch(`${BASE}/client/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message, spreadsheetId, confirmed, sheetIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Failed to send");
  return data;
};

export const getReports = async () => {
  const res = await fetch(`${BASE}/client/reports`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
};

export const getReport = async (id) => {
  const res = await fetch(`${BASE}/client/reports/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
};

export const createReport = async (body) => {
  const res = await fetch(`${BASE}/client/reports`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create report");
  return data;
};

export const getUpdates = async () => {
  const res = await fetch(`${BASE}/client/updates`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch updates");
  return res.json();
};

export const markUpdateRead = async (id) => {
  const res = await fetch(`${BASE}/client/updates/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to mark read");
  return res.json();
};

export const getSheets = async () => {
  const res = await fetch(`${BASE}/client/sheets`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch sheets");
  return res.json();
};

export const verifySheet = async (spreadsheetId) => {
  const res = await fetch(`${BASE}/client/sheets/verify`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ spreadsheetId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Verification failed");
  return data;
};

export const addSheet = async (spreadsheetId, spreadsheetName, tabCount = 0) => {
  const urlMatch = spreadsheetId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = urlMatch ? urlMatch[1] : spreadsheetId;
  const res = await fetch(`${BASE}/client/sheets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ spreadsheetId: id, spreadsheetName, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}`, tabCount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add sheet");
  return data;
};

export const removeSheet = async (id) => {
  const res = await fetch(`${BASE}/client/sheets/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to remove sheet");
  return res.json();
};

export const updateProfile = async (data) => {
  const res = await fetch(`${BASE}/client/profile`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
};

export const getTickets = async () => {
  const res = await fetch(`${BASE}/support/tickets`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
};

export const createTicket = async (subject, body) => {
  const res = await fetch(`${BASE}/support/tickets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ subject, body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create ticket");
  return data;
};
