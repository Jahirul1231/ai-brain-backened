"use client";
import { useEffect, useState } from "react";
import { getReports, createReport } from "../../../lib/api";

const STATUS_STYLES = {
  ready:      "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  generating: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  pending:    "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]",
  failed:     "text-red-400 bg-red-400/10 border-red-400/20",
};

const FORMAT_OPTS = [
  { v: "table",  l: "Inline Table",    i: "◈" },
  { v: "sheet",  l: "Google Sheet",    i: "⬡" },
  { v: "pdf",    l: "PDF Summary",     i: "◇" },
];

export default function ReportsPage() {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm] = useState({ title: "", prompt: "", format: "table", spreadsheetId: "" });

  const load = () => getReports().then(({ reports: r }) => setReports(r || [])).catch(() => {});

  useEffect(() => {
    load().finally(() => setLoading(false));
    const id = setInterval(load, 10000); // Poll for generating reports
    return () => clearInterval(id);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.prompt) return setError("Title and prompt are required");
    setError("");
    setCreating(true);
    try {
      await createReport({
        title: form.title,
        prompt: form.prompt,
        format: form.format,
        spreadsheetId: form.spreadsheetId || undefined,
      });
      setForm({ title: "", prompt: "", format: "table", spreadsheetId: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Reports</h1>
          <p className="text-[#555] text-sm mt-1">Generate AI reports from your spreadsheet data</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-4 py-2 rounded-xl text-sm transition"
        >
          + New Report
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Create new report</h2>
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Report Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="Monthly Sales Summary"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">What should the report cover?</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none"
              placeholder="Summarize total sales by product for last month, highlight top 5 performers and flag anything below target…"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-2 uppercase tracking-wider">Output Format</label>
            <div className="flex gap-2">
              {FORMAT_OPTS.map((f) => (
                <button key={f.v} type="button"
                  onClick={() => setForm({ ...form, format: f.v })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition ${form.format === f.v ? "border-[#00c853]/50 text-[#00c853] bg-[#00c853]/10" : "border-[#2a2a2a] text-[#555] hover:border-[#444]"}`}>
                  <span>{f.i}</span> {f.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Sheet ID <span className="normal-case text-[#333]">(optional)</span></label>
            <input
              value={form.spreadsheetId}
              onChange={(e) => setForm({ ...form, spreadsheetId: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="Paste Google Sheets URL or ID…"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-50">
              {creating ? "Generating…" : "Generate report"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-[#555] px-4 py-2.5 rounded-xl border border-[#2a2a2a] hover:text-white transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="text-4xl mb-4 text-[#1a1a1a]">⬡</div>
          <p className="text-[#444] text-sm">No reports yet — create your first report above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-semibold text-white">{r.title}</h3>
                  <p className="text-[#444] text-xs mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                    {r.status === "generating" ? "⟳ generating…" : r.status}
                  </span>
                  <span className="text-xs text-[#444] capitalize border border-[#1e1e1e] px-2 py-0.5 rounded-full">{r.format}</span>
                </div>
              </div>
              <p className="text-[#555] text-xs mb-3">{r.prompt}</p>
              {r.result && r.status === "ready" && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 text-sm text-[#ccc] whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {r.result}
                </div>
              )}
              {r.sheet_url && (
                <a href={r.sheet_url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#00c853] hover:underline">
                  ⬡ Open in Google Sheets →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
