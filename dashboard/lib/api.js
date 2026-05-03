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
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
};

export const getStats = async () => {
  const res = await fetch(`${BASE}/admin/stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
};

export const getTenants = async () => {
  const res = await fetch(`${BASE}/admin/tenants`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
};

export const getTenantDetail = async (id) => {
  const res = await fetch(`${BASE}/admin/tenants/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch tenant");
  return res.json();
};

export const getChatHistory = async () => {
  const res = await fetch(`${BASE}/chat/history`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
};

export const sendMessage = async (message, spreadsheetId) => {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message, spreadsheetId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Failed to send");
  return data;
};

export const grantTokens = async (id, amount) => {
  const res = await fetch(`${BASE}/admin/tenants/${id}/grant`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Failed to grant tokens");
  return res.json();
};
