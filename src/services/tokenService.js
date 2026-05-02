import { getSupabase } from "../lib/supabase.js";

export const debitTokens = async ({ tenantId, userId, action, amount = 1 }) => {
  const supabase = getSupabase();

  // Decrement balance atomically via RPC
  const { error: rpcErr } = await supabase.rpc("debit_tokens", {
    p_tenant_id: tenantId,
    p_amount: amount,
  });
  if (rpcErr) throw rpcErr;

  // Append audit log
  await supabase.from("token_ledger").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    tokens_used: amount,
  });
};

export const getBalance = async (tenantId) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("token_balances")
    .select("balance")
    .eq("tenant_id", tenantId)
    .single();
  if (error) throw error;
  return data.balance;
};
