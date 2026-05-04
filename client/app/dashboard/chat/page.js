"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getChatHistory, sendMessage, getSheets, clearChatHistory } from "../../../lib/api";

const SUGGESTIONS = [
  "Summarize my data from last month",
  "What are my top 5 products by revenue?",
  "Show me trends over the last 6 months",
  "Which items have the lowest stock?",
  "Create a summary report for this week",
];

/* ── Helpers ─────────────────────────────────────────────────── */
const getDateLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
};

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const isGrouped = (msgs, idx) => {
  if (idx === 0) return false;
  const cur = msgs[idx];
  const prev = msgs[idx - 1];
  if (cur.role !== prev.role) return false;
  const diff = new Date(cur.created_at) - new Date(prev.created_at);
  return diff < 5 * 60 * 1000;
};

/* ── Sheet pill ───────────────────────────────────────────────── */
function SheetPill({ sheet, selected, onToggle }) {
  const shortId = (sheet.spreadsheet_id || "").slice(0, 6);
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

/* ── Markdown renderer ────────────────────────────────────────── */
function MdContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-[#aaa]">{children}</em>,
        code: ({ inline, children }) =>
          inline ? (
            <code className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#00c853] px-1.5 py-0.5 rounded text-[11px] font-mono">
              {children}
            </code>
          ) : (
            <pre className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 overflow-x-auto my-3">
              <code className="text-[#ccc] text-[12px] font-mono">{children}</code>
            </pre>
          ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-[#2a2a2a]">{children}</thead>,
        th: ({ children }) => (
          <th className="text-left text-[#888] font-semibold px-3 py-2 whitespace-nowrap">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-[#1a1a1a] text-[#ccc] whitespace-nowrap">{children}</td>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-[#ccc]">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[#ccc]">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h1 className="text-base font-bold text-white mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-3 mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-[#ccc] mt-2 mb-1">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#00c853]/40 pl-3 text-[#666] my-2">{children}</blockquote>
        ),
        hr: () => <hr className="border-[#2a2a2a] my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ── Date separator ───────────────────────────────────────────── */
function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-[#1a1a1a]" />
      <span className="text-[10px] text-[#333] font-medium tracking-wider uppercase">{label}</span>
      <div className="flex-1 h-px bg-[#1a1a1a]" />
    </div>
  );
}

/* ── Single message bubble ────────────────────────────────────── */
function MessageBubble({ msg, grouped, onCopy, onExport }) {
  const [hover, setHover] = useState(false);
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-4"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar — only on first of group */}
      {!isUser && (
        <div className={`w-7 h-7 rounded-lg shrink-0 mt-0.5 flex items-center justify-center text-xs ${
          grouped ? "invisible" : "bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853]"
        }`}>
          ◎
        </div>
      )}

      <div className={`relative max-w-[70%] ${isUser ? "order-first" : ""}`}>
        {/* Tool badges */}
        {msg.tools?.length > 0 && !grouped && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {msg.tools.map((t, i) => (
              <span key={i} className="text-[10px] bg-[#111] border border-[#1e1e1e] text-[#444] px-2 py-0.5 rounded-full font-mono">
                ⚙ {t.tool || t.toolName || "tool"}
              </span>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-tr-sm"
            : msg.isError
            ? "bg-red-400/10 border border-red-400/20 text-red-400 rounded-tl-sm"
            : "bg-[#111] border border-[#1e1e1e] text-[#ddd] rounded-tl-sm"
        }`}>
          {isUser || msg.isError ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <MdContent content={msg.content} />
          )}
        </div>

        {/* Footer: timestamp + actions */}
        <div className={`flex items-center gap-3 mt-1 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-[#2a2a2a]">{fmtTime(msg.created_at)}</span>

          {/* Hover actions */}
          <div className={`flex items-center gap-2 transition-opacity duration-150 ${hover ? "opacity-100" : "opacity-0"}`}>
            <button
              onClick={() => onCopy(msg.content)}
              className="text-[10px] text-[#333] hover:text-[#888] transition"
              title="Copy"
            >
              ⎘ Copy
            </button>
            {!isUser && !msg.isError && (
              <button
                onClick={() => onExport(msg.content)}
                className="text-[10px] text-[#333] hover:text-[#888] transition"
                title="Export"
              >
                ↓ Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User avatar placeholder */}
      {isUser && (
        <div className={`w-7 h-7 rounded-lg shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-[#555] ${
          grouped ? "invisible" : "bg-[#1a1a1a] border border-[#2a2a2a]"
        }`}>
          U
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function ChatPage() {
  const router = useRouter();
  const [history, setHistory]           = useState([]);
  const [input, setInput]               = useState("");
  const [sheets, setSheets]             = useState([]);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [sheetsLoaded, setSheetsLoaded] = useState(false);
  const [tokens, setTokens]             = useState(null);
  const [confirm, setConfirm]           = useState(null);
  const [copied, setCopied]             = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [clearing, setClearing]         = useState(false);
  const bottomRef  = useRef(null);
  const scrollRef  = useRef(null);

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

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    setShowScrollBtn(!nearBottom);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const toggleSheet = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const copyText = async (content) => {
    await navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportText = (content) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearChat = async () => {
    if (!confirm && !window.confirm("Clear all chat history?")) return;
    setClearing(true);
    try {
      await clearChatHistory();
      setHistory([]);
    } catch {}
    finally { setClearing(false); }
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

  // Build message list with date separators
  const renderedItems = [];
  let lastDateLabel = null;
  history.forEach((msg, i) => {
    const label = getDateLabel(msg.created_at);
    if (label !== lastDateLabel) {
      renderedItems.push({ type: "separator", label, key: `sep-${i}` });
      lastDateLabel = label;
    }
    renderedItems.push({ type: "message", msg, index: i, key: `msg-${i}` });
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-8 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">AI Chat</h1>
          <p className="text-[#555] text-xs mt-0.5">Ask anything about your data</p>
        </div>
        <div className="flex items-center gap-3">
          {tokens !== null && (
            <span className="text-xs text-[#444] border border-[#1e1e1e] px-2.5 py-1 rounded-full">
              {tokens} tokens left
            </span>
          )}
          {history.length > 0 && (
            <button
              onClick={clearChat}
              disabled={clearing}
              className="text-xs text-[#333] hover:text-[#888] border border-[#1e1e1e] px-2.5 py-1 rounded-full transition disabled:opacity-50"
              title="Clear chat history"
            >
              {clearing ? "Clearing…" : "✕ Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Sheet selector */}
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
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-8 py-4 relative"
      >
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
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="text-xs bg-[#111] border border-[#2a2a2a] px-3 py-1.5 rounded-full text-[#555] hover:text-white hover:border-[#444] transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Message list with date separators */}
        {renderedItems.map((item) => {
          if (item.type === "separator") {
            return <DateSeparator key={item.key} label={item.label} />;
          }
          const { msg, index } = item;
          const grouped = isGrouped(history, index);
          return (
            <MessageBubble
              key={item.key}
              msg={msg}
              grouped={grouped}
              onCopy={copyText}
              onExport={exportText}
            />
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 justify-start mt-4">
            <div className="w-7 h-7 rounded-lg bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] text-xs shrink-0 mt-0.5">◎</div>
            <div className="bg-[#111] border border-[#1e1e1e] px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-bounce"
                    style={{ animationDelay: `${d * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confirm dialog */}
        {confirm && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 mt-4">
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

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-28 right-10 bg-[#111] border border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444] text-xs px-3 py-1.5 rounded-full shadow-lg transition z-10"
          >
            ↓ Latest
          </button>
        )}
      </div>

      {/* Copied toast */}
      {copied && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] text-xs px-4 py-2 rounded-full shadow-lg z-20">
          Copied to clipboard
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 px-8 pb-6 pt-3 border-t border-[#161616]">
        {selectedSheets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {selectedSheets.map((s) => (
              <span
                key={s.spreadsheet_id}
                className="inline-flex items-center gap-1 text-[10px] bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] px-2 py-0.5 rounded-full"
              >
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
        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="flex gap-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            disabled={loading}
            rows={1}
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-2xl px-5 py-3.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition disabled:opacity-50 resize-none overflow-hidden"
            placeholder={
              noSheets
                ? "Connect a sheet first to ask questions…"
                : selectedIds.length === 0
                ? "Select a data source above…"
                : "Ask about your data… (Shift+Enter for new line)"
            }
            style={{ minHeight: "52px", maxHeight: "140px" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || selectedIds.length === 0}
            className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 rounded-2xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-end h-[52px]"
          >
            →
          </button>
        </form>
        <p className="text-[10px] text-[#222] mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
