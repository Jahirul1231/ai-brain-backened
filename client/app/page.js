"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: "◎",
    title: "AI Chat",
    desc: "Ask anything about your spreadsheet data in plain English. Get instant answers, summaries, and deep insights without writing a single formula.",
  },
  {
    icon: "⬡",
    title: "Smart Reports",
    desc: "Generate detailed business reports on demand. Choose your format — inline table, Google Sheet, or text — and get it delivered to your email.",
  },
  {
    icon: "◈",
    title: "Sheet Automation",
    desc: "AI reads and writes directly to your Google Sheets. Ask it to update rows, append new data, create tabs, or restructure your data.",
  },
  {
    icon: "◉",
    title: "Live Data Updates",
    desc: "Stay on top of what changes. AI monitors your sheets and surfaces the numbers that actually need your attention.",
  },
  {
    icon: "◇",
    title: "Multi-Sheet Queries",
    desc: "Connect multiple spreadsheets and ask questions across all your data at once. AI combines sources and gives you one clean answer.",
  },
  {
    icon: "⬡",
    title: "AI Agent Team",
    desc: "Zahi (COO), Support, Data, and Report agents work together to handle your operations — answering questions, filing tickets, generating briefs.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect your Google Sheet",
    desc: "Link any spreadsheet in seconds via Google OAuth. Your data stays in Google — we just read and act on it.",
  },
  {
    n: "02",
    title: "Ask in plain English",
    desc: "Type questions like you'd ask a colleague. \"What were my top 5 products last month?\" and the AI pulls the answer from your sheet.",
  },
  {
    n: "03",
    title: "Get reports & automation",
    desc: "Generate reports, update cells, append rows — all from a single chat. The AI agents act on your instructions directly.",
  },
];

