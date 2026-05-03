"use client";
import { useEffect, useRef, useState } from "react";
import { getChatHistory, sendMessage } from "../../../lib/api";

function Message({ role, text, tools, time }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${isUser ? "bg-[#00c853] text-black" : "bg-[#1e1e1e] text-[#00c853]"}`}>
        {isUser ? "Y" : "AI"}
      </div>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "bg-[#00c853] text-black rounded-tr-sm" : "bg-[#1a1a1a] text-[#e0e0e0] rounded-tl-sm"}`}>
          {text}
        </div>
        {tools?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {tools.map((t) => (
              <span key={t} className="text-[10px] bg-[#0f2a1a] text-[#00c853] border border-[#1a3a2a] px-2 py-0.5 rounded-full">
                ⚙ {t}
              </span>
            ))}
          </div>
        )}
        {time && <span className="text-[10px] text-[#444]">{new Date(time).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-[#1e1e1e] shrink-0 flex items-center justify-center text-xs font-bold text-[#00c853]">AI</div>
      <div className="bg-[#1a1a1a] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-[#00c853] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export default function BrainPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatHistory()
      .then((hist) => {
        const msgs = [];
        hist.forEach((h) => {
          msgs.push({ role: "user", text: h.message, time: h.created_at });
          msgs.push({ role: "ai", text: h.response, tools: h.tools_used, time: h.created_at });
        });
        setMessages(msgs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;

    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", text: msg, time: new Date().toISOString() }]);
    setLoading(true);

    try {
      const data = await sendMessage(msg, spreadsheetId || undefined);
      setMessages((prev) => [...prev, {
        role: "ai",
        text: data.response,
        tools: data.toolsUsed,
        time: new Date().toISOString(),
      }]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [...prev, {
        role: "ai",
        text: `⚠ ${err.message}`,
        time: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
            <h1 className="font-extrabold text-lg">Master Brain</h1>
          </div>
          <p className="text-[#555] text-xs mt-0.5">Talk to your AI — it reads, writes, and analyzes your data</p>
        </div>
        <button
          onClick={() => setShowSheet((v) => !v)}
          className="text-xs text-[#666] border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:border-[#444] transition"
        >
          {showSheet ? "Hide Sheet ID" : "Set Sheet ID"}
        </button>
      </div>

      {/* Sheet ID bar */}
      {showSheet && (
        <div className="px-6 py-3 border-b border-[#1e1e1e] bg-[#0d0d0d]">
          <input
            type="text"
            placeholder="Google Spreadsheet ID (optional)"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00c853] transition font-mono"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-[#0f2a1a] border border-[#1a3a2a] flex items-center justify-center text-2xl mb-4">◎</div>
            <h2 className="text-lg font-bold mb-2">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}</h2>
            <p className="text-[#555] text-sm max-w-xs">Ask me anything about your data, business, or sheets. I'll figure out the rest.</p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-sm">
              {["What's in my spreadsheet?", "Summarise last month's data", "Add a new row with today's date"].map((s) => (
                <button key={s} onClick={() => setInput(s)} className="text-left text-sm bg-[#111] border border-[#222] hover:border-[#333] px-4 py-2.5 rounded-xl text-[#888] hover:text-white transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Message key={i} {...m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#1e1e1e] shrink-0">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            placeholder="Ask your Brain anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00c853] transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#00c853] text-black font-bold px-5 py-3 rounded-xl hover:bg-[#00a846] transition disabled:opacity-40"
          >
            {loading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
