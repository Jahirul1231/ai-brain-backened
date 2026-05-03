"use client";
import { useEffect, useState, useCallback } from "react";
import {
  getAdminTickets, searchAdminTickets, getAdminTicketDetail,
  updateTicket, replyTicket,
} from "../../../lib/api";

const STATUS_STYLE = {
  open:        "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  in_progress: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  resolved:    "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]",
  closed:      "text-[#333] bg-[#111] border-[#1a1a1a]",
};
const PRIORITY_COLOR = { urgent: "text-red-400", high: "text-orange-400", normal: "text-[#666]", low: "text-[#444]" };
const PRIORITY_DOT   = { urgent: "bg-red-400", high: "bg-orange-400", normal: "bg-[#444]", low: "bg-[#333]" };

function ts(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function age(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
function resolutionTime(created, resolved) {
  if (!resolved) return null;
  const m = Math.floor((new Date(resolved) - new Date(created)) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
}

export default function FounderSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [resolvedToday, setResolvedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Detail panel state
  const [reply, setReply] = useState("");
  const [resNote, setResNote] = useState("");
  const [saving, setSaving] = useState(false);
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
      setResolvedToday(data.resolved_today || 0);
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Load detail when ticket selected
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setLoadingDetail(true);
    setReply(""); setResNote(""); setMsg("");
    getAdminTicketDetail(selected.id)
      .then((d) => { setDetail(d); setResNote(d.ticket?.resolution_note || ""); })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [selected]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) { load(); return; }
    setSearching(true);
    try {
      const data = await searchAdminTickets(search);
      setTickets(data.tickets || []);
    } catch {}
    finally { setSearching(false); }
  };

  const clearSearch = () => { setSearch(""); load(); };

  const handleStatus = async (id, status) => {
    setSaving(true);
    try {
      await updateTicket(id, { status, ...(status === "resolved" && resNote ? { resolution_note: resNote } : {}) });
      setMsg(`Status → ${status}`);
      await load();
      if (selected?.id === id) {
        setSelected((t) => ({ ...t, status }));
        getAdminTicketDetail(id).then((d) => { setDetail(d); setResNote(d.ticket?.resolution_note || ""); }).catch(() => {});
      }
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await updateTicket(selected.id, { resolution_note: resNote });
      setMsg("Resolution note saved");
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true); setMsg("");
    try {
      await replyTicket(selected.id, reply);
      setReply("");
      setMsg("Reply sent");
      await load();
      getAdminTicketDetail(selected.id).then(setDetail).catch(() => {});
    } catch (e) { setMsg(e.message); }
    finally { setSending(false); }
  };

  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
  const FILTERS = [
    { key: "all",         label: "All",         count: totalAll },
    { key: "open",        label: "Open",        count: counts.open },
    { key: "in_progress", label: "In Progress", count: counts.in_progress },
    { key: "resolved",    label: "Resolved",    count: counts.resolved },
    { key: "closed",      label: "Closed",      count: counts.closed },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ── */}
      <div className="px-6 py-4 border-b border-[#1e1e1e] shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">Support Queue</h1>
            <p className="text-[#555] text-xs mt-0.5">QA audit system — every ticket, every resolution, fully searchable</p>
          </div>
          {/* Stats */}
          <div className="flex gap-4 text-center">
            {[
              { label: "Total", value: totalAll },
              { label: "Open", value: counts.open || 0, highlight: (counts.open || 0) > 0 },
              { label: "Resolved Today", value: resolvedToday, highlight: resolvedToday > 0, color: "text-[#00c853]" },
            ].map((s) => (
              <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-2 min-w-[72px]">
                <div className={`text-lg font-extrabold ${s.color || (s.highlight ? "text-yellow-400" : "text-white")}`}>{s.value}</div>
                <div className="text-[10px] text-[#444] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-3 items-center">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, phone, or case ID…"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#00c853]/50 transition" />
            <button type="submit" disabled={searching}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#222] transition disabled:opacity-50">
              {searching ? "…" : "Search"}
            </button>
            {search && <button type="button" onClick={clearSearch} className="text-xs text-[#555] hover:text-white px-1">✕</button>}
          </form>

          <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-1">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => { setFilter(f.key); setSelected(null); setSearch(""); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${filter === f.key ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]"}`}>
                {f.label}
                {f.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-[#00c853] text-black" : "bg-[#222] text-[#555]"}`}>{f.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main split panel ── */}
      <div className="flex flex-1 min-h-0">

        {/* Ticket list */}
        <div className={`border-r border-[#1e1e1e] overflow-y-auto ${selected ? "w-[38%] shrink-0" : "flex-1"}`}>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 text-[#444] text-sm">No tickets found</div>
          ) : (
            <div>
              {tickets.map((t) => {
                const active = selected?.id === t.id;
                const resTime = resolutionTime(t.created_at, t.resolved_at);
                return (
                  <div key={t.id} onClick={() => setSelected(active ? null : t)}
                    className={`px-5 py-4 border-b border-[#161616] cursor-pointer transition ${active ? "bg-[#151515] border-l-2 border-l-[#00c853]" : "hover:bg-[#111]"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${PRIORITY_DOT[t.priority] || "bg-[#444]"}`} />
                        <span className="text-xs font-mono text-[#555] shrink-0">{t.ticket_number}</span>
                        {t.client_ticket_count > 1 && (
                          <span className="text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                            {t.client_ticket_count} tickets
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 capitalize ${STATUS_STYLE[t.status] || STATUS_STYLE.open}`}>
                        {t.status?.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-sm text-white font-medium truncate mb-1">{t.subject}</p>

                    <div className="flex items-center justify-between text-xs text-[#444]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{t.tenants?.name || t.from_email}</span>
                        {t.client_phone && <span className="text-[#333] shrink-0">· {t.client_phone}</span>}
                      </div>
                      <span className="shrink-0 ml-2">{age(t.created_at)}</span>
                    </div>

                    {t.resolved_at && (
                      <div className="text-[10px] text-[#00c853] mt-1">
                        ✓ Resolved in {resTime} · {ts(t.resolved_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto min-w-0">
            {loadingDetail ? (
              <div className="flex justify-center py-16"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>
            ) : detail ? (
              <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[#555]">{detail.ticket.ticket_number}</span>
                      <span className={`text-xs font-bold uppercase ${PRIORITY_COLOR[detail.ticket.priority]}`}>{detail.ticket.priority}</span>
                    </div>
                    <h2 className="text-base font-bold text-white">{detail.ticket.subject}</h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select value={detail.ticket.status}
                      onChange={(e) => handleStatus(detail.ticket.id, e.target.value)}
                      className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button onClick={() => setSelected(null)} className="text-[#444] hover:text-white text-lg leading-none">×</button>
                  </div>
                </div>

                {msg && <div className="text-xs text-[#00c853] bg-[#00c853]/10 border border-[#00c853]/20 px-3 py-2 rounded-lg">{msg}</div>}

                {/* Client info */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-3">Client</div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    {[
                      ["Name",   detail.client.name || "—"],
                      ["Email",  detail.client.email],
                      ["Phone",  detail.client.phone || "—"],
                      ["City",   detail.client.city || "—"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-[#444] text-xs w-12 shrink-0 pt-0.5">{label}</span>
                        <span className="text-white text-xs font-mono">{val}</span>
                      </div>
                    ))}
                  </div>
                  {detail.client.total_tickets > 1 && (
                    <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                      <p className="text-xs text-orange-400 mb-2">{detail.client.total_tickets} tickets from this client</p>
                      <div className="space-y-1">
                        {detail.client.ticket_history.map((h) => (
                          <div key={h.ticket_number} className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[#555]">{h.ticket_number}</span>
                            <span className="text-[#666] truncate mx-2 flex-1">{h.subject}</span>
                            <span className={`px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[h.status] || STATUS_STYLE.open}`}>{h.status?.replace("_"," ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* QA Timeline */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-3">Timeline</div>
                  <div className="space-y-2">
                    {[
                      { label: "Created",     time: detail.ticket.created_at,    done: true },
                      { label: "In Progress", time: detail.ticket.updated_at !== detail.ticket.created_at ? detail.ticket.updated_at : null, done: ["in_progress","resolved","closed"].includes(detail.ticket.status) },
                      { label: "Resolved",    time: detail.ticket.resolved_at,   done: !!detail.ticket.resolved_at },
                    ].map(({ label, time, done }) => (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${done ? "bg-[#00c853]" : "bg-[#2a2a2a]"}`} />
                        <span className={done ? "text-white" : "text-[#444]"}>{label}</span>
                        <span className="text-[#555] text-xs ml-auto">{time ? ts(time) : "—"}</span>
                      </div>
                    ))}
                    {detail.ticket.resolved_at && (
                      <div className="pt-1 pl-5 text-xs text-[#00c853]">
                        Resolution time: {resolutionTime(detail.ticket.created_at, detail.ticket.resolved_at)}
                        {detail.ticket.resolved_by && ` · by ${detail.ticket.resolved_by}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Original message */}
                <div>
                  <div className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Original Message</div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed">
                    {detail.ticket.body}
                  </div>
                </div>

                {/* Message thread */}
                {detail.messages.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">
                      Thread ({detail.messages.length})
                    </div>
                    <div className="space-y-2">
                      {detail.messages.map((m) => (
                        <div key={m.id} className={`rounded-xl px-4 py-3 text-sm border ${m.is_staff_reply ? "bg-[#00c853]/5 border-[#00c853]/15 ml-4" : "bg-[#0a0a0a] border-[#1a1a1a]"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold ${m.is_staff_reply ? "text-[#00c853]" : "text-[#888]"}`}>
                              {m.is_staff_reply ? "Support Team" : (m.sender || "Client")}
                            </span>
                            <span className="text-[10px] text-[#444]">{ts(m.created_at)}</span>
                          </div>
                          <p className="text-[#ccc] whitespace-pre-wrap">{m.message || m.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Draft */}
                {detail.ticket.ai_draft && (
                  <div className="bg-[#00c853]/5 border border-[#00c853]/20 rounded-xl p-4">
                    <div className="text-xs font-semibold text-[#00c853] mb-2">◎ AI Draft Response</div>
                    <p className="text-sm text-[#aaa] whitespace-pre-wrap">{detail.ticket.ai_draft}</p>
                  </div>
                )}

                {/* Resolution note */}
                <div>
                  <div className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Resolution Note</div>
                  <textarea value={resNote} onChange={(e) => setResNote(e.target.value)} rows={3}
                    placeholder="Document how this was resolved — for QA audit…"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none" />
                  <button onClick={handleSaveNote} disabled={saving || !resNote.trim()}
                    className="mt-2 text-xs text-[#555] border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:text-white hover:border-[#444] transition disabled:opacity-40">
                    Save note
                  </button>
                </div>

                {/* Reply */}
                <form onSubmit={handleReply} className="space-y-2">
                  <div className="text-xs font-semibold text-[#555] uppercase tracking-wider">Send Reply</div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4}
                    placeholder="Write a reply to the client…"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none" />
                  <div className="flex items-center gap-2">
                    {detail.ticket.ai_draft && (
                      <button type="button" onClick={() => setReply(detail.ticket.ai_draft)}
                        className="text-xs text-[#00c853] hover:underline">Use AI draft</button>
                    )}
                    <div className="flex-1" />
                    <button type="button" onClick={() => handleStatus(detail.ticket.id, "resolved")}
                      disabled={saving || detail.ticket.status === "resolved"}
                      className="text-xs border border-[#00c853]/30 text-[#00c853] px-3 py-2 rounded-xl hover:bg-[#00c853]/10 transition disabled:opacity-40">
                      Mark Resolved
                    </button>
                    <button type="submit" disabled={sending || !reply.trim()}
                      className="bg-[#00c853] text-black font-bold px-5 py-2 rounded-xl text-sm hover:bg-[#00b248] transition disabled:opacity-40">
                      {sending ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </form>

              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
