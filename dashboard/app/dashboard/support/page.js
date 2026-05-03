"use client";
import { useEffect, useState, useCallback } from "react";
import { getAdminTickets, updateTicket, replyTicket } from "../../../lib/api";

const STATUS_BADGE = {
  open:        "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  in_progress: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  resolved:    "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]",
  closed:      "text-[#333] bg-[#111] border-[#1a1a1a]",
};
const PRIORITY_COLOR = { urgent: "text-red-400", high: "text-orange-400", normal: "text-[#555]", low: "text-[#444]" };

export default function FounderSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== "all") params.status = filter;
      const data = await getAdminTickets(params);
      setTickets(data.tickets || []);
      setCounts(data.counts || {});
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); setSelected(null); }, [load]);

  const handleStatus = async (ticketId, status) => {
    try {
      await updateTicket(ticketId, { status });
      setMsg("Status updated");
      await load();
      if (selected?.id === ticketId) setSelected((t) => ({ ...t, status }));
    } catch (e) { setMsg(e.message); }
  };

  const handlePriority = async (ticketId, priority) => {
    try {
      await updateTicket(ticketId, { priority });
      await load();
      if (selected?.id === ticketId) setSelected((t) => ({ ...t, priority }));
    } catch {}
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true); setMsg("");
    try {
      await replyTicket(selected.id, reply);
      setReply("");
      setMsg("Reply sent");
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setSending(false); }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const FILTERS = [
    { key: "open",        label: "Open",        count: counts.open },
    { key: "in_progress", label: "In Progress",  count: counts.in_progress },
    { key: "resolved",    label: "Resolved",     count: counts.resolved },
    { key: "all",         label: "All",          count: totalCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Support Queue</h1>
        <p className="text-[#555] text-sm mt-1">Manage client support tickets</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${filter === f.key ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]"}`}>
            {f.label}
            {f.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-[#00c853] text-black" : "bg-[#222] text-[#555]"}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${selected ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        {/* Ticket list */}
        <div className={selected ? "lg:col-span-2" : "col-span-full"}>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>
          ) : tickets.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-10 text-center text-[#444] text-sm">
              No {filter !== "all" ? filter.replace("_", " ") : ""} tickets
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                  className={`bg-[#111] border rounded-xl p-4 cursor-pointer transition ${selected?.id === t.id ? "border-[#00c853]/40" : "border-[#1e1e1e] hover:border-[#2a2a2a]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[#444]">{t.ticket_number}</span>
                        <span className={`text-xs font-semibold uppercase ${PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.normal}`}>{t.priority}</span>
                      </div>
                      <p className="text-sm text-white font-medium truncate">{t.subject}</p>
                      <p className="text-xs text-[#444] mt-0.5">{t.tenants?.name || "Unknown client"} · {new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 capitalize ${STATUS_BADGE[t.status] || STATUS_BADGE.open}`}>
                      {t.status?.replace("_", " ")}
                    </span>
                  </div>
                  {t.body && !selected && (
                    <p className="text-xs text-[#555] mt-2 line-clamp-2">{t.body}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[#444]">{selected.ticket_number}</span>
                    <span className={`text-xs font-semibold uppercase ${PRIORITY_COLOR[selected.priority] || PRIORITY_COLOR.normal}`}>{selected.priority}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{selected.subject}</h3>
                  <p className="text-xs text-[#555] mt-0.5">{selected.tenants?.name || "Unknown client"} · {new Date(selected.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#444] hover:text-white text-sm">✕</button>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-[#ccc] mb-4 whitespace-pre-wrap">
                {selected.body}
              </div>

              {/* AI Draft */}
              {selected.ai_draft && (
                <div className="bg-[#00c853]/5 border border-[#00c853]/20 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-[#00c853] font-semibold mb-1">◎ AI Draft Response</p>
                  <p className="text-sm text-[#aaa] whitespace-pre-wrap">{selected.ai_draft}</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#555]">Status:</span>
                  <select value={selected.status} onChange={(e) => handleStatus(selected.id, e.target.value)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#555]">Priority:</span>
                  <select value={selected.priority} onChange={(e) => handlePriority(selected.id, e.target.value)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Reply */}
              <form onSubmit={handleReply} className="space-y-2">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4}
                  placeholder="Write a reply to the client…"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none" />
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setReply(selected.ai_draft || "")}
                    className="text-xs text-[#00c853] hover:underline">Use AI draft</button>
                  <button type="submit" disabled={sending || !reply.trim()}
                    className="bg-[#00c853] text-black font-bold px-5 py-2 rounded-xl text-sm hover:bg-[#00b248] transition disabled:opacity-50">
                    {sending ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </form>

              {msg && <p className="text-xs text-[#00c853] mt-2">{msg}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
