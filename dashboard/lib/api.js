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

export const getSystemStatus = async () => {
  const res = await fetch(`${BASE}/system/status`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
};

export const getNotifications = async () => {
  const res = await fetch(`${BASE}/notifications`, { headers: authHeaders() });
  if (!res.ok) return { notifications: [], unread: 0 };
  return res.json();
};

export const markAllRead = async () => {
  const res = await fetch(`${BASE}/notifications/read-all`, { method: "PATCH", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed");
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

export const getAgents = async () => {
  const res = await fetch(`${BASE}/agents`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
};

export const getIssues = async (status) => {
  const url = status ? `${BASE}/issues?status=${status}` : `${BASE}/issues`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch issues");
  return res.json();
};

export const getCustomers = async () => {
  const res = await fetch(`${BASE}/customers`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
};

export const getTrials = async (status) => {
  const url = status ? `${BASE}/trials?status=${status}` : `${BASE}/trials`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch trials");
  return res.json();
};

export const getFinanceSummary = async () => {
  const res = await fetch(`${BASE}/finance/summary`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
};

export const getTransactions = async () => {
  const res = await fetch(`${BASE}/finance/transactions`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
};

export const addTransaction = async (body) => {
  const res = await fetch(`${BASE}/finance/transactions`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to add transaction");
  return res.json();
};

export const getIntel = async (category) => {
  const url = category ? `${BASE}/intel?category=${category}` : `${BASE}/intel`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch intel");
  return res.json();
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

// CRM — Client Epicenter
export const getClients = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/admin/clients${q ? `?${q}` : ""}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch clients");
  return res.json();
};

export const searchClients = async (query) => {
  const res = await fetch(`${BASE}/admin/clients/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
};

export const getClientDetail = async (id) => {
  const res = await fetch(`${BASE}/admin/clients/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch client");
  return res.json();
};

export const updateClient = async (id, data) => {
  const res = await fetch(`${BASE}/admin/clients/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update client");
  return res.json();
};

export const extendTrial = async (id, days) => {
  const res = await fetch(`${BASE}/admin/clients/${id}/extend-trial`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ days }),
  });
  if (!res.ok) throw new Error("Failed to extend trial");
  return res.json();
};

export const exportClientsCSV = async () => {
  const res = await fetch(`${BASE}/admin/clients/export/csv`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clients-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Support tickets — admin
export const getAdminTickets = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/admin/support/tickets${q ? `?${q}` : ""}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
};

export const updateTicket = async (id, data) => {
  const res = await fetch(`${BASE}/admin/support/tickets/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update ticket");
  return res.json();
};

export const replyTicket = async (id, message) => {
  const res = await fetch(`${BASE}/admin/support/tickets/${id}/reply`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to send reply");
  return res.json();
};

// COO Agent
export const getCOOHistory = async () => {
  const res = await fetch(`${BASE}/coo/history`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
};

export const sendCOOMessage = async (message) => {
  const res = await fetch(`${BASE}/coo/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "COO agent failed");
  return data;
};

// Agent Channels
export const getChannels = async () => {
  const res = await fetch(`${BASE}/channels`, { headers: authHeaders() });
  if (!res.ok) return { channels: [] };
  return res.json();
};

export const getChannelMessages = async (slug, before) => {
  const url = before ? `${BASE}/channels/${slug}/messages?before=${encodeURIComponent(before)}` : `${BASE}/channels/${slug}/messages`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
};

export const postChannelMessage = async (slug, content) => {
  const res = await fetch(`${BASE}/channels/${slug}/post`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content, sender_name: "Founder", sender_type: "founder" }),
  });
  if (!res.ok) throw new Error("Failed to send");
  return res.json();
};

export const markChannelRead = async (slug) => {
  await fetch(`${BASE}/channels/${slug}/read`, { method: "PATCH", headers: authHeaders() });
};
