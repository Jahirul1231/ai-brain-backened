"use client";
import { useEffect, useState } from "react";
import { getUpdates, markUpdateRead } from "../../../lib/api";

const CHANGE_CONFIG = {
  increase: { icon: "↑", label: "Increase", cls: "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20" },
  decrease: { icon: "↓", label: "Decrease", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  alert:    { icon: "⚠", label: "Alert",    cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  info:     { icon: "◎", label: "Info",     cls: "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]" },
};

export default function UpdatesPage() {
  const [updates, setUpdates] = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  const load = () =>
    getUpdates().then(({ updates: u, unread: n }) => {
      setUpdates(u || []);
      setUnread(n || 0);
    }).catch(() => {});

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRead = async (id) => {
    await markUpdateRead(id).catch(() => {});
    setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, read: true } : u)));
    setUnread((n) => Math.max(0, n - 1));
  };

  const filtered = filter === "all" ? updates : updates.filter((u) => u.change_type === filter);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Data Updates</h1>
          <p className="text-[#555] text-sm mt-1">{unread} unread · Real-time insights from your data</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["all", "increase", "decrease", "alert", "info"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${filter === f ? "border-[#00c853]/50 text-[#00c853] bg-[#00c853]/10" : "border-[#2a2a2a] text-[#555] hover:border-[#444]"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="text-4xl mb-4 text-[#1a1a1a]">◉</div>
          <p className="text-[#444] text-sm">No updates yet — they appear automatically when your data changes</p>
          <p className="text-[#333] text-xs mt-2">Your AI agent monitors your sheets and flags important changes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const cfg = CHANGE_CONFIG[u.change_type] || CHANGE_CONFIG.info;
            return (
              <div key={u.id}
                className={`bg-[#111] border rounded-xl p-5 flex gap-4 transition ${u.read ? "border-[#161616] opacity-50" : "border-[#1e1e1e]"}`}
                onClick={() => !u.read && handleRead(u.id)}
                style={{ cursor: u.read ? "default" : "pointer" }}
              >
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg shrink-0 ${cfg.cls}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm text-white">{u.headline}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!u.read && <span className="w-2 h-2 bg-[#00c853] rounded-full" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                  </div>
                  {u.summary && <p className="text-[#555] text-xs mb-1.5">{u.summary}</p>}
                  {(u.value_now || u.value_prev) && (
                    <div className="flex gap-4 text-xs">
                      {u.value_prev && <span className="text-[#444]">Before: <span className="text-white">{u.value_prev}</span></span>}
                      {u.value_now && <span className="text-[#444]">Now: <span className={cfg.cls.includes("00c853") ? "text-[#00c853]" : "text-white"}>{u.value_now}</span></span>}
                    </div>
                  )}
                  {u.metric && <p className="text-[#333] text-xs mt-1.5">{u.metric} · {new Date(u.created_at).toLocaleString()}</p>}
                  {!u.metric && <p className="text-[#333] text-xs mt-1">{new Date(u.created_at).toLocaleString()}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
