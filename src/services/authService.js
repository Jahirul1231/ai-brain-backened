import { getSupabase } from "../lib/supabase.js";

const FREE_PLAN_TOKENS = 100;

export const register = async ({ name, email, password }) => {
  const supabase = getSupabase();

  // 1. Create Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) {
    const err = new Error(authErr.message);
    err.status = 400;
    err.code = "auth_error";
    throw err;
  }

  const userId = authData.user.id;
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // 2. Create tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({ name, slug })
    .select()
    .single();
  if (tenantErr) throw tenantErr;

  // 3. Create profile linking user ↔ tenant
  const { error: profileErr } = await supabase
    .from("profiles")
    .insert({ id: userId, tenant_id: tenant.id, role: "admin" });
  if (profileErr) throw profileErr;

  // 4. Seed free token balance
  const { error: tokenErr } = await supabase
    .from("token_balances")
    .insert({ tenant_id: tenant.id, balance: FREE_PLAN_TOKENS });
  if (tokenErr) throw tokenErr;

  return { userId, tenantId: tenant.id, email };
};

export const login = async ({ email, password }) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    err.code = "invalid_credentials";
    throw err;
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email },
  };
};

export const getProfile = async (userId) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, tenant_id, tenants(id, name, slug, plan), token_balances!inner(balance)")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
};
