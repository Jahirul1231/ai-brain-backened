"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getClients, searchClients, exportClientsCSV } from "../../../lib/api";

const STATUS_BADGE = {
  active:    "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  suspended: "text-red-400 bg-red-400/10 border-red-400/20",
  churned:   "text-[#444] bg-[#111] border-[#2a2a2a]",
};

export default function ClientEpicenter() {
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState({ status: "", trial: "" });
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filter.status) params.status = filter.status;
      if (filter.trial) params.trial = filter.trial;
      const data = await getClients(params);
      setClients(data.clients || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) { loadClients(); return; }
    setSearching(true);
    try {
      const data = await searchClients(search);
      setClients(data.clients || []);
      setTotal(data.clients?.length || 0);
    } catch {}
    finally { setSearching(false); }
  };

  const clearSearch = () => { setSearch(""); loadClients(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Client Epicenter</h1>
          <p className="text-[#555] text-sm mt-1">{total} client{total !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={() => exportClientsCSV().catch(() => {})}
          className="text-xs text-[#555] border border-[#2a2a2a] px-3 py-2 rounded-lg hover:text-white hover:border-[#444] transition">
          Export CSV ↓
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or ID…"
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#00c853]/50 transition"
          />
          <button type="submit" disabled={searching}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl hover:bg-[#222] transition disabled:opacity-50">
            {searching ? "…" : "Search"}
          </button>
          {search && <button type="button" onClick={clearSearch} className="text-xs text-[#555] px-2 hover:text-white">✕</button>}
        </form>

        <select value={filter.status} onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
          className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-[#888] focus:outline-none">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="churned">Churned</option>
        </select>

        <select value={filter.trial} onChange={(e) => { setFilter({ ...filter, trial: e.target.value }); setPage(1); }}
          className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-[#888] focus:outline-none">
          <option value="">All plans</option>
          <option value="active">Trial active</option>
          <option value="expired">Trial expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e] text-[#555] text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Contact</th>
              <th className="text-left px-5 py-3 hidden lg:table-cell">City</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Tokens</th>
              <th className="text-left px-5 py-3 hidden lg:table-cell">Joined</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center">
                <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse mx-auto" />
              </td></tr>
            )}
            {!loading && clients.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-[#444] text-sm">No clients found</td></tr>
            )}
            {!loading && clients.map((c) => (
              <tr key={c.id} className="border-b border-[#161616] hover:bg-[#151515] transition">
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="text-xs text-[#444] font-mono mt-0.5">{c.id.slice(0, 8)}…</div>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <div className="text-[#888] text-xs">{c.admin_email || c.email}</div>
                  {c.admin_profile?.phone && <div className="text-[#555] text-xs mt-0.5">{c.admin_profile.phone}</div>}
                </td>
                <td className="px-5 py-3 hidden lg:table-cell text-[#666] text-xs">{c.admin_profile?.city || "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border w-fit capitalize ${STATUS_BADGE[c.account_status] || STATUS_BADGE.active}`}>
                      {c.account_status || "active"}
                    </span>
                    {c.trial_active && (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full w-fit">
                        Trial · {c.trial_days_left ?? "?"}d
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className={`font-semibold ${(c.token_balance || 0) > 20 ? "text-[#00c853]" : "text-yellow-400"}`}>
                    {c.token_balance ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3 hidden lg:table-cell text-[#555] text-xs">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/dashboard/tenants/${c.id}`}
                    className="text-xs text-[#555] hover:text-white transition">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && !search && (
        <div className="flex items-center justify-between text-sm text-[#555]">
          <span>Page {page} of {Math.ceil(total / limit)}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444] disabled:opacity-30 transition">← Prev</button>
            <button disabled={page * limit >= total} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444] disabled:opacity-30 transition">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
