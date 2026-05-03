"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClientDetail, updateClient, extendTrial, grantTokens } from "../../../../lib/api";

const SECTION = ({ title, children }) => (
  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
    <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-4">{title}</h2>
    {children}
  </div>
);

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Edit state
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("starter");
  const [status, setStatus] = useState("active");
  const [extendDays, setExtendDays] = useState(7);
  const [grantAmt, setGrantAmt] = useState("");
  const [granting, setGranting] = useState(false);

  const load = async () => {
    try {
      const d = await getClientDetail(id);
      setData(d);
      setNotes(d.tenant?.notes || "");
      setPlan(d.tenant?.plan || "starter");
      setStatus(d.tenant?.account_status || "active");
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      await updateClient(id, { notes, plan, account_status: status });
      setMsg("Saved");
      await load();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleExtendTrial = async () => {
    setSaving(true); setMsg("");
    try {
      await extendTrial(id, parseInt(extendDays, 10));
      setMsg(`Trial extended by ${extendDays} days`);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleGrant = async () => {
    if (!grantAmt) return;
    setGranting(true); setMsg("");
    try {
      await grantTokens(id, parseInt(grantAmt, 10));
      setGrantAmt("");
      setMsg(`Granted ${grantAmt} tokens`);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setGranting(false); }
  };

  if (err) return <div className="text-red-400 p-8">{err}</div>;
  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" /></div>;

  // API returns the tenant fields at root level, enriched data as separate keys
  const tenant = data;
  const profiles = data.profiles || [];
  const onboarding = data.onboarding_progress?.[0] || null;
  const sheets = data.sheet_connections || [];
  const reports = data.reports || [];
  const tickets = data.tickets || [];
  const ledger = data.activity || [];
  const tokenBalance = data.token_balance ?? data.token_balances?.balance ?? 0;
  const trialDaysLeft = data.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(data.trial_ends_at) - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.push("/dashboard/tenants")} className="text-[#444] hover:text-white transition mt-1">←</button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{tenant?.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#555]">
            <span className="font-mono">{tenant?.id}</span>
            <span>·</span>
            <span>Joined {new Date(tenant?.created_at).toLocaleDateString()}</span>
            {tenant?.business_slug && <span className="font-mono text-[#444]">{tenant.business_slug}.reportude.com</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${
            tenant?.account_status === "active" ? "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20"
            : tenant?.account_status === "suspended" ? "text-red-400 bg-red-400/10 border-red-400/20"
            : "text-[#555] bg-[#111] border-[#2a2a2a]"
          }`}>{tenant?.account_status || "active"}</span>
          {tenant?.trial_active && (
            <span className="text-xs px-2.5 py-1 rounded-full border text-yellow-400 bg-yellow-400/10 border-yellow-400/20">
              Trial · {trialDaysLeft}d left
            </span>
          )}
        </div>
      </div>

      {msg && <div className="bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] text-sm px-4 py-2 rounded-xl">{msg}</div>}
      {err && <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-2 rounded-xl">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stats */}
        {[
          { label: "Tokens", value: tokenBalance, color: tokenBalance > 20 ? "text-[#00c853]" : "text-yellow-400" },
          { label: "Sheets", value: sheets?.length ?? 0, color: "text-white" },
          { label: "Reports", value: reports?.length ?? 0, color: "text-white" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <div className="text-xs text-[#444] uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile / Contact info */}
        <SECTION title="Client Profile">
          {profiles?.length === 0 ? (
            <p className="text-[#444] text-sm">No profiles found</p>
          ) : profiles?.map((p) => (
            <div key={p.id} className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-[#555]">Name</span><span className="text-white">{p.full_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[#555]">Email</span><span className="text-white font-mono text-xs">{p.email}</span></div>
              <div className="flex justify-between"><span className="text-[#555]">Phone</span><span className="text-white">{p.phone || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[#555]">City</span><span className="text-white">{p.city || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[#555]">Role</span><span className="text-[#00c853] capitalize">{p.role}</span></div>
            </div>
          ))}
        </SECTION>

        {/* Onboarding status */}
        <SECTION title="Onboarding Status">
          {!onboarding ? (
            <p className="text-[#444] text-sm">No onboarding data</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Welcome seen",    done: onboarding.welcome_seen },
                { label: "Business info",   done: onboarding.business_info_done },
                { label: "Google connected",done: onboarding.google_connected },
                { label: "Sheet added",     done: onboarding.sheet_added },
                { label: "AI trial done",   done: onboarding.ai_trial_done },
                { label: "Completed",       done: onboarding.completed },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[#555]">{label}</span>
                  <span className={done ? "text-[#00c853]" : "text-[#333]"}>{done ? "✓ Done" : "○ Pending"}</span>
                </div>
              ))}
              {onboarding.updated_at && (
                <p className="text-xs text-[#333] pt-1">Last updated {new Date(onboarding.updated_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </SECTION>

        {/* Grant tokens + trial */}
        <SECTION title="Token & Trial Controls">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#555] mb-1.5 block uppercase tracking-wider">Grant Tokens</label>
              <div className="flex gap-2">
                <input type="number" min="1" value={grantAmt} onChange={(e) => setGrantAmt(e.target.value)}
                  placeholder="Amount"
                  className="w-28 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c853]/50 transition" />
                <button onClick={handleGrant} disabled={granting || !grantAmt}
                  className="bg-[#00c853] text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#00b248] transition disabled:opacity-50">
                  {granting ? "…" : "Grant"}
                </button>
              </div>
            </div>
            {tenant?.trial_active !== false && (
              <div>
                <label className="text-xs text-[#555] mb-1.5 block uppercase tracking-wider">Extend Trial</label>
                <div className="flex gap-2 items-center">
                  <input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(e.target.value)}
                    className="w-20 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c853]/50 transition" />
                  <span className="text-xs text-[#555]">days</span>
                  <button onClick={handleExtendTrial} disabled={saving}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#222] transition disabled:opacity-50">
                    Extend
                  </button>
                </div>
                {tenant?.trial_ends_at && (
                  <p className="text-xs text-[#444] mt-1">Currently ends {new Date(tenant.trial_ends_at).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        </SECTION>

        {/* Admin controls */}
        <SECTION title="Account Controls">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#555] mb-1 block uppercase tracking-wider">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#555] mb-1 block uppercase tracking-wider">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#555] mb-1 block uppercase tracking-wider">Internal Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Add notes about this client…"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none" />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="bg-[#00c853] text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#00b248] transition disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </SECTION>
      </div>

      {/* Connected sheets */}
      {sheets?.length > 0 && (
        <SECTION title="Connected Sheets">
          <div className="space-y-2">
            {sheets.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-white">{s.spreadsheet_name || s.spreadsheet_id}</span>
                  {s.is_primary && <span className="ml-2 text-xs text-[#00c853] border border-[#00c853]/30 px-1.5 py-0.5 rounded-full">Primary</span>}
                  <p className="text-xs text-[#444] font-mono">{s.spreadsheet_id}</p>
                </div>
                {s.spreadsheet_url && (
                  <a href={s.spreadsheet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#555] hover:text-[#00c853]">Open →</a>
                )}
              </div>
            ))}
          </div>
        </SECTION>
      )}

      {/* Support tickets */}
      {tickets?.length > 0 && (
        <SECTION title="Support Tickets">
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#0a0a0a]">
                <div>
                  <span className="font-mono text-xs text-[#444]">{t.ticket_number}</span>
                  <p className="text-white">{t.subject}</p>
                  <p className="text-xs text-[#444]">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                  t.status === "open" ? "text-[#00c853] bg-[#00c853]/10 border-[#00c853]/20"
                  : t.status === "resolved" ? "text-[#555] bg-[#1a1a1a] border-[#2a2a2a]"
                  : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                }`}>{t.status?.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </SECTION>
      )}

      {/* Recent chats / activity */}
      <SECTION title="Token Ledger">
        {!ledger?.length ? (
          <p className="text-[#444] text-sm">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {ledger.slice(0, 15).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#161616] last:border-0">
                <span className="text-[#555]">{e.description || e.reason}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#333]">{new Date(e.created_at).toLocaleDateString()}</span>
                  <span className={`font-semibold ${e.amount > 0 ? "text-[#00c853]" : "text-red-400"}`}>
                    {e.amount > 0 ? "+" : ""}{e.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SECTION>
    </div>
  );
}