const AGENTS = [
  {
    icon: "◎",
    name: "Zahi",
    role: "COO Agent",
    desc: "Coordinates your entire AI team. Surfaces what matters, gives executive briefings, and routes tasks to the right agent.",
  },
  {
    icon: "⬡",
    name: "Sigma",
    role: "Data Agent",
    desc: "Analyses trends, spots anomalies, and generates insights from your spreadsheet data on demand.",
  },
  {
    icon: "◇",
    name: "Aria",
    role: "Support Agent",
    desc: "Handles support tickets, drafts responses, and escalates critical issues — so nothing falls through the cracks.",
  },
  {
    icon: "◈",
    name: "Nova",
    role: "Report Agent",
    desc: "Generates professional reports on demand and delivers them directly to your inbox, formatted and ready to share.",
  },
];

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("token"));
  }, []);

  return (
    <div className="min-h-screen bg-[#000] text-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#000]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#00c853] text-lg">◈</span>
            <span className="font-extrabold text-white tracking-tight">Reportude</span>
          </div>
          <div className="flex items-center gap-3">
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold text-sm px-4 py-2 rounded-xl transition"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-[#555] hover:text-white transition">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-[#00c853] hover:bg-[#00b248] text-black font-bold text-sm px-4 py-2 rounded-xl transition"
                >
                  Start free →
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
          Now powered by Claude AI
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
          Your Google Sheets,
          <br />
          <span className="text-[#00c853]">now intelligent.</span>
        </h1>

        <p className="text-[#555] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Connect your spreadsheets and let AI agents read, analyse, update,
          and report on your data — in plain English. No formulas. No analysts. No waiting.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/register"
            className="bg-[#00c853] hover:bg-[#00b248] text-black font-extrabold text-base px-7 py-3.5 rounded-2xl transition w-full sm:w-auto text-center"
          >
            Start free trial →
          </Link>
          <Link
            href="/login"
            className="border border-[#2a2a2a] hover:border-[#444] text-[#888] hover:text-white text-base px-7 py-3.5 rounded-2xl transition w-full sm:w-auto text-center"
          >
            Sign in
          </Link>
        </div>

        <p className="text-[#333] text-xs tracking-widest uppercase">
          500 free tokens · No credit card · 7-day trial
        </p>
      </section>

      {/* ── Dashboard preview strip ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-6 overflow-hidden">
          {/* Fake browser chrome */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-[#1e1e1e]" />
            <div className="w-3 h-3 rounded-full bg-[#1e1e1e]" />
            <div className="w-3 h-3 rounded-full bg-[#1e1e1e]" />
            <div className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-1 ml-2">
              <span className="text-[#333] text-xs font-mono">app.reportude.com/dashboard/chat</span>
            </div>
          </div>
          {/* Mock chat UI */}
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
                What were my top 5 products by revenue last month?
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] text-xs shrink-0">◎</div>
              <div className="bg-[#111] border border-[#1e1e1e] text-[#ddd] text-sm px-4 py-3 rounded-2xl rounded-tl-sm max-w-sm">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] px-2 py-0.5 rounded-full font-mono">read_sheet</span>
                  <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] px-2 py-0.5 rounded-full font-mono">list_sheets</span>
                </div>
                Here are your top 5 products for last month:
                <div className="mt-2 space-y-1 text-xs text-[#888]">
                  <div className="flex justify-between"><span>◈ Product A</span><span className="text-[#00c853]">₹1,24,500</span></div>
                  <div className="flex justify-between"><span>◈ Product B</span><span className="text-[#00c853]">₹98,200</span></div>
                  <div className="flex justify-between"><span>◈ Product C</span><span className="text-[#00c853]">₹76,800</span></div>
                  <div className="flex justify-between"><span>◈ Product D</span><span className="text-[#00c853]">₹54,100</span></div>
                  <div className="flex justify-between"><span>◈ Product E</span><span className="text-[#00c853]">₹43,300</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
                Update Product A price to ₹1,399 in the sheet
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] text-xs shrink-0">◎</div>
              <div className="bg-[#111] border border-[#1e1e1e] text-[#ddd] text-sm px-4 py-3 rounded-2xl rounded-tl-sm max-w-sm">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] px-2 py-0.5 rounded-full font-mono">update_range</span>
                </div>
                Done. Cell B4 in <span className="text-[#00c853]">Products</span> updated to ₹1,399.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-[#00c853] text-xs font-bold tracking-widest uppercase mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Three steps to smarter sheets</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-6">
              <div className="text-[#00c853] font-mono text-xs font-bold tracking-widest mb-4">{s.n}</div>
              <h3 className="text-white font-extrabold text-lg mb-2">{s.title}</h3>
              <p className="text-[#555] text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-[#00c853] text-xs font-bold tracking-widest uppercase mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Everything your data needs</h2>
          <p className="text-[#555] text-base mt-3 max-w-xl mx-auto">
            One platform that turns your Google Sheets into a full business intelligence workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-6 hover:border-[#2a2a2a] transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] mb-4 group-hover:bg-[#00c853]/15 transition">
                {f.icon}
              </div>
              <h3 className="font-extrabold text-white mb-2">{f.title}</h3>
              <p className="text-[#555] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agents ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-[#00c853] text-xs font-bold tracking-widest uppercase mb-3">AI Agent Team</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Meet your AI team</h2>
          <p className="text-[#555] text-base mt-3 max-w-xl mx-auto">
            A dedicated team of AI agents — each with a speciality — working together to run your data operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS.map((a) => (
            <div
              key={a.name}
              className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#2a2a2a] transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#00c853]/10 border border-[#00c853]/20 flex items-center justify-center text-[#00c853] text-sm">
                  {a.icon}
                </div>
                <div>
                  <div className="font-extrabold text-white text-sm">{a.name}</div>
                  <div className="text-[#00c853] text-[10px] font-bold tracking-widest uppercase">{a.role}</div>
                </div>
              </div>
              <p className="text-[#555] text-xs leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-3xl px-8 py-16 text-center relative overflow-hidden">
          {/* Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-[#00c853]/5 rounded-full blur-3xl" />
          </div>

          <p className="text-[#00c853] text-xs font-bold tracking-widest uppercase mb-4 relative">Get started today</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 relative">
            Ready to transform
            <br />
            your spreadsheets?
          </h2>
          <p className="text-[#555] text-base mb-8 max-w-lg mx-auto relative">
            Start your free trial today. 500 AI tokens included — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative">
            <Link
              href="/register"
              className="bg-[#00c853] hover:bg-[#00b248] text-black font-extrabold text-base px-8 py-3.5 rounded-2xl transition w-full sm:w-auto text-center"
            >
              Get started free →
            </Link>
            <Link
              href="/login"
              className="border border-[#2a2a2a] hover:border-[#444] text-[#888] hover:text-white text-base px-8 py-3.5 rounded-2xl transition w-full sm:w-auto text-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1a1a] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#00c853]">◈</span>
            <span className="font-extrabold text-white text-sm">Reportude</span>
          </div>
          <p className="text-[#333] text-xs">© {new Date().getFullYear()} Reportude. All rights reserved.</p>
          <Link href="/login" className="text-[#444] hover:text-[#00c853] text-xs transition">
            Client Login →
          </Link>
        </div>
      </footer>

    </div>
  );
}
