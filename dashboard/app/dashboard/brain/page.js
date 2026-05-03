"use client";
import { useEffect, useRef, useState } from "react";
import { getCOOHistory, sendCOOMessage } from "../../../lib/api";

const AGENTS = [
  { slug: "onboarding", label: "onboarding", icon: "◉", color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
  { slug: "support",    label: "support",    icon: "◇", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  { slug: "ops",        label: "ops",        icon: "⚡", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  { slug: "sales",      label: "sales",      icon: "◈", color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20" },
  { slug: "data",       label: "data",       icon: "⬡", color: "text-cyan-400",   bg: "bg-cyan-400/10 border-cyan-400/20" },
  { slug: "finance",    label: "finance",    icon: "◇", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
];

const AGENT_MAP = Object.fromEntries(AGENTS.map((a) => [a.label, a]));

const QUICK_PROMPTS = [
  { label: "Company status", text: "Give me a full company status update across all departments." },
  { label: "Urgent items", text: "What needs my immediate attention right now?" },
  { label: "@support open tickets", text: "@support What tickets are open and what's the oldest one?" },
  { label: "@ops health check", text: "@ops Run a health check — any accounts with low tokens or expiring trials?" },
  { label: "@sales pipeline", text: "@sales What's our trial-to-paid conversion looking like?" },
  { label: "@onboarding stuck", text: "@onboarding Which clients are stuck and where?" },
];

function AgentTag({ name }) {
  const a = AGENT_MAP[name?.toLowerCase()];
  if (!a) return <span className="text-xs text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">{name}</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${a.color} ${a.bg}`}>
      {a.icon} @{a.label}
    </span>
  );
}

function formatResponse(text) {
  // Bold **text**, convert @mentions to styled spans
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/@(onboarding|support|ops|sales|data|finance)/gi, (m, slug) => {
      const a = AGENT_MAP[slug.toLowerCase()];
      return a ? `<span class="font-semibold ${a.color}">@${slug}</span>` : m;
    });
}

function COOMessage({ message, response, agentsConsulted, time }) {
  return (
    <div className="space-y-3">
      {/* Founder message */}
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="text-right text-xs text-[#444] mb-1">You · {new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="bg-[#00c853]/15 border border-[#00c853]/25 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white whitespace-pre-wrap">
            {message}
          </div>
        </div>
      </div>

      {/* COO response */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] shrink-0 flex items-center justify-center text-xs font-bold text-[#00c853]">
          COO
        </div>
        <div className="flex-1 min-w-0">
          {agentsConsulted?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-xs text-[#444]">consulted</span>
              {agentsConsulted.map((a) => <AgentTag key={a} name={a.replace(" Agent", "").toLowerCase()} />)}
            </div>
          )}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-[#ccc] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatResponse(response) }} />
          <div className="text-xs text-[#333] mt-1 ml-1">
            {new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] shrink-0 flex items-center justify-center text-xs font-bold text-[#00c853]">COO</div>
      <div className="bg-[#111] border border-[#1e1e1e] px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
        <span className="text-xs text-[#444] mr-1">Consulting agents</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-[#00c853] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export default function COOPage() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [mentionSearch, setMentionSearch] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getCOOHistory().then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMentionSearch(null);
    setLoading(true);

    const optimistic = { message: msg, response: "", agentsConsulted: [], created_at: new Date().toISOString(), _pending: true };
    setHistory((h) => [...h, optimistic]);

    try {
      const data = await sendCOOMessage(msg);
      setHistory((h) => [...h.slice(0, -1), {
        message: msg,
        response: data.response,
        agentsConsulted: data.agentsConsulted || [],
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      setHistory((h) => [...h.slice(0, -1), {
        message: msg,
        response: `⚠ ${err.message}`,
        agentsConsulted: [],
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    // Detect @mention typing
    const atMatch = val.match(/@(\w*)$/);
    setMentionSearch(atMatch ? atMatch[1].toLowerCase() : null);
  };

  const insertMention = (slug) => {
    const newVal = input.replace(/@\w*$/, `@${slug} `);
    setInput(newVal);
    setMentionSearch(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredMentions = mentionSearch !== null
    ? AGENTS.filter((a) => a.slug.startsWith(mentionSearch))
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0d0d0d]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-[#00c853]">COO</div>
          <div>
            <div className="font-extrabold text-white flex items-center gap-2">
              COO Agent
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
            </div>
            <p className="text-[#444] text-xs">Your Super Assistant — delegates to @onboarding @support @ops @sales @data @finance</p>
          </div>
        </div>
        <button onClick={() => setShowAgents((v) => !v)}
          className="text-xs text-[#555] border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:border-[#444] hover:text-[#888] transition">
          {showAgents ? "Hide agents" : "Agent network"}
        </button>
      </div>

      {/* Agent network panel */}
      {showAgents && (
        <div className="px-6 py-3 border-b border-[#1e1e1e] bg-[#0a0a0a] flex flex-wrap gap-2">
          {AGENTS.map((a) => (
            <button key={a.slug} onClick={() => { setInput((v) => v + `@${a.slug} `); inputRef.current?.focus(); }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition hover:opacity-80 ${a.color} ${a.bg}`}>
              {a.icon} @{a.label}
            </button>
          ))}
          <span className="text-xs text-[#333] self-center ml-1">Click to tag an agent</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {history.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-xl font-bold text-[#00c853] mb-4">COO</div>
            <h2 className="text-lg font-extrabold mb-1">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, Founder</h2>
            <p className="text-[#555] text-sm max-w-sm mb-6">I manage your agent network. Ask me anything or tag a specific agent with @mention.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_PROMPTS.map((p) => (
                <button key={p.label} onClick={() => setInput(p.text)}
                  className="text-xs bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-white px-3 py-1.5 rounded-full text-[#666] transition">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((item, i) => (
          item._pending
            ? <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-[#00c853]/15 border border-[#00c853]/25 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white">{item.message}</div>
                </div>
              </div>
            : <COOMessage key={i} {...item} time={item.created_at} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#1e1e1e] shrink-0 bg-[#0a0a0a] relative">
        {/* @mention autocomplete */}
        {filteredMentions.length > 0 && (
          <div className="absolute bottom-full mb-2 left-6 bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
            {filteredMentions.map((a) => (
              <button key={a.slug} onClick={() => insertMention(a.slug)}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#1a1a1a] transition text-left ${a.color}`}>
                {a.icon} <span className="font-semibold">@{a.label}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              placeholder="Ask the COO anything… type @ to tag a specific agent"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/40 transition resize-none leading-5 disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            />
          </div>
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 py-3 rounded-xl text-sm transition disabled:opacity-40 shrink-0">
            {loading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
