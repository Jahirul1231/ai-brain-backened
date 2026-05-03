"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTenantDetail, grantTokens } from "../../../../lib/api";

export default function TenantDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [granting, setGranting] = useState(false);

  const load = () => getTenantDetail(id).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const handleGrant = async (e) => {
    e.preventDefault();
    setGranting(true);
    try {
      await grantTokens(id, parseInt(grantAmount, 10));
      setGrantAmount("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  };

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-[#666]">Loading…</p>;

  const { tenant, ledger, recentChats } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{tenant.name}</h1>
          <p className="text-[#888] text-sm mt-1">
            Created {new Date(tenant.created_at).toLocaleDateString()} ·{" "}
            <span className="text-[#00c853] font-semibold">
              {tenant.token_balances?.[0]?.balance ?? 0} tokens
            </span>
          </p>
        </div>

        <form onSubmit={handleGrant} className="flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Tokens"
            value={grantAmount}
            onChange={(e) => setGrantAmount(e.target.value)}
            className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00c853]"
          />
          <button
            type="submit"
            disabled={granting || !grantAmount}
            className="bg-[#00c853] text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#00a846] transition disabled:opacity-50"
          >
            {granting ? "…" : "Grant"}
          </button>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] text-xs text-[#666] uppercase tracking-widest">
            Token Ledger
          </div>
          {ledger.length === 0 ? (
            <p className="px-5 py-4 text-[#555] text-sm">No transactions</p>
          ) : (
            <ul className="divide-y divide-[#222]">
              {ledger.map((entry, i) => (
                <li key={i} className="px-5 py-3 flex justify-between text-sm">
                  <span className="text-[#888]">{entry.description}</span>
                  <span className={entry.amount > 0 ? "text-[#00c853]" : "text-red-400"}>
                    {entry.amount > 0 ? "+" : ""}{entry.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] text-xs text-[#666] uppercase tracking-widest">
            Recent Chats
          </div>
          {recentChats.length === 0 ? (
            <p className="px-5 py-4 text-[#555] text-sm">No chats yet</p>
          ) : (
            <ul className="divide-y divide-[#222]">
              {recentChats.map((chat) => (
                <li key={chat.id} className="px-5 py-3 text-sm">
                  <p className="text-white font-medium truncate">{chat.message}</p>
                  <p className="text-[#666] text-xs mt-1 truncate">{chat.response}</p>
                  <p className="text-[#444] text-xs mt-1">
                    {chat.tools_used?.join(", ") || "no tools"} · {new Date(chat.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
