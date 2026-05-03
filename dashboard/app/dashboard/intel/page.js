"use client";
import { useEffect, useState } from "react";
import { getIntel } from "../../../lib/api";

const CAT_COLOR   = { ai: "text-purple-400 bg-purple-400/10", competitor: "text-red-400 bg-red-400/10", market: "text-blue-400 bg-blue-400/10", tools: "text-yellow-400 bg-yellow-400/10" };
const CATEGORIES  = ["all","ai","competitor","market","tools"];

export default function IntelPage() {
  const [items, setItems]     = useState([]);
  const [filter, setFilter]   = useState("all");
  const [error, setError]     = useState("");

  useEffect(() => {
    getIntel(filter !== "all" ? filter : undefined).then(setItems).catch((e) => setError(e.message));
  }, [filter]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Intelligence Feed</h1>
          <p className="text-[#555] text-sm mt-1">Competitors · AI tools · Market signals — curated by your agents</p>
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && <span className="text-xs bg-[#0f2a1a] text-[#00c853] border border-[#1a3a2a] px-2 py-1 rounded-full">{unread} unread</span>}
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setFilter(c)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${filter===c ? "border-[#00c853] text-[#00c853]" : "border-[#2a2a2a] text-[#666] hover:border-[#444]"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">◎</div>
          <p className="text-[#444] text-sm max-w-xs">No intel yet. Once the intelligence agent is active, it will automatically surface competitor news, AI tool launches, and market signals here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-[#111] border rounded-xl p-5 transition ${item.read ? "border-[#1a1a1a] opacity-60" : "border-[#2a2a2a]"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLOR[item.category]}`}>{item.category}</span>
                    <span className="text-[#444] text-xs">{item.source}</span>
                    {item.relevance >= 8 && <span className="text-xs text-[#00c853]">🔥 High relevance</span>}
                  </div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  {item.summary && <p className="text-[#666] text-sm leading-relaxed">{item.summary}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {!item.read && <div className="w-2 h-2 rounded-full bg-[#00c853]" />}
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#555] hover:text-white transition">Read →</a>}
                  <span className="text-[#333] text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
