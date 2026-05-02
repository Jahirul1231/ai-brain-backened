import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

let client = null;

export const getSupabase = () => {
  if (client) return client;
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    throw new Error("Supabase env not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }
  client = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
};
