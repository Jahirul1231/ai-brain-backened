"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { getChannels, getChannelMessages, postChannelMessage, markChannelRead } from "../../../lib/api";

const SENDER_COLORS = {
  "Onboarding Agent":      "text-blue-400",
  "Support Agent":         "text-purple-400",
  "OPS Agent":             "text-orange-400",
  "Data Verification Agent": "text-yellow-400",
  "Data Analyst Agent":    "text-cyan-400",
  "System":                "text-[#555]",
  "Founder":               "text-[#00c853]",
};

const SENDER_BG = {
  founder: "bg-[#00c853]/10 border-[#00c853]/20",
  agent:   "bg-[#111] border-[#1e1e1e]",
  system:  "bg-[#0d0d0d] border-[#161616]",
};

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function formatContent(text) {
  // Bold **text**
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [activeSlug, setActiveSlug] = useState("general");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // Load channel list
  const loadChannels = useCallback(async () => {
    try {
      const data = await getChannels();
      setChannels(data.channels || []);
    } catch {}
  }, []);

  // Load messages for active channel
  const loadMessages = useCallback(async (slug, silent = false) => {
    if (!silent) setLoadingMsg(true);
    try {
      const data = await getChannelMessages(slug);
      setMessages(data.messages || []);
    } catch {}
    finally { setLoadingMsg(false); }
  }, []);

  // Initial load
  useEffect(() => { loadChannels(); }, [loadChannels]);

  // Switch channel
  useEffect(() => {
    loadMessages(activeSlug);
    markChannelRead(activeSlug).catch(() => {});
    loadChannels(); // refresh unread counts

    // Poll every 15s for new messages
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      await loadMessages(activeSlug, true);
      await loadChannels();
    }, 15000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeSlug, loadMessages, loadChannels]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await postChannelMessage(activeSlug, text);
      await loadMessages(activeSlug, true);
      await loadChannels();
    } catch { setInput(text); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  };

  const activeChannel = channels.find((c) => c.slug === activeSlug);
  const totalUnread = channels.reduce((a, c) => a + (c.unread || 0), 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Channel list sidebar ── */}
      <div className="w-56 shrink-0 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col">
        <div className="px-4 py-4 border-b border-[#1e1e1e]">
          <div className="text-xs font-bold text-[#00c853] uppercase tracking-widest">Agent Channels</div>
          {totalUnread > 0 && (
            <div className="text-xs text-[#555] mt-0.5">{totalUnread} unread</div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {channels.map((ch) => {
            const active = ch.slug === activeSlug;
            return (
              <button key={ch.slug} onClick={() => setActiveSlug(ch.slug)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${active ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#999] hover:bg-[#111]"}`}>
                <span className={`text-sm shrink-0 ${active ? "text-[#00c853]" : "text-[#333]"}`}>{ch.icon}</span>
                <span className="text-sm flex-1 truncate">{ch.name}</span>
                {ch.unread > 0 && !active && (
                  <span className="bg-[#00c853] text-black text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shrink-0">
                    {ch.unread > 99 ? "99+" : ch.unread}
                  </span>
                )}
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[#1e1e1e]">
          <p className="text-[10px] text-[#333] leading-relaxed">Agents post here automatically. You can reply in any channel.</p>
        </div>
      </div>

      {/* ── Messages panel ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center gap-3 shrink-0">
          <span className="text-[#00c853] text-lg">{activeChannel?.icon}</span>
          <div>
            <div className="font-semibold text-white">{activeChannel?.name}</div>
            <div className="text-xs text-[#444] mt-0.5">{activeChannel?.description}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {loadingMsg && (
            <div className="flex justify-center py-16">
              <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
            </div>
          )}

          {!loadingMsg && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center">
              <div className="text-3xl mb-3 text-[#1a1a1a]">{activeChannel?.icon}</div>
              <p className="text-[#444] text-sm font-medium">#{activeChannel?.name}</p>
              <p className="text-[#333] text-xs mt-1">{activeChannel?.description}</p>
              <p className="text-[#2a2a2a] text-xs mt-4">No messages yet. Agents will post here automatically.</p>
            </div>
          )}

          {!loadingMsg && messages.map((msg, i) => {
            const isFounder = msg.sender_type === "founder";
            const isSystem = msg.sender_type === "system";
            const prevMsg = messages[i - 1];
            const sameAuthor = prevMsg?.sender_name === msg.sender_name &&
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 120000;

            if (isFounder) {
              return (
                <div key={msg.id} className={`flex justify-end ${sameAuthor ? "mt-0.5" : "mt-3"}`}>
                  <div className="max-w-[70%]">
                    {!sameAuthor && (
                      <div className="text-right text-xs text-[#444] mb-1 mr-1">
                        You · <span className="text-[#333]">{timeAgo(msg.created_at)}</span>
                      </div>
                    )}
                    <div className="bg-[#00c853]/15 border border-[#00c853]/25 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white"
                      dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                  </div>
                </div>
              );
            }

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-xs text-[#333] bg-[#111] border border-[#1a1a1a] px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`${sameAuthor ? "mt-0.5" : "mt-3"}`}>
                {!sameAuthor && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xs font-semibold ${SENDER_COLORS[msg.sender_name] || "text-[#888]"}`}>
                      {msg.sender_name}
                    </span>
                    <span className="text-[10px] text-[#333]">{timeAgo(msg.created_at)}</span>
                  </div>
                )}
                <div className={`inline-block max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-[#ccc] border ${SENDER_BG[msg.sender_type] || SENDER_BG.agent}`}
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#1e1e1e] shrink-0">
          <form onSubmit={handleSend} className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={`Message #${activeChannel?.name || "channel"}… (Enter to send, Shift+Enter for newline)`}
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/40 transition resize-none leading-5"
              style={{ maxHeight: "120px", overflowY: "auto" }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            />
            <button type="submit" disabled={sending || !input.trim()}
              className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-5 py-3 rounded-xl text-sm transition disabled:opacity-40 shrink-0">
              {sending ? "…" : "Send"}
            </button>
          </form>
          <p className="text-[10px] text-[#2a2a2a] mt-2">Agents see your messages and can respond. Replies are logged per channel.</p>
        </div>
      </div>
    </div>
  );
}
