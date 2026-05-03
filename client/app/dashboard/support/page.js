"use client";
import { useEffect, useState } from "react";
import { getTickets, createTicket } from "../../../lib/api";

const STATUS_STYLES = {
  open:        "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  in_progress: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  resolved:    "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]",
  closed:      "text-[#333] bg-[#111] border-[#1a1a1a]",
};
const PRIORITY_STYLES = {
  urgent: "text-red-400", high: "text-orange-400", normal: "text-[#555]", low: "text-[#444]",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const load = () => getTickets().then(({ tickets: t }) => setTickets(t || [])).catch(() => {});

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.body) return setErr("Subject and message are required");
    setErr(""); setSubmitting(true);
    try {
      await createTicket(form.subject, form.body);
      setForm({ subject: "", body: "" });
      setShowForm(false);
      setSuccess("Ticket submitted! Our team will respond shortly.");
      await load();
    } catch (err) { setErr(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Support</h1>
          <p className="text-[#555] text-sm mt-1">Get help from our team · avg response &lt; 2 hours</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setSuccess(""); }}
          className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-4 py-2 rounded-xl text-sm transition">
          + New Ticket
        </button>
      </div>

      {success && <div className="bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] text-sm px-4 py-3 rounded-xl mb-4">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">New support request</h2>
          {err && <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2 rounded-lg">{err}</div>}
          <div>
            <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Subject</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="What do you need help with?" />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Message</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none"
              placeholder="Describe your issue in detail…" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-[#555] px-4 py-2.5 rounded-xl border border-[#2a2a2a] hover:text-white transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="text-4xl mb-4 text-[#1a1a1a]">◇</div>
          <p className="text-[#444] text-sm">No tickets yet</p>
          <p className="text-[#333] text-xs mt-1">You can also email us at <span className="text-[#555]">support@reportude.com</span></p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[#444] font-mono">{t.ticket_number}</span>
                  <span className={`text-xs font-semibold uppercase ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                </div>
                <p className="text-sm text-white font-medium truncate">{t.subject}</p>
                <p className="text-xs text-[#444] mt-0.5">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border shrink-0 capitalize ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>
                {t.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 text-sm text-[#555]">
        <p className="font-medium text-white mb-1">Other ways to reach us</p>
        <p>Email: <span className="text-[#00c853]">support@reportude.com</span> · Response within 2 business hours</p>
      </div>
    </div>
  );
}
