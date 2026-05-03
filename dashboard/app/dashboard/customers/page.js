"use client";
import { useEffect, useState } from "react";
import { getCustomers } from "../../../lib/api";

const STAGE_COLOR = { signed_up: "text-blue-400", activated: "text-yellow-400", connected: "text-[#00c853]", retained: "text-purple-400" };
const STAGES = ["signed_up","activated","connected","retained"];

function HealthBar({ score }) {
  const color = score >= 70 ? "#00c853" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#222] rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs text-[#666] w-7">{score}</span>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [error, setError]         = useState("");

  useEffect(() => { getCustomers().then(setCustomers).catch((e) => setError(e.message)); }, []);

  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: customers.filter((c) => c.stage === s).length }), {});

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Customer Onboarding</h1>
        <p className="text-[#555] text-sm mt-1">Track customer health and journey stages</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {STAGES.map((s) => (
          <div key={s} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className={`text-xs uppercase tracking-widest mb-1 ${STAGE_COLOR[s]}`}>{s.replace("_"," ")}</div>
            <div className="text-2xl font-bold">{byStage[s] || 0}</div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#444] text-sm">No customers yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e1e1e] text-[#444] text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-left px-5 py-3">Stage</th>
              <th className="text-left px-5 py-3 w-40">Health</th>
              <th className="text-left px-5 py-3">Agent</th>
              <th className="text-left px-5 py-3">Joined</th>
            </tr></thead>
            <tbody>{customers.map((c) => (
              <tr key={c.id} className="border-b border-[#161616] hover:bg-[#161616] transition">
                <td className="px-5 py-3"><div className="font-medium">{c.contact_name || c.tenants?.name || "—"}</div><div className="text-[#444] text-xs">{c.contact_email}</div></td>
                <td className={`px-5 py-3 text-xs ${STAGE_COLOR[c.stage]}`}>{c.stage?.replace("_"," ")}</td>
                <td className="px-5 py-3"><HealthBar score={c.health_score} /></td>
                <td className="px-5 py-3 text-[#555] text-xs">{c.agents?.name || "—"}</td>
                <td className="px-5 py-3 text-[#444] text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
