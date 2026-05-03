"use client";
import { useEffect, useRef, useState } from "react";
import { getChatHistory, sendMessage } from "../../../lib/api";

const SUGGESTIONS = [
  "Summarize my data from last month",
  "What are my top 5 products by revenue?",
  "Show me trends over the last 6 months",
  "Which items have the lowest stock?",
  "Create a summary report for this week",
];

export default function ChatPage() {
  const [history, setHistory]     = useState([]);
  const [input, setInput]         = useState("");
  const [sheetId, setSheetId]     = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [tokens, setTokens]       = useState(null);
  const [confirm, setConfirm]     = useState(null); // { message, originalMessage }
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatHistory()
      .then(({ history: h }) => setHistory(h || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const submit = async (msg, confirmedFlag = false) => {
    if (!msg.trim() || loading) return;
    const userMsg = { role: "user", content: msg, created_at: new Date().toISOString() };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);
    setConfirm(null);
    try {
      const data = await sendMessage(msg, sheetId || undefined, confirmedFlag);
      if (data.requiresConfirmation) {
        setConfirm({ originalMessage: data.originalMessage, prompt: data.message });
        setLoading(false);
        return;
      }
      setTokens(data.tokensRemaining);
      setHistory((h) => [...h, { role: "assistant", content: data.response, created_at: new Date().toISOString(), tools: data.toolResults }]);
    } catch (err) {
      setHistory((h) => [...h, { role: "assistant", content: `Error: ${err.message}`, created_at: new Date().toISOString(), isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-8 py-5 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">AI Chat</h1>
          <p className="text-[#555] text-xs mt-0.5">Ask anything about your data</p>
        </div>
        <div className="flex items-center gap-3">
          {tokens !== null && (
            <span className="text-xs text-[#444]">{tokens} tokens left</span>
          )}
          <button
            onClick={() => setShowSheet((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${showSheet ? "border-[#00c853]/50 text-[#00c853] bg-[#00c853]/10" : "border-[#2a2a2a] text-[#555] hover:border-[#444]"}`}>
            {showSheet ? "◎ Sheet set" : "⬡ Set Sheet ID"}
          </button>
        </div>
      </div>

      {showSheet && (
        <div className="shrink-0 px-8 py-3 bg-[#0d0d0d] border-b border-[#1e1e1e] flex gap-3 items-center">
          <input
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
            placeholder="Paste Google Sheet URL or ID…"
          />
          <button onClick={() => setShowSheet(false)} className="text-xs text-[#555] hover:text-white transition">Done</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {history.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-4 text-[#1a1a1a]">◎</div>
            <p className="text-[#444] text-sm mb-6">Ask anything about your spreadsheet data</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)}
                  className="text-xs bg-[#111] border border-[#2a2a2a] px-3 py-1.5 rounded-full text-[#555] hover:text-white hover:border-[#444] transition">
                  {s}
                </button>
              ))}
            </div>
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
              <div className="text-[10px] text-[#333] mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

      {/* Input */}
      <div className="shrink-0 px-8 pb-6 pt-3">
        <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-2xl px-5 py-3.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition disabled:opacity-50"
            placeholder="Ask about your data…"
          />
          <button
            type="submit" disabled={loading || !input.trim()}
            className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 py-3.5 rounded-2xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}
