"use client";
import { useEffect, useState } from "react";
import { getSystemStatus } from "../../../lib/api";

const STATUS_CONFIG = {
  ok:      { label: "Active",        dot: "bg-[#00c853]", text: "text-[#00c853]", badge: "bg-[#0f2a1a] border-[#1a3a2a]" },
  missing: { label: "Not configured", dot: "bg-yellow-400", text: "text-yellow-400", badge: "bg-yellow-400/10 border-yellow-400/20" },
  error:   { label: "Error",          dot: "bg-red-400",    text: "text-red-400",    badge: "bg-red-400/10 border-red-400/20"    },
};

const SERVICE_META = {
  backend:  { icon: "◈", label: "Backend API",    hint: "Express server on Railway" },
  supabase: { icon: "◉", label: "Supabase DB",    hint: "Database + Auth" },
  claude:   { icon: "◎", label: "Claude AI",      hint: "Add ANTHROPIC_API_KEY to Railway to activate" },
  google:   { icon: "⬡", label: "Google OAuth",   hint: "Sheets + Drive access for clients" },
  email:    { icon: "◇", label: "Email (Resend)",  hint: "Add RESEND_API_KEY to Railway to activate" },
  stripe:   { icon: "▣", label: "Stripe Payments", hint: "Add STRIPE_SECRET_KEY to Railway to activate" },
};

export default function SettingsPage() {
  const [system, setSystem] = useState(null);
  const [error, setError]   = useState("");

  useEffect(() => { getSystemStatus().then(setSystem).catch((e) => setError(e.message)); }, []);

  const services = system ? Object.entries(system.services) : [];
  const missing = services.filter(([, v]) => v.status !== "ok").length;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Settings & Integrations</h1>
        <p className="text-[#555] text-sm mt-1">All platform integrations — add missing keys to Railway to activate</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      {system && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${system.overall === "healthy" ? "bg-[#0f2a1a] border-[#1a3a2a]" : "bg-yellow-400/10 border-yellow-400/20"}`}>
          <span className={`w-2 h-2 rounded-full ${system.overall === "healthy" ? "bg-[#00c853] animate-pulse" : "bg-yellow-400 animate-pulse"}`} />
          <span className={`text-sm font-semibold ${system.overall === "healthy" ? "text-[#00c853]" : "text-yellow-400"}`}>
            {system.overall === "healthy" ? "All systems operational" : `${missing} integration${missing > 1 ? "s" : ""} need attention`}
          </span>
          <span className="text-[#444] text-xs ml-auto">{system.timestamp ? new Date(system.timestamp).toLocaleTimeString() : ""}</span>
        </div>
      )}

      <div className="space-y-3">
        {services.map(([key, svc]) => {
          const meta   = SERVICE_META[key] || { icon: "◈", label: key, hint: "" };
          const config = STATUS_CONFIG[svc.status] || STATUS_CONFIG.ok;
          return (
            <div key={key} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#00c853] text-lg shrink-0">{meta.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{meta.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${config.badge} ${config.text}`}>{config.label}</span>
                </div>
                <p className="text-[#555] text-xs mt-0.5">{svc.message}</p>
                {svc.status !== "ok" && meta.hint && (
                  <p className="text-[#444] text-xs mt-1 italic">{meta.hint}</p>
                )}
              </div>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dot}`} />
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-3">How to add keys</h2>
        <ol className="space-y-2 text-sm text-[#555]">
          <li>1. Go to <span className="text-white">railway.com</span> → your project → Variables</li>
          <li>2. Click <span className="text-white">+ New Variable</span></li>
          <li>3. Add the key (e.g. <span className="font-mono text-[#00c853]">ANTHROPIC_API_KEY</span>) and its value</li>
          <li>4. Railway auto-redeploys — come back here and refresh to see it go green</li>
        </ol>
      </div>
    </div>
  );
}
