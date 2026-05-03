"use client";
import { useEffect, useState } from "react";
import { getStats } from "../../lib/api";
import StatCard from "../../components/StatCard";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <div className="inline-block bg-[#00c853] text-black text-xs font-bold px-3 py-1 rounded-full mb-3">● LIVE</div>
        <h1 className="text-3xl font-extrabold">Founder Dashboard</h1>
        <p className="text-[#888] mt-1 text-sm">Real-time overview of your Reportude AI platform</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Tenants" value={stats?.totalTenants} />
        <StatCard label="Tokens Remaining" value={stats?.totalTokensRemaining} />
        <StatCard label="Total Chats" value={stats?.totalChats} />
        <StatCard label="Chats Today" value={stats?.chatsToday} green />
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/dashboard/tenants" className="bg-[#2a2a2a] hover:bg-[#333] text-sm px-4 py-2 rounded-lg transition">
            View Tenants →
          </a>
        </div>
      </div>
    </div>
  );
}
