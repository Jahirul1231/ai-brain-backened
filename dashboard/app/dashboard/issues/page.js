"use client";
import { useEffect, useState } from "react";
import { getIssues } from "../../../lib/api";

const PRIORITY_COLOR = { critical: "text-red-400 bg-red-400/10", high: "text-orange-400 bg-orange-400/10", medium: "text-yellow-400 bg-yellow-400/10", low: "text-[#888] bg-[#1a1a1a]" };
const STATUS_COLOR   = { open: "text-blue-400", in_progress: "text-[#00c853]", resolved: "text-[#555]", closed: "text-[#333]" };

export default function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError]   = useState("");

  useEffect(() => {
    getIssues(filter !== "all" ? filter : undefined).then(setIssues).catch((e) => setError(e.message));
  }, [filter]);

  const counts = ["open","in_progress","resolved"].reduce((acc, s) => ({ ...acc, [s]: issues.filter((i) => i.status === s).length }), {});

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Client Issues</h1>
          <p className="text-[#555] text-sm mt-1">Real-time issue tracker — agents auto-assigned</p>
        </div>
        <div className="flex gap-2">
          {["all","open","in_progress","resolved"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${filter === s ? "border-[#00c853] text-[#00c853]" : "border-[#2a2a2a] text-[#666] hover:border-[#444]"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[["Open", counts.open, true],["In Progress", counts.in_progress, false],["Resolved", counts.resolved, false]].map(([l,v,g]) => (
          <div key={l} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{l}</div>
            <div className={`text-2xl font-bold ${g ? "text-[#00c853]" : "text-white"}`}>{v ?? 0}</div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {issues.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#444] text-sm">No issues found — great sign!</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e1e1e] text-[#444] text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3">Issue</th>
              <th className="text-left px-5 py-3">Priority</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Agent</th>
              <th className="text-left px-5 py-3">Created</th>
            </tr></thead>
            <tbody>{issues.map((issue) => (
              <tr key={issue.id} className="border-b border-[#161616] hover:bg-[#161616] transition">
                <td className="px-5 py-3 font-medium">{issue.title}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[issue.priority]}`}>{issue.priority}</span></td>
                <td className={`px-5 py-3 text-xs ${STATUS_COLOR[issue.status]}`}>{issue.status.replace("_"," ")}</td>
                <td className="px-5 py-3 text-[#555] text-xs">{issue.agents?.name || "—"}</td>
                <td className="px-5 py-3 text-[#444] text-xs">{new Date(issue.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
