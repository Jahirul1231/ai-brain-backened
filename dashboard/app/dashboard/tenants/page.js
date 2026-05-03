"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTenants } from "../../../lib/api";

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getTenants().then(setTenants).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Tenants</h1>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-[#666] text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3">Tenant</th>
              <th className="text-left px-5 py-3">Created</th>
              <th className="text-left px-5 py-3">Tokens</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-[#555] text-center">
                  {error ? "Failed to load" : "No tenants yet"}
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-[#222] hover:bg-[#222] transition">
                <td className="px-5 py-3 font-medium">{t.name}</td>
                <td className="px-5 py-3 text-[#888]">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <span className="text-[#00c853] font-semibold">
                    {t.token_balances?.[0]?.balance ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/dashboard/tenants/${t.id}`}
                    className="text-xs text-[#888] hover:text-white transition"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
