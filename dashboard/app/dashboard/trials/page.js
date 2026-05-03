"use client";
import { useEffect, useState } from "react";
import { getTrials } from "../../../lib/api";

const STATUS_COLOR = { trial: "text-blue-400 bg-blue-400/10", converted: "text-[#00c853] bg-[#0f2a1a]", churned: "text-red-400 bg-red-400/10", expired: "text-[#444] bg-[#111]" };

export default function TrialsPage() {
  const [trials, setTrials] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError]   = useState("");

  useEffect(() => {
    getTrials(filter !== "all" ? filter : undefined).then(setTrials).catch((e) => setError(e.message));
  }, [filter]);

  const counts = ["trial","converted","churned"].reduce((acc,s) => ({ ...acc, [s]: trials.filter((t) => t.status===s).length }), {});
  const convRate = trials.length ? Math.round((counts.converted / trials.length) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Trials & Sales</h1>
          <p className="text-[#555] text-sm mt-1">Trial pipeline — Rex (Sales Agent) handles email follow-ups</p>
        </div>
        <div className="flex gap-2">
          {["all","trial","converted","churned"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${filter===s ? "border-[#00c853] text-[#00c853]" : "border-[#2a2a2a] text-[#666] hover:border-[#444]"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[["Active Trials",counts.trial,false],["Converted",counts.converted,true],["Churned",counts.churned,false],["Conv. Rate",`${convRate}%`,false]].map(([l,v,g]) => (
          <div key={l} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{l}</div>
            <div className={`text-2xl font-bold ${g ? "text-[#00c853]" : "text-white"}`}>{v}</div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {trials.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#444] text-sm">No trials yet — marketing agents are on it</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e1e1e] text-[#444] text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3">Lead</th>
              <th className="text-left px-5 py-3">Company</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Emails Sent</th>
              <th className="text-left px-5 py-3">Trial Ends</th>
            </tr></thead>
            <tbody>{trials.map((t) => (
              <tr key={t.id} className="border-b border-[#161616] hover:bg-[#161616] transition">
                <td className="px-5 py-3"><div className="font-medium">{t.name}</div><div className="text-[#444] text-xs">{t.email}</div></td>
                <td className="px-5 py-3 text-[#666]">{t.company || "—"}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}>{t.status}</span></td>
                <td className="px-5 py-3 text-[#666]">{t.emails_sent}</td>
                <td className="px-5 py-3 text-[#444] text-xs">{t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
