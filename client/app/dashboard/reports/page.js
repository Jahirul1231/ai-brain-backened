"use client";
import { useEffect, useState, useCallback } from "react";
import { getReports, createReport, getSheets, getMe } from "../../../lib/api";

const STATUS_STYLES = {
  ready:      "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20",
  generating: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  pending:    "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]",
  failed:     "text-red-400 bg-red-400/10 border-red-400/20",
};

const FORMAT_OPTS = [
  { v: "table", l: "Inline Table", i: "◈" },
  { v: "sheet", l: "Google Sheet", i: "⬡" },
  { v: "pdf",   l: "PDF Summary",  i: "◇" },
];

function SheetToggle({ sheet, selected, onToggle }) {
  const shortId = (sheet.spreadsheet_id || "").slice(0, 6);
  return (
    <button
      type="button"
      onClick={() => onToggle(sheet.spreadsheet_id)}
      className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition ${
        selected
          ? "bg-[#00c853]/10 border-[#00c853]/40 text-[#00c853]"
          : "bg-[#0a0a0a] border-[#2a2a2a] text-[#555] hover:border-[#444] hover:text-[#888]"
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 border ${selected ? "bg-[#00c853] border-[#00c853]" : "border-[#333]"}`} />
      <span className="font-medium truncate max-w-[140px]">{sheet.spreadsheet_name || sheet.spreadsheet_id}</span>
      <span className="font-mono opacity-40 text-[10px] shrink-0">#{shortId}</span>
    </button>
  );
}

const EMPTY_FORM = { title: "", prompt: "", format: "table", sendEmail: false };

export default function ReportsPage() {
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [error, setError]           = useState("");
  const [form, setForm]             = useState(EMPTY_FORM);
  const [sheets, setSheets]         = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [userEmail, setUserEmail]   = useState("");

  const load = useCallback(() =>
    getReports().then(({ reports: r }) => setReports(r || [])).catch(() => {}), []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const id = setInterval(load, 10000);

    getSheets()
      .then(({ sheets: s }) => {
        setSheets(s || []);
        const primary = (s || []).find((sh) => sh.is_primary) || (s || [])[0];
        if (primary) setSelectedIds([primary.spreadsheet_id]);
      })
      .catch(() => {});

    getMe()
      .then((d) => setUserEmail(d.user?.email || ""))
      .catch(() => {});

    return () => clearInterval(id);
  }, [load]);

  const toggleSheet = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.prompt) return setError("Title and prompt are required");
    if (selectedIds.length === 0) return setError("Select at least one sheet");
    setError("");
    setCreating(true);
    try {
      await createReport({
        title: form.title,
        prompt: form.prompt,
        format: form.format,
        spreadsheetId: selectedIds[0],
        sheetIds: selectedIds,
        deliverTo: form.sendEmail && userEmail ? [userEmail] : [],
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const exportText = (content, title) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Reports</h1>
          <p className="text-[#555] text-sm mt-1">Generate AI reports from your spreadsheet data</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-4 py-2 rounded-xl text-sm transition"
        >
          + New Report
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 mb-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">Create new report</h2>

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Report Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="Monthly Sales Summary"
            />
          </div>

          {/* Prompt */}
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

          {/* Sheet selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[#555] uppercase tracking-wider">Data Sources</label>
              {selectedIds.length > 0 && (
                <span className="text-[10px] text-[#444]">
                  {selectedIds.length} sheet{selectedIds.length !== 1 ? "s" : ""} selected
                  {selectedIds.length > 1 && " — AI will combine all selected sheets"}
                </span>
              )}
            </div>
            {sheets.length === 0 ? (
              <p className="text-xs text-[#444] border border-dashed border-[#2a2a2a] rounded-xl px-4 py-3">
                No sheets connected. Go to Settings → connect a Google Sheet first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sheets.map((s) => (
                  <SheetToggle
                    key={s.spreadsheet_id}
                    sheet={s}
                    selected={selectedIds.includes(s.spreadsheet_id)}
                    onToggle={toggleSheet}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Output format */}
          <div>
            <label className="block text-xs text-[#555] mb-2 uppercase tracking-wider">Output Format</label>
            <div className="flex gap-2 flex-wrap">
              {FORMAT_OPTS.map((f) => (
                <button key={f.v} type="button"
                  onClick={() => setForm({ ...form, format: f.v })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition ${
                    form.format === f.v
                      ? "border-[#00c853]/50 text-[#00c853] bg-[#00c853]/10"
                      : "border-[#2a2a2a] text-[#555] hover:border-[#444]"
                  }`}>
                  <span>{f.i}</span> {f.l}
                </button>
              ))}
            </div>
          </div>

          {/* Email delivery */}
          <div className="border border-[#1a1a1a] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Send report via email</p>
              {form.sendEmail && userEmail ? (
                <p className="text-xs text-[#555] mt-0.5">Will be sent to <span className="text-[#888] font-mono">{userEmail}</span></p>
              ) : (
                <p className="text-xs text-[#444] mt-0.5">Deliver report to your registered email when ready</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, sendEmail: !form.sendEmail })}
              className={`relative w-11 h-6 rounded-full border transition-colors shrink-0 ${
                form.sendEmail ? "bg-[#00c853] border-[#00c853]" : "bg-[#1a1a1a] border-[#2a2a2a]"
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.sendEmail ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating || selectedIds.length === 0}
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
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                    {r.status === "generating" ? "⟳ generating…" : r.status}
                  </span>
                  <span className="text-xs text-[#444] capitalize border border-[#1e1e1e] px-2 py-0.5 rounded-full">{r.format}</span>
                  {r.delivered_to?.length > 0 && (
                    <span className="text-xs text-[#555] border border-[#1e1e1e] px-2 py-0.5 rounded-full">✉ emailed</span>
                  )}
                </div>
              </div>
              <p className="text-[#555] text-xs mb-3">{r.prompt}</p>
              {r.result && r.status === "ready" && (
                <>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 text-sm text-[#ccc] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {r.result}
                  </div>
                  <button
                    onClick={() => exportText(r.result, r.title)}
                    className="mt-2 text-xs text-[#444] hover:text-[#888] transition"
                  >
                    ↓ Export
                  </button>
                </>
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
