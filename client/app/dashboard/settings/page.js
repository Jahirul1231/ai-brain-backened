"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSheets, addSheet, removeSheet, configureSubdomain, updateProfile } from "../../../lib/api";

export default function ClientSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [maxSheets, setMaxSheets] = useState(4);
  const [loading, setLoading] = useState(true);

  // Sheet form
  const [sheetInput, setSheetInput] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [addingSheet, setAddingSheet] = useState(false);
  const [sheetErr, setSheetErr] = useState("");

  // Subdomain
  const [slug, setSlug] = useState("");
  const [slugMsg, setSlugMsg] = useState("");
  const [slugErr, setSlugErr] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);

  // Profile
  const [profile, setProfile] = useState({ full_name: "", phone: "", city: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const googleConnectUrl = `https://ai-brain-backened-production.up.railway.app/sheets/connect?token=${typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""}`;

  const loadSheets = () => getSheets().then(({ sheets: s, maxSheets: m }) => { setSheets(s || []); setMaxSheets(m); }).catch(() => {});

  useEffect(() => {
    Promise.all([getMe(), getSheets()])
      .then(([data, { sheets: s, maxSheets: m }]) => {
        setMe(data);
        setSlug(data.tenant?.business_slug || "");
        setProfile({ full_name: data.profile?.full_name || "", phone: data.profile?.phone || "", city: data.profile?.city || "" });
        setSheets(s || []);
        setMaxSheets(m);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleAddSheet = async (e) => {
    e.preventDefault();
    if (!sheetInput) return setSheetErr("Paste a Google Sheets URL or ID");
    setSheetErr("");
    setAddingSheet(true);
    try {
      await addSheet(sheetInput, sheetName || undefined);
      setSheetInput("");
      setSheetName("");
      await loadSheets();
    } catch (err) {
      setSheetErr(err.message);
    } finally {
      setAddingSheet(false);
    }
  };

  const handleRemoveSheet = async (id) => {
    await removeSheet(id).catch(() => {});
    await loadSheets();
  };

  const handleSlugSave = async (e) => {
    e.preventDefault();
    setSlugErr(""); setSlugMsg("");
    const clean = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!clean) return setSlugErr("Enter a valid subdomain name");
    setSavingSlug(true);
    try {
      const res = await configureSubdomain(clean);
      setSlugMsg(res.message);
      setSlug(clean);
    } catch (err) { setSlugErr(err.message); }
    finally { setSavingSlug(false); }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true); setProfileMsg("");
    try {
      await updateProfile(profile);
      setProfileMsg("Profile updated");
    } catch {}
    finally { setSavingProfile(false); }
  };

  const logout = () => { localStorage.removeItem("token"); router.push("/login"); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>;

  return (
    <div className="p-8 max-w-2xl space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="text-[#555] text-sm mt-1">Manage your profile, data connections, and account</p>
      </div>

      {/* Trial status */}
      {me?.trial?.active && (
        <div className="bg-[#00c853]/5 border border-[#00c853]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[#00c853] text-sm font-semibold">◈ Free Trial Active</p>
            <p className="text-[#444] text-xs">{me.trial.daysLeft} days remaining · Full AI features unlocked</p>
          </div>
          <span className="text-xs text-[#333]">Ends {new Date(me.trial.endsAt).toLocaleDateString()}</span>
        </div>
      )}

      {/* Profile */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-4">Your Profile</h2>
        <form onSubmit={handleProfileSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "full_name", label: "Full Name",    placeholder: "Jane Smith" },
              { key: "phone",     label: "Phone Number", placeholder: "+1 555 000 0000" },
              { key: "city",      label: "City",         placeholder: "New York" },
            ].map((f) => (
              <div key={f.key} className={f.key === "full_name" ? "col-span-2" : ""}>
                <label className="block text-xs text-[#555] mb-1 uppercase tracking-wider">{f.label}</label>
                <input
                  value={profile[f.key]}
                  onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                />
              </div>
            ))}
          </div>
          {profileMsg && <p className="text-[#00c853] text-xs">{profileMsg}</p>}
          <button type="submit" disabled={savingProfile} className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50">
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
        <div className="mt-3 pt-3 border-t border-[#1a1a1a] text-xs text-[#444] space-y-1">
          <div className="flex justify-between"><span>Email</span><span className="text-white">{me?.user?.email}</span></div>
          <div className="flex justify-between"><span>Plan</span><span className="text-[#00c853] capitalize">{me?.tenant?.plan || "Starter"}</span></div>
          <div className="flex justify-between"><span>Tokens</span><span className={`font-bold ${(me?.tokenBalance || 0) > 20 ? "text-[#00c853]" : "text-yellow-400"}`}>{me?.tokenBalance ?? 0}</span></div>
        </div>
      </section>

      {/* Google Sheets connections */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest">Connected Sheets</h2>
          <span className="text-xs text-[#444]">{sheets.length} / {maxSheets}</span>
        </div>
        <p className="text-[#444] text-xs mb-4">Your plan allows {maxSheets} spreadsheets. Connect Google first, then paste the sheet URL.</p>

        <a href={googleConnectUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-100 transition mb-4">
          🔗 Connect / Reconnect Google Account
        </a>

        {sheets.length > 0 && (
          <div className="space-y-2 mb-4">
            {sheets.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm text-white font-medium flex items-center gap-2">
                    {s.spreadsheet_name || s.spreadsheet_id}
                    {s.is_primary && <span className="text-[10px] text-[#00c853] border border-[#00c853]/30 px-1.5 py-0.5 rounded-full">Primary</span>}
                  </p>
                  <p className="text-xs text-[#444] font-mono mt-0.5">{s.spreadsheet_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={s.spreadsheet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#555] hover:text-[#00c853] transition">Open →</a>
                  <button onClick={() => handleRemoveSheet(s.id)} className="text-xs text-red-400/50 hover:text-red-400 transition px-2 py-1 rounded-lg">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sheets.length < maxSheets && (
          <form onSubmit={handleAddSheet} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input value={sheetInput} onChange={(e) => setSheetInput(e.target.value)}
                className="col-span-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                placeholder="Paste Google Sheets URL or ID…" />
              <input value={sheetName} onChange={(e) => setSheetName(e.target.value)}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                placeholder="Nickname (optional)" />
              <button type="submit" disabled={addingSheet}
                className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white text-sm font-medium px-3 py-2.5 rounded-xl transition disabled:opacity-50">
                {addingSheet ? "Adding…" : "+ Add Sheet"}
              </button>
            </div>
            {sheetErr && <p className="text-red-400 text-xs">{sheetErr}</p>}
          </form>
        )}
      </section>

      {/* Subdomain */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-1">Your Subdomain</h2>
        <p className="text-[#444] text-xs mb-3">Your dedicated portal URL</p>
        <form onSubmit={handleSlugSave} className="space-y-2">
          <div className="flex gap-2 items-center">
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="your-business" />
            <span className="text-[#444] text-sm shrink-0">.reportude.com</span>
          </div>
          {slugErr && <p className="text-red-400 text-xs">{slugErr}</p>}
          {slugMsg && <p className="text-[#00c853] text-xs">{slugMsg}</p>}
          <button type="submit" disabled={savingSlug} className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50">
            {savingSlug ? "Saving…" : "Save subdomain"}
          </button>
        </form>
        {me?.tenant?.subdomain_active && <p className="text-[#00c853] text-xs mt-2">● Subdomain active</p>}
      </section>

      {/* Privacy */}
      <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-widest mb-3">Data & Privacy</h2>
        <div className="space-y-1.5 text-xs text-[#555]">
          {["Data encrypted in transit (TLS 1.3)", "Row-level security — only you access your data", "Write operations require explicit confirmation", "Data processing consent recorded"].map((t) => (
            <div key={t} className="flex items-center gap-2"><span className="text-[#00c853]">✓</span>{t}</div>
          ))}
        </div>
        <p className="text-[#333] text-xs mt-3">To delete your account, email <span className="text-[#555]">privacy@reportude.com</span></p>
      </section>

      <section className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-3">Account</h2>
        <button onClick={logout} className="text-sm text-red-400 border border-red-400/20 px-4 py-2 rounded-xl hover:bg-red-400/10 transition">Sign out</button>
      </section>
    </div>
  );
}
