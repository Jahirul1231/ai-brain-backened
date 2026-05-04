"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, updateOnboarding, submitConsent, configureSubdomain, verifySheet, addSheet } from "../../lib/api";

const STEPS = [
  { n: 1, label: "Welcome" },
  { n: 2, label: "Your Business" },
  { n: 3, label: "Connect Data" },
  { n: 4, label: "Legal Consent" },
  { n: 5, label: "Go Live" },
];

const INDUSTRIES = [
  "E-commerce", "SaaS / Technology", "Agency / Consulting",
  "Finance / Accounting", "Healthcare", "Real Estate",
  "Education", "Manufacturing", "Retail", "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 2
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [useCase, setUseCase] = useState("");
  const [slug, setSlug] = useState("");
  // Step 3
  const [sheetUrl, setSheetUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  // Step 4
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getMe()
      .then((data) => {
        setMe(data);
        const ob = data.onboarding;
        if (ob?.completed) { router.replace("/dashboard"); return; }
        if (ob?.step) setStep(ob.step);
        if (ob?.business_name) setBusinessName(ob.business_name);
        if (ob?.industry) setIndustry(ob.industry);
        if (ob?.use_case) setUseCase(ob.use_case);
        if (data.tenant?.business_slug) setSlug(data.tenant.business_slug);
        if (data.googleConnected) setGoogleConnected(true);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const save = async (updates) => {
    setSaving(true);
    setError("");
    try {
      await updateOnboarding(updates);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openGoogleAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const popup = window.open(
      `/api/proxy/sheets/connect?token=${encodeURIComponent(token)}`,
      "google_auth",
      "width=520,height=620,scrollbars=yes,resizable=yes"
    );
    setConnectingGoogle(true);
    const onMessage = (e) => {
      if (e.data === "google_connected") {
        setGoogleConnected(true);
        setConnectingGoogle(false);
        window.removeEventListener("message", onMessage);
      } else if (e.data === "google_error") {
        setVerifyError("Google connection failed — please try again");
        setConnectingGoogle(false);
        window.removeEventListener("message", onMessage);
      }
    };
    window.addEventListener("message", onMessage);
    const timer = setInterval(() => {
      if (popup?.closed) {
        setConnectingGoogle(false);
        window.removeEventListener("message", onMessage);
        clearInterval(timer);
      }
    }, 500);
  };

  const handleVerify = async () => {
    if (!sheetUrl.trim()) return setVerifyError("Please paste your Google Sheet URL");
    setVerifying(true);
    setVerifyError("");
    setVerifyResult(null);
    try {
      const result = await verifySheet(sheetUrl.trim());
      if (result.not_configured) {
        await addSheet(sheetUrl.trim(), "My Spreadsheet", 0);
        setVerifyResult({ ok: true, manual: true, spreadsheetId: result.spreadsheetId, tabs: [] });
      } else {
        const name = result.spreadsheetName || "My Spreadsheet";
        await addSheet(sheetUrl.trim(), name, result.tabCount);
        setVerifyResult(result);
      }
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const goNext = async () => {
    if (step === 2) {
      if (!businessName || !industry) return setError("Please fill in all fields");
      await save({ step: 3, business_name: businessName, industry, use_case: useCase });
      // Also set subdomain slug from business name
      const autoSlug = businessName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setSlug(autoSlug);
    }
    if (step === 3) {
      if (!googleConnected) return setError("Please connect your Google account first");
      if (!verifyResult) return setError("Please connect a spreadsheet before continuing");
      await save({ step: 4, sheets_shared: true });
      if (slug) { try { await configureSubdomain(slug); } catch {} }
    }
    if (step === 4) {
      if (!consentChecked) return setError("You must accept the terms to continue");
      try { await submitConsent("1.0"); } catch {}
      await save({ step: 5, consent_given: true });
    }
    if (step === 5) {
      await save({ step: 5, completed: true, dashboard_generated: true });
      router.push("/dashboard");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            Reportude AI
          </div>
          <h1 className="text-2xl font-extrabold text-white">Set up your workspace</h1>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 ${step >= s.n ? "text-[#00c853]" : "text-[#333]"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step > s.n ? "bg-[#00c853] text-black" : step === s.n ? "bg-[#00c853]/20 border border-[#00c853] text-[#00c853]" : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#333]"}`}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <span className="text-xs hidden sm:block truncate">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${step > s.n ? "bg-[#00c853]/30" : "bg-[#1e1e1e]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-3xl mx-auto mb-6">◎</div>
              <h2 className="text-xl font-bold text-white mb-3">Welcome to Reportude AI</h2>
              <p className="text-[#555] text-sm leading-relaxed mb-6">
                We turn your Google Sheets into intelligent dashboards. Connect your data, ask questions in plain English, and get instant reports, insights, and automated updates.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left mb-6">
                {[
                  { icon: "◈", t: "AI Chat", d: "Ask anything about your data" },
                  { icon: "◉", t: "Auto Reports", d: "Generate reports on demand" },
                  { icon: "⬡", t: "Data Updates", d: "Get notified on key changes" },
                  { icon: "◇", t: "Your Subdomain", d: `${(me?.tenant?.business_slug || "yourname")}.reportude.com` },
                ].map((f) => (
                  <div key={f.t} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-3">
                    <div className="text-[#00c853] text-lg mb-1">{f.icon}</div>
                    <div className="text-white text-sm font-medium">{f.t}</div>
                    <div className="text-[#444] text-xs">{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Business Profile */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Tell us about your business</h2>
              <p className="text-[#555] text-sm mb-6">This helps our AI give you more relevant insights</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Business Name</label>
                  <input
                    type="text" value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00c853]/50 transition"
                  >
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">What do you mainly track? <span className="text-[#333] normal-case">(optional)</span></label>
                  <textarea
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    rows={2}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition resize-none"
                    placeholder="e.g. Monthly sales, inventory levels, customer orders…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect Sheets */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Connect your Google Sheets</h2>
              <p className="text-[#555] text-sm mb-5">Sign in with Google to give instant access — no manual sharing needed.</p>

              {/* Step 1: Connect Google account */}
              <div className={`border rounded-xl p-4 mb-3 ${googleConnected ? "border-[#00c853]/30 bg-[#00c853]/5" : "border-[#1e1e1e] bg-[#0a0a0a]"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${googleConnected ? "bg-[#00c853] text-black" : "bg-[#00c853]/20 border border-[#00c853]/40 text-[#00c853]"}`}>
                      {googleConnected ? "✓" : "1"}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {googleConnected ? "Google account connected" : "Connect your Google account"}
                    </span>
                  </div>
                  {googleConnected ? (
                    <span className="text-xs text-[#00c853] font-medium">Connected ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={openGoogleAuth}
                      disabled={connectingGoogle}
                      className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#111] text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-60 shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {connectingGoogle ? "Waiting…" : "Sign in with Google"}
                    </button>
                  )}
                </div>
                {!googleConnected && (
                  <p className="text-xs text-[#444] ml-7 mt-2">
                    We only request read access to your sheets. You can revoke at any time.
                  </p>
                )}
              </div>

              {/* Step 2: Paste sheet URL — only shown after Google connected */}
              {googleConnected && (
                <div className="border border-[#1e1e1e] bg-[#0a0a0a] rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${verifyResult?.ok ? "bg-[#00c853] text-black" : "bg-[#00c853]/20 border border-[#00c853]/40 text-[#00c853]"}`}>
                      {verifyResult?.ok ? "✓" : "2"}
                    </span>
                    <span className="text-sm font-semibold text-white">Paste your sheet link</span>
                  </div>
                  <p className="text-xs text-[#444] ml-7 mb-3">Copy the URL from your browser while the sheet is open.</p>
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => { setSheetUrl(e.target.value); setVerifyResult(null); setVerifyError(""); }}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />

                  {verifyError && (
                    <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2.5 rounded-xl mt-3 leading-relaxed">
                      {verifyError}
                    </div>
                  )}

                  {verifyResult?.ok ? (
                    <div className="bg-[#00c853]/5 border border-[#00c853]/20 rounded-xl p-3 mt-3">
                      <div className="flex items-center gap-2 text-[#00c853] font-semibold mb-1 text-sm">
                        ✓ {verifyResult.spreadsheetName || "Sheet"} connected
                      </div>
                      {verifyResult.tabs?.length > 0 && (
                        <p className="text-xs text-[#555]">
                          {verifyResult.tabs.length} tab{verifyResult.tabs.length !== 1 ? "s" : ""}: {verifyResult.tabs.map((t) => t.title).join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={verifying || !sheetUrl.trim()}
                      className="w-full mt-3 bg-[#00c853]/10 border border-[#00c853]/30 hover:bg-[#00c853]/20 text-[#00c853] font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {verifying ? "Connecting…" : "Connect this sheet →"}
                    </button>
                  )}
                </div>
              )}

              {slug && (
                <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-3 text-sm flex items-center gap-2">
                  <span className="text-[#333]">◈</span>
                  <span className="text-[#444]">Your portal:</span>
                  <span className="text-[#00c853] font-mono text-xs font-semibold">{slug}.reportude.com</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Legal Consent */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Data processing agreement</h2>
              <p className="text-[#555] text-sm mb-6">We need your consent to process your business data</p>

              <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-4 mb-6 text-sm text-[#555] space-y-3 max-h-48 overflow-y-auto">
                <p className="font-semibold text-white">Data Processing Terms v1.0</p>
                <p>By connecting your Google Sheets and using Reportude AI, you agree that:</p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>Reportude AI will read your spreadsheet data to generate insights and reports.</li>
                  <li>Your data is stored securely and is only accessible to you and your authorized team.</li>
                  <li>We do not sell, share, or use your data for training AI models without explicit consent.</li>
                  <li>You can request deletion of all your data at any time via Settings.</li>
                  <li>AI-generated reports may contain errors — always verify critical business decisions.</li>
                  <li>Write operations to your sheets require explicit confirmation before execution.</li>
                  <li>We log access for audit purposes and store logs for 90 days.</li>
                </ul>
                <p>This consent is version 1.0. We will notify you of any material changes.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox" checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#00c853] shrink-0"
                />
                <span className="text-sm text-[#888]">
                  I have read and agree to the Data Processing Terms. I authorize Reportude AI to access and analyze my connected spreadsheet data.
                </span>
              </label>
            </div>
          )}

          {/* Step 5: Go Live */}
          {step === 5 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-3xl mx-auto mb-6 animate-pulse">◈</div>
              <h2 className="text-xl font-bold text-white mb-3">You&apos;re all set!</h2>
              <p className="text-[#555] text-sm leading-relaxed mb-6">
                Your workspace is ready. Your AI agent is analyzing your data and preparing your first insights.
              </p>
              {slug && (
                <div className="bg-[#00c853]/5 border border-[#00c853]/20 rounded-xl p-3 text-sm mb-6">
                  <p className="text-[#555] mb-0.5">Your portal URL</p>
                  <p className="text-[#00c853] font-mono font-bold">{slug}.reportude.com</p>
                  <p className="text-[#444] text-xs mt-1">DNS propagation may take a few minutes</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => { setError(""); setStep((s) => s - 1); }}
                disabled={saving}
                className="text-sm text-[#555] hover:text-white transition disabled:opacity-50"
              >
                ← Back
              </button>
            ) : <div />}
            <button
              onClick={goNext}
              disabled={saving}
              className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : step === 5 ? "Enter Dashboard →" : step === 1 ? "Get started →" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
