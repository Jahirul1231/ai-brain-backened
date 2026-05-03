"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Supabase handles password reset via email
    try {
      await fetch("/api/proxy/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            Reportude AI
          </div>
          <h1 className="text-2xl font-extrabold text-white">Reset password</h1>
          <p className="text-[#555] text-sm mt-1">We&apos;ll send you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">◎</div>
            <p className="text-white font-semibold mb-1">Check your inbox</p>
            <p className="text-[#555] text-sm">If an account exists for <span className="text-white">{email}</span>, you&apos;ll receive a reset link shortly.</p>
            <Link href="/login" className="mt-4 inline-block text-[#00c853] text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Email address</label>
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#00c853] hover:bg-[#00b248] text-black font-bold py-3 rounded-xl text-sm transition disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#444] mt-6">
          <Link href="/login" className="text-[#00c853] hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
