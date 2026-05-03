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
  const [verifyResult, setVerifyResult] = useState(null); // { ok, tabs, spreadsheetId, not_configured }
  const [verifyError, setVerifyError] = useState("");
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  const [copied, setCopied] = useState(false);
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
        if (data.serviceAccountEmail) setServiceAccountEmail(data.serviceAccountEmail);
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

  const handleVerify = async () => {
    if (!sheetUrl.trim()) return setVerifyError("Please paste your Google Sheet URL");
    setVerifying(true);
    setVerifyError("");
    setVerifyResult(null);
    try {
      const result = await verifySheet(sheetUrl.trim());
      if (result.not_configured) {
        // Service account not configured — allow manual save
        const saved = await addSheet(sheetUrl.trim(), "My Spreadsheet", 0);
        setVerifyResult({ ok: true, manual: true, spreadsheetId: result.spreadsheetId, tabs: [] });
      } else {
        // Verified — save with real spreadsheet title and tab info
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

  const copyEmail = () => {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      if (!verifyResult) return setError("Please verify your spreadsheet before continuing");
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
              <h2 className="text-xl font-bold text-white mb-1">Add your data</h2>
              <p className="text-[#555] text-sm mb-5">
                Just like adding a teammate to your sheet — takes 30 seconds.
              </p>

              {/* Step 1: Invite AI as viewer */}
              {serviceAccountEmail && (
                <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#00c853]/20 border border-[#00c853]/40 text-[#00c853] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <span className="text-sm font-semibold text-white">Invite the AI as a viewer</span>
                  </div>
                  <p className="text-xs text-[#444] ml-7 mb-3">
                    Open your Google Sheet → click <strong className="text-[#666]">Share</strong> → paste this email → keep role as <strong className="text-[#666]">Viewer</strong> → click Send.
                  </p>
                  <div className="ml-7 flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
                    <span className="text-[#00c853] font-mono text-xs flex-1 break-all select-all">{serviceAccountEmail}</span>
                    <button
                      type="button"
                      onClick={copyEmail}
                      className={`text-xs shrink-0 border px-2.5 py-1 rounded-md transition font-medium ${copied ? "border-[#00c853]/40 text-[#00c853]" : "border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]"}`}
                    >
                      {copied ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-[#333] ml-7 mt-2">
                    Think of it as inviting a read-only assistant — it can only see, not edit.
                  </p>
                </div>
              )}

              {/* Step 2: Paste link */}
              <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#00c853]/20 border border-[#00c853]/40 text-[#00c853] text-xs flex items-center justify-center font-bold shrink-0">
                    {serviceAccountEmail ? "2" : "1"}
                  </span>
                  <span className="text-sm font-semibold text-white">Paste your sheet link</span>
                </div>
                <p className="text-xs text-[#444] ml-7 mb-2">Copy the URL from your browser while the sheet is open.</p>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => { setSheetUrl(e.target.value); setVerifyResult(null); setVerifyError(""); }}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              {/* Error */}
              {verifyError && (
                <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2.5 rounded-xl mb-3 leading-relaxed">
                  {verifyError}
                  {verifyError.includes("share") && (
                    <p className="text-xs text-red-300/70 mt-1">
                      Make sure you shared with the exact email above and clicked Send in Google Sheets.
                    </p>
                  )}
                </div>
              )}

              {/* Success */}
              {verifyResult?.ok && (
                <div className="bg-[#00c853]/5 border border-[#00c853]/20 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 text-[#00c853] font-semibold mb-1">
                    <span className="text-base">✓</span>
                    <span className="text-sm">Your data is connected!</span>
                  </div>
                  {verifyResult.tabs?.length > 0 ? (
                    <p className="text-xs text-[#555]">
                      Found <strong className="text-[#888]">{verifyResult.tabs.length} sheet{verifyResult.tabs.length !== 1 ? "s" : ""}</strong>: {verifyResult.tabs.map((t) => t.title).join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-[#555]">Sheet saved — your AI can now read your data.</p>
                  )}
                </div>
              )}

              {/* Connect button */}
              {!verifyResult?.ok && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying || !sheetUrl.trim()}
                  className="w-full bg-[#00c853]/10 border border-[#00c853]/30 hover:bg-[#00c853]/20 text-[#00c853] font-semibold py-3 rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed mb-3"
                >
                  {verifying ? "Checking access…" : "Connect my sheet →"}
                </button>
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
