"use client";
import { useEffect, useState } from "react";
import { getFinanceSummary, getTransactions, addTransaction } from "../../../lib/api";

const TYPE_COLOR = { revenue: "text-[#00c853]", expense: "text-red-400", refund: "text-yellow-400" };

function MetricCard({ label, value, positive }) {
  const isNeg = Number(value) < 0;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
      <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold ${positive ? "text-[#00c853]" : isNeg ? "text-red-400" : "text-white"}`}>
        ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [summary, setSummary]         = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ type: "revenue", category: "saas", amount: "", description: "" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const load = () => Promise.all([
    getFinanceSummary().then(setSummary),
    getTransactions().then(setTransactions),
  ]).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addTransaction(form);
      setForm({ type: "revenue", category: "saas", amount: "", description: "" });
      setShowForm(false);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Finance</h1>
          <p className="text-[#555] text-sm mt-1">P&L · Revenue · EBITDA — current month</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs bg-[#00c853] text-black font-bold px-4 py-2 rounded-lg hover:bg-[#00a846] transition">
          + Add Transaction
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
          {[["type","select",["revenue","expense","refund"]],["category","select",["saas","hosting","marketing","salary","tools","other"]],["amount","number"],["description","text"]].map(([field, type, opts]) => (
            <div key={field}>
              <label className="text-xs text-[#555] uppercase tracking-widest mb-1 block">{field}</label>
              {type === "select" ? (
                <select value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00c853]">
                  {opts.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={type} placeholder={field} value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00c853]" />
              )}
            </div>
          ))}
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="bg-[#00c853] text-black text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-[#666] hover:text-white transition">Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <MetricCard label="Revenue"      value={summary?.revenue}     positive />
        <MetricCard label="Expenses"     value={summary?.expenses} />
        <MetricCard label="Refunds"      value={summary?.refunds} />
        <MetricCard label="Gross Profit" value={summary?.grossProfit} />
        <MetricCard label="EBITDA"       value={summary?.ebitda} />
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#444] text-sm">No transactions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e1e1e] text-[#444] text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3">Description</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-right px-5 py-3">Amount</th>
              <th className="text-left px-5 py-3">Date</th>
            </tr></thead>
            <tbody>{transactions.map((t) => (
              <tr key={t.id} className="border-b border-[#161616] hover:bg-[#161616] transition">
                <td className="px-5 py-3 font-medium">{t.description}</td>
                <td className={`px-5 py-3 text-xs ${TYPE_COLOR[t.type]}`}>{t.type}</td>
                <td className="px-5 py-3 text-[#555] text-xs">{t.category}</td>
                <td className={`px-5 py-3 text-right font-mono ${TYPE_COLOR[t.type]}`}>${Number(t.amount).toLocaleString()}</td>
                <td className="px-5 py-3 text-[#444] text-xs">{t.date}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
