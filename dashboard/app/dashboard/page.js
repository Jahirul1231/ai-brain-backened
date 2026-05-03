"use client";
import { useEffect, useState, useCallback } from "react";
import { getStats, getSystemStatus, getNotifications, getClients } from "../../lib/api";
import Link from "next/link";

function StatusDot({ status }) {
  const color = status === "ok" ? "bg-[#00c853]" : status === "missing" ? "bg-yellow-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function ServiceRow({ name, status, message }) {
  const label = status === "ok" ? "text-[#00c853]" : status === "missing" ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <span className={`text-xs ${label}`}>{message}</span>
    </div>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function DashboardPage() {
  const [stats, setStats]          = useState(null);
  const [system, setSystem]        = useState(null);
  const [notifications, setNotifs] = useState([]);
  const [recentClients, setRecent] = useState([]);

  const load = useCallback(async () => {
    getStats().then(setStats).catch(() => {});
    getSystemStatus().then(setSystem).catch(() => {});
    getNotifications().then((d) => setNotifs(d.notifications?.slice(0, 5) || [])).catch(() => {});
    getClients({ page: 1, limit: 5 }).then((d) => setRecent(d.clients || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30s so new signups appear
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const svcList = system ? Object.entries(system.services).map(([k, v]) => ({ key: k, ...v })) : [];
  const allGreen = system?.overall === "healthy";

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${allGreen ? "bg-[#00c853] animate-pulse" : "bg-yellow-400 animate-pulse"}`} />
          <span className="text-xs text-[#555] uppercase tracking-widest">{allGreen ? "All systems operational" : "Action needed"}</span>
        </div>
        <h1 className="text-3xl font-extrabold">Overview</h1>
        <p className="text-[#555] text-sm mt-1">Reportude AI — Founder Command Centre</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Clients", value: stats?.totalTenants },
          { label: "Total Chats", value: stats?.totalChats },
          { label: "Chats Today", value: stats?.chatsToday, green: true },
          { label: "Tokens Left", value: stats?.totalTokensRemaining },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.green ? "text-[#00c853]" : "text-white"}`}>{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* Recent Signups + Notifications */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">

        {/* Recent Signups */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest">Recent Signups</h2>
            <Link href="/dashboard/tenants" className="text-xs text-[#444] hover:text-white transition">All clients →</Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="text-[#444] text-sm">No clients yet</p>
          ) : (
            <ul className="space-y-3">
              {recentClients.map((c) => {
                const trial = c.trial_active;
                const trialDays = c.trial_ends_at
                  ? Math.max(0, Math.ceil((new Date(c.trial_ends_at) - new Date()) / 86400000))
                  : null;
                return (
                  <li key={c.id}>
                    <Link href={`/dashboard/tenants/${c.id}`} className="flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-[#00c853] transition">{c.name}</p>
                        <p className="text-xs text-[#444]">{c.admin_email || c.business_slug} · {timeAgo(c.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {trial ? (
                          <span className="text-xs text-[#00c853] bg-[#00c853]/10 border border-[#00c853]/20 px-2 py-0.5 rounded-full">
                            {trialDays}d trial
                          </span>
                        ) : (
                          <span className="text-xs text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">paid</span>
                        )}
                        <p className="text-[10px] text-[#333] mt-1">{c.sheets_connected || 0} sheet{c.sheets_connected !== 1 ? "s" : ""}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest">Recent Activity</h2>
            <Link href="/dashboard/notifications" className="text-xs text-[#444] hover:text-white transition">View all →</Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-[#444] text-sm">No activity yet</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className={`flex items-start gap-2 ${n.read ? "opacity-40" : ""}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-[#333]" : "bg-[#00c853]"}`} />
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-[#555]">{n.body}</p>}
                    <p className="text-[#333] text-xs mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest">System Status</h2>
          <Link href="/dashboard/settings" className="text-xs text-[#444] hover:text-white transition">Settings →</Link>
        </div>
        {svcList.length === 0 ? (
          <p className="text-[#444] text-sm">Loading…</p>
        ) : (
          svcList.map((s) => <ServiceRow key={s.key} name={s.key.charAt(0).toUpperCase() + s.key.slice(1)} status={s.status} message={s.message} />)
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "COO Agent", href: "/dashboard/brain" },
            { label: "Client Epicenter", href: "/dashboard/tenants" },
            { label: "Support Queue", href: "/dashboard/support" },
            { label: "Channels", href: "/dashboard/channels" },
            { label: "Finance", href: "/dashboard/finance" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-sm px-4 py-2 rounded-lg transition">
              {a.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
