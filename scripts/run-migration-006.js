#!/usr/bin/env node
/**
 * Runs migration 006 by creating tables programmatically via Supabase REST.
 * Run: node scripts/run-migration-006.js
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Use Supabase's pg REST endpoint to execute SQL
const runSQL = async (sql, label) => {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.log(`  ✗ ${label}: ${err.substring(0, 100)}`);
    return false;
  }
  console.log(`  ✓ ${label}`);
  return true;
};

// Since we can't run raw SQL via PostgREST easily, we check what tables
// are missing and print instructions.
async function checkAndReport() {
  const tables = ["onboarding_progress", "data_consents", "client_reports", "data_updates"];
  const missing = [];

  for (const t of tables) {
    const { error } = await supabase.from(t).select("id").limit(1);
    if (error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("schema cache")) {
      missing.push(t);
      console.log(`  ✗ ${t}: NOT EXISTS`);
    } else {
      console.log(`  ✓ ${t}: EXISTS`);
    }
  }

  if (missing.length === 0) {
    console.log("\n✅ All tables already exist — migration not needed.");
    return;
  }

  console.log(`\n⚠️  ${missing.length} table(s) need to be created.`);
  console.log("\nRun the migration manually:");
  console.log("1. Go to: https://supabase.com/dashboard/project/wnthkqqjwjzalsoizqij/sql/new");
  console.log("2. Paste the contents of: supabase/migrations/006_client_portal.sql");
  console.log("3. Click 'Run'\n");
}

checkAndReport();
