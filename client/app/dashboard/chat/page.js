"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getChatHistory, sendMessage, getSheets } from "../../../lib/api";

const SUGGESTIONS = [
  "Summarize my data from last month",
  "What are my top 5 products by revenue?",
  "Show me trends over the last 6 months",
  "Which items have the lowest stock?",
  "Create a summary report for this week",
];

function SheetPill({ sheet, selected, onToggle }) {
  const shortId = (sheet.spreadsheet_id || sheet.id || "").slice(0, 6);
  return (
    <button
      onClick={() => onToggle(sheet.spreadsheet_id)}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition shrink-0 ${
        selected
          ? "bg-[#00c853]/10 border-[#00c853]/40 text-[#00c853]"
          : "bg-[#111] border-[#2a2a2a] text-[#555] hover:border-[#444] hover:text-[#888]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? "bg-[#00c853]" : "bg-[#333]"}`} />
      <span className="font-medium truncate max-w-[120px]">{sheet.spreadsheet_name || sheet.spreadsheet_id}</span>
      <span className="font-mono opacity-50 text-[10px] shrink-0">#{shortId}</span>
    </button>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [history, setHistory]         = useState([]);
  const [input, setInput]             = useState("");
  const [sheets, setSheets]           = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [sheetsLoaded, setSheetsLoaded] = useState(false);
  const [tokens, setTokens]           = useState(null);
  const [confirm, setConfirm]         = useState(null);
  const bottomRef = useRef(null);

  const loadSheets = useCallback(async () => {
    try {
      const data = await getSheets();
      const list = data.sheets || [];
      setSheets(list);
      if (list.length > 0 && selectedIds.length === 0) {
        const primary = list.find((s) => s.is_primary) || list[0];
        setSelectedIds([primary.spreadsheet_id]);
      }
    } catch {}
    finally { setSheetsLoaded(true); }
  }, []);

  useEffect(() => {
    getChatHistory()
      .then(({ history: h }) => setHistory(h || []))
      .catch(() => {});
    loadSheets();
  }, [loadSheets]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const toggleSheet = (spreadsheetId) => {
    setSelectedIds((prev) =>
      prev.includes(spreadsheetId)
        ? prev.filter((id) => id !== spreadsheetId)
        : [...prev, spreadsheetId]
    );
  };

  const exportText = (content) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (msg, confirmedFlag = false) => {
    if (!msg.trim() || loading) return;
    setHistory((h) => [...h, { role: "user", content: msg, created_at: new Date().toISOString() }]);
    setInput("");
    setLoading(true);
    setConfirm(null);
    try {
      const primarySheetId = selectedIds[0] || undefined;
      const data = await sendMessage(msg, primarySheetId, confirmedFlag, selectedIds);
      if (data.requiresConfirmation) {
        setConfirm({ originalMessage: data.originalMessage, prompt: data.message });
        setLoading(false);
        return;
      }
      setTokens(data.tokensRemaining);
      setHistory((h) => [...h, {
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
        tools: data.toolResults,
      }]);
    } catch (err) {
      setHistory((h) => [...h, {
        role: "assistant",
        content: `Error: ${err.message}`,
        created_at: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const selectedSheets = sheets.filter((s) => selectedIds.includes(s.spreadsheet_id));
  const noSheets = sheetsLoaded && sheets.length === 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-8 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">AI Chat</h1>
          <p className="text-[#555] text-xs mt-0.5">Ask anything about your data</p>
        </div>
        {tokens !== null && (
          <span className="text-xs text-[#444] border border-[#1e1e1e] px-2.5 py-1 rounded-full">{tokens} tokens left</span>
        )}
      </div>

      {/* Sheet selector bar */}
      <div className="shrink-0 px-8 py-2.5 border-b border-[#1e1e1e] bg-[#080808]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-[#333] uppercase tracking-widest shrink-0 font-semibold">Data Sources</span>

          {!sheetsLoaded ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
          ) : noSheets ? (
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="text-xs text-[#444] border border-dashed border-[#2a2a2a] px-3 py-1 rounded-full hover:border-[#00c853]/40 hover:text-[#00c853] transition"
            >
              + Connect a Google Sheet
            </button>
          ) : (
            <>
              {sheets.map((s) => (
                <SheetPill
                  key={s.spreadsheet_id}
                  sheet={s}
                  selected={selectedIds.includes(s.spreadsheet_id)}
                  onToggle={toggleSheet}
                />
              ))}
              <button
                onClick={() => router.push("/dashboard/settings")}
                className="text-[10px] text-[#2a2a2a] hover:text-[#555] transition"
                title="Add sheet"
              >
                + Add
              </button>
            </>
          )}
        </div>
        {selectedIds.length > 1 && (
          <p className="text-[10px] text-[#444] mt-1.5">
            {selectedIds.length} sheets selected — AI will combine data from all selected sources
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {history.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-3xl mb-4 text-[#1a1a1a]">◎</div>
            {noSheets ? (
              <>
                <p className="text-[#444] text-sm mb-3">Connect a Google Sheet to start asking questions</p>
                <button
                  onClick={() => router.push("/dashboard/settings")}
                  className="text-xs bg-[#00c853] text-black font-bold px-4 py-2 rounded-xl hover:bg-[#00b248] transition"
                >
                  Connect a sheet →
                </button>
              </>
            ) : selectedIds.length === 0 ? (
              <p className="text-[#444] text-sm">Select a data source above to get started</p>
            ) : (
              <>
                <p className="text-[#555] text-xs mb-6">
                  {selectedIds.length === 1
                    ? `Querying: ${selectedSheets[0]?.spreadsheet_name || selectedIds[0]}`
                    : `Querying ${selectedIds.length} sheets`}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => submit(s)}
                      className="text-xs bg-[#111] border border-[#2a2a2a] px-3 py-1.5 rounded-full text-[#555] hover:text-white hover:border-[#444] transition">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] text-xs shrink-0 mt-0.5">
                ◎
              </div>
            )}
            <div className={`max-w-[70%] ${msg.role === "user" ? "order-first" : ""}`}>
              {msg.tools?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.tools.map((t, ti) => (
                    <span key={ti} className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] px-2 py-0.5 rounded-full font-mono">
                      {t.toolName || t.type || "tool"}
                    </span>
                  ))}
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-tr-sm"
                  : msg.isError
                  ? "bg-red-400/10 border border-red-400/20 text-red-400 rounded-tl-sm"
                  : "bg-[#111] border border-[#1e1e1e] text-[#ddd] rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              <div className={`flex items-center gap-3 mt-1 px-1 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <span className="text-[10px] text-[#2a2a2a]">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.role === "assistant" && !msg.isError && (
                  <button
                    onClick={() => exportText(msg.content)}
                    className="text-[10px] text-[#333] hover:text-[#555] transition"
                  >
                    ↓ Export
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] text-xs shrink-0 mt-0.5">◎</div>
            <div className="bg-[#111] border border-[#1e1e1e] px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((d) => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {confirm && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
            <p className="text-yellow-400 text-sm font-semibold mb-1">Confirm action</p>
            <p className="text-[#888] text-sm mb-3">{confirm.prompt}</p>
            <div className="flex gap-2">
              <button
                onClick={() => submit(confirm.originalMessage, true)}
                className="text-xs bg-yellow-400 text-black font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition"
              >
                Yes, proceed
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="text-xs border border-[#2a2a2a] text-[#555] px-3 py-1.5 rounded-lg hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-8 pb-6 pt-3 border-t border-[#161616]">
        {selectedSheets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {selectedSheets.map((s) => (
              <span key={s.spreadsheet_id} className="inline-flex items-center gap-1 text-[10px] bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] px-2 py-0.5 rounded-full">
                ◎ {s.spreadsheet_name || s.spreadsheet_id}
                <button
                  onClick={() => toggleSheet(s.spreadsheet_id)}
                  className="text-[#00c853]/50 hover:text-[#00c853] ml-0.5 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-2xl px-5 py-3.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition disabled:opacity-50"
            placeholder={
              noSheets
                ? "Connect a sheet first to ask questions…"
                : selectedIds.length === 0
                ? "Select a data source above…"
                : "Ask about your data…"
            }
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || selectedIds.length === 0}
            className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 py-3.5 rounded-2xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}
