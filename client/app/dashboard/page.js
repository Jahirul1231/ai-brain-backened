"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, getUpdates, getReports } from "../../lib/api";

const CHANGE_COLORS = {
  increase: "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  decrease: "text-red-400 bg-red-400/10 border-red-400/20",
  alert:    "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  info:     "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]",
};
const CHANGE_ICON = { increase: "↑", decrease: "↓", alert: "⚠", info: "◎" };

export default function ClientDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getUpdates(), getReports()])
      .then(([m, u, r]) => { setMe(m); setUpdates(u.updates?.slice(0, 5) || []); setReports(r.reports?.slice(0, 3) || []); })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>;

  const tokenBalance = me?.tokenBalance ?? 0;
  const tenantName = me?.tenant?.name || "Your Business";
  const slug = me?.tenant?.business_slug;
  const trial = me?.trial;
  const trialExpiring = trial?.active && trial?.daysLeft <= 2;
  const sheetsCount = me?.sheets?.length || 0;

  return (
    <div className="p-8">
      {/* Trial banner */}
      {trial?.active && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-6 ${trialExpiring ? "bg-red-400/10 border-red-400/20" : "bg-[#00c853]/5 border-[#00c853]/20"}`}>
          <div>
            <p className={`text-sm font-semibold ${trialExpiring ? "text-red-400" : "text-[#00c853]"}`}>
              {trialExpiring ? `⚠ Trial expires in ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"}` : `◈ ${trial.daysLeft} days left in your free trial`}
            </p>
            <p className="text-[#444] text-xs">Full AI features active · No credit card required yet</p>
          </div>
          <Link href="/dashboard/settings" className={`text-xs px-3 py-1.5 rounded-lg border transition ${trialExpiring ? "border-red-400/30 text-red-400 hover:bg-red-400/10" : "border-[#00c853]/30 text-[#00c853] hover:bg-[#00c853]/10"}`}>
            Upgrade →
          </Link>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Welcome back, <span className="text-[#00c853]">{tenantName}</span></h1>
        <p className="text-[#555] text-sm mt-1">
          {slug && <span className="font-mono text-[#333]">{slug}.reportude.com · </span>}
          {sheetsCount} sheet{sheetsCount !== 1 ? "s" : ""} connected
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "AI Tokens",     value: tokenBalance, sub: "remaining", color: tokenBalance > 50 ? "text-[#00c853]" : "text-yellow-400" },
          { label: "Sheets",        value: sheetsCount,  sub: `of ${me?.tenant?.max_sheets ?? 4} connected`, color: "text-white" },
          { label: "Reports",       value: reports.length, sub: "generated", color: "text-white" },
          { label: "Data Updates",  value: updates.filter((u) => !u.read).length, sub: "unread", color: "text-white" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#333] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {tokenBalance <= 10 && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">Low token balance</p>
            <p className="text-[#555] text-xs">You have {tokenBalance} tokens left. Contact support to top up.</p>
          </div>
          <Link href="/dashboard/support" className="text-xs text-yellow-400 border border-yellow-400/30 px-3 py-1.5 rounded-lg hover:bg-yellow-400/10 transition">Contact →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-4">Quick Actions</h2>
          <div className="space-y-1">
            {[
              { href: "/dashboard/chat",     icon: "◎", label: "Ask AI a question",    sub: "Chat with your data" },
              { href: "/dashboard/reports",  icon: "⬡", label: "Generate a report",    sub: "Create insights on demand" },
              { href: "/dashboard/updates",  icon: "◉", label: "View data updates",    sub: "See what changed" },
              { href: "/dashboard/settings", icon: "◈", label: "Manage sheets",        sub: `${sheetsCount} of ${me?.tenant?.max_sheets ?? 4} connected` },
              { href: "/dashboard/support",  icon: "◇", label: "Get support",          sub: "Create a ticket" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1a1a1a] transition group">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] group-hover:bg-[#222] flex items-center justify-center text-[#00c853] shrink-0">{a.icon}</div>
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">{a.label}</div>
                  <div className="text-xs text-[#444]">{a.sub}</div>
                </div>
                <span className="text-[#333] group-hover:text-[#555] transition">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest">Data Updates</h2>
            <Link href="/dashboard/updates" className="text-xs text-[#555] hover:text-white transition">View all →</Link>
          </div>
          {updates.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="text-3xl mb-2 text-[#222]">◉</div>
              <p className="text-[#444] text-xs">No updates yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {updates.map((u) => {
                const cls = CHANGE_COLORS[u.change_type] || CHANGE_COLORS.info;
                return (
                  <div key={u.id} className={`flex gap-3 p-3 rounded-xl border ${cls} ${u.read ? "opacity-50" : ""}`}>
                    <span className="text-lg shrink-0">{CHANGE_ICON[u.change_type] || "◎"}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{u.headline}</p>
                      {u.summary && <p className="text-xs text-[#555] mt-0.5">{u.summary}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {reports.length > 0 && (
        <div className="mt-6 bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest">Recent Reports</h2>
            <Link href="/dashboard/reports" className="text-xs text-[#555] hover:text-white transition">View all →</Link>
          </div>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1a1a1a] transition">
                <div>
                  <p className="text-sm text-white font-medium">{r.title}</p>
                  <p className="text-xs text-[#444] mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === "ready" ? "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20" : r.status === "failed" ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
