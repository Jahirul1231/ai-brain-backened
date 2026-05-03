"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, configureSubdomain } from "../../../lib/api";

export default function ClientSettingsPage() {
  const router = useRouter();
  const [me, setMe]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [slugMsg, setSlugMsg] = useState("");
  const [slugErr, setSlugErr] = useState("");

  const googleConnectUrl = `https://ai-brain-backened-production.up.railway.app/sheets/connect?token=${typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""}`;

  useEffect(() => {
    getMe()
      .then((data) => {
        setMe(data);
        setSlug(data.tenant?.business_slug || "");
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSlugSave = async (e) => {
    e.preventDefault();
    setSlugErr("");
    setSlugMsg("");
    const clean = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!clean) return setSlugErr("Enter a valid subdomain name");
    setSaving(true);
    try {
      const res = await configureSubdomain(clean);
      setSlugMsg(res.message);
      setSlug(clean);
    } catch (err) {
      setSlugErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const logout = () => { localStorage.removeItem("token"); router.push("/login"); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="text-[#555] text-sm mt-1">Manage your portal, integrations, and data preferences</p>
      </div>

      {/* Profile */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-4">Profile</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#555]">Business</span>
            <span className="text-white font-medium">{me?.tenant?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Email</span>
            <span className="text-white">{me?.user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Plan</span>
            <span className="text-[#00c853] capitalize">{me?.tenant?.plan || "Starter"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">AI Tokens</span>
            <span className={`font-bold ${(me?.tokenBalance || 0) > 20 ? "text-[#00c853]" : "text-yellow-400"}`}>{me?.tokenBalance ?? 0}</span>
          </div>
        </div>
      </section>

      {/* Subdomain */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-1">Your Subdomain</h2>
        <p className="text-[#444] text-xs mb-4">Your dedicated portal at <span className="text-[#555]">yourbusiness.reportude.com</span></p>
        <form onSubmit={handleSlugSave} className="space-y-3">
          <div className="flex gap-2 items-center">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition font-mono"
              placeholder="your-business"
            />
            <span className="text-[#444] text-sm shrink-0">.reportude.com</span>
          </div>
          {slugErr && <p className="text-red-400 text-xs">{slugErr}</p>}
          {slugMsg && <p className="text-[#00c853] text-xs">{slugMsg}</p>}
          <button type="submit" disabled={saving}
            className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50">
            {saving ? "Saving…" : "Save subdomain"}
          </button>
        </form>
        {me?.tenant?.subdomain_active && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#00c853]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
            Subdomain active
          </div>
        )}
      </section>

      {/* Google Sheets */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-1">Google Sheets</h2>
        <p className="text-[#444] text-xs mb-4">Connect or reconnect your Google account to allow data access</p>
        <a
          href={googleConnectUrl}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <span>🔗</span> Connect Google Sheets
        </a>
      </section>

      {/* Data Privacy */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-3">Data & Privacy</h2>
        <div className="space-y-2 text-sm text-[#555]">
          <div className="flex items-center gap-2">
            <span className="text-[#00c853]">✓</span>
            Data encrypted in transit (TLS 1.3)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#00c853]">✓</span>
            Row-level security — only you can access your data
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#00c853]">✓</span>
            AI write operations require explicit confirmation
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#00c853]">✓</span>
            Data processing consent recorded
          </div>
        </div>
        <p className="text-[#333] text-xs mt-3">
          To request deletion of your data, email{" "}
          <span className="text-[#555]">privacy@reportude.com</span>
        </p>
      </section>

      {/* Danger zone */}
      <section className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-3">Account</h2>
        <button
          onClick={logout}
          className="text-sm text-red-400 border border-red-400/20 px-4 py-2 rounded-xl hover:bg-red-400/10 transition"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
