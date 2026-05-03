import { getSupabase } from "../lib/supabase.js";

export const getStats = async () => {
  const supabase = getSupabase();

  const [tenantsRes, tokensRes, chatsRes, chatsToday] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("token_balances").select("balance"),
    supabase.from("chat_history").select("id", { count: "exact", head: true }),
    supabase
      .from("chat_history")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  const totalTokensIssued = (tokensRes.data || []).reduce((sum, r) => sum + (r.balance || 0), 0);

  return {
    totalTenants: tenantsRes.count || 0,
    totalTokensRemaining: totalTokensIssued,
    totalChats: chatsRes.count || 0,
    chatsToday: chatsToday.count || 0,
  };
};

export const getTenants = async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .select(`
      id, name, created_at,
      token_balances(balance),
      profiles(id, email:id)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getTenantDetail = async (tenantId) => {
  const supabase = getSupabase();

  const [tenantRes, ledgerRes, chatRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, created_at, token_balances(balance)")
      .eq("id", tenantId)
      .single(),
    supabase
      .from("token_ledger")
      .select("amount, description, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("chat_history")
      .select("id, message, response, tools_used, tokens_used, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (tenantRes.error) throw tenantRes.error;

  return {
    tenant: tenantRes.data,
    ledger: ledgerRes.data || [],
    recentChats: chatRes.data || [],
  };
};

export const grantTokens = async ({ tenantId, amount, adminEmail }) => {
  const supabase = getSupabase();

  // Upsert balance record then increment
  await supabase.from("token_balances")
    .upsert({ tenant_id: tenantId, balance: 0 }, { onConflict: "tenant_id", ignoreDuplicates: true });

  const { data: current } = await supabase
    .from("token_balances")
    .select("balance")
    .eq("tenant_id", tenantId)
    .single();

  const newBalance = (current?.balance || 0) + amount;

  await supabase.from("token_balances")
    .update({ balance: newBalance })
    .eq("tenant_id", tenantId);

  return { newBalance };
};
