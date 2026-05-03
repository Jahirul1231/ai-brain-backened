"use client";
import { useEffect, useState } from "react";
import { getAgents } from "../../../lib/api";

const STATUS_COLOR = { working: "text-[#00c853] bg-[#0f2a1a]", idle: "text-[#888] bg-[#1a1a1a]", offline: "text-[#444] bg-[#111]" };
const STATUS_DOT   = { working: "bg-[#00c853] animate-pulse", idle: "bg-[#444]", offline: "bg-[#222]" };

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [error, setError]   = useState("");

  useEffect(() => { getAgents().then(setAgents).catch((e) => setError(e.message)); }, []);

  const working = agents.filter((a) => a.status === "working").length;
  const idle    = agents.filter((a) => a.status === "idle").length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Agent Network</h1>
        <p className="text-[#555] text-sm mt-1">Your AI team — always on, always working</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Agents", value: agents.length },
          { label: "Working",      value: working, green: true },
          { label: "Idle",         value: idle },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.green ? "text-[#00c853]" : "text-white"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-white">{agent.name}</div>
                <div className="text-[#555] text-xs mt-0.5">{agent.role}</div>
              </div>
              <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${STATUS_COLOR[agent.status] || STATUS_COLOR.idle}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[agent.status] || STATUS_DOT.idle}`} />
                {agent.status}
              </span>
            </div>
            <p className="text-[#666] text-xs leading-relaxed">{agent.description}</p>
            <div className="flex items-center justify-between text-[#444] text-xs border-t border-[#1e1e1e] pt-3">
              <span>Tasks done: <span className="text-white">{agent.tasks_done}</span></span>
              {agent.last_task && <span className="truncate ml-2 text-right max-w-[60%]">{agent.last_task}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
