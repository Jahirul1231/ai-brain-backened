"use client";
import { useEffect, useState } from "react";
import { getStats, getSystemStatus, getNotifications } from "../../lib/api";
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

export default function DashboardPage() {
  const [stats, setStats]           = useState(null);
  const [system, setSystem]         = useState(null);
  const [notifications, setNotifs]  = useState([]);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getSystemStatus().then(setSystem).catch(() => {});
    getNotifications().then((d) => setNotifs(d.notifications?.slice(0, 5) || [])).catch(() => {});
  }, []);

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
          { label: "Tenants", value: stats?.totalTenants },
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

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* System Status */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest">System Status</h2>
            <Link href="/dashboard/settings" className="text-xs text-[#444] hover:text-white transition">View all →</Link>
          </div>
          {svcList.length === 0 ? (
            <p className="text-[#444] text-sm">Loading…</p>
          ) : (
            svcList.map((s) => <ServiceRow key={s.key} name={s.key.charAt(0).toUpperCase() + s.key.slice(1)} status={s.status} message={s.message} />)
          )}
        </div>

        {/* Recent Notifications */}
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
                    <p className="text-[#333] text-xs mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Talk to Brain", href: "/dashboard/brain" },
            { label: "View Tenants", href: "/dashboard/tenants" },
            { label: "Check Issues", href: "/dashboard/issues" },
            { label: "Finance", href: "/dashboard/finance" },
            { label: "Settings", href: "/dashboard/settings" },
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
