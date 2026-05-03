"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      localStorage.setItem("token", data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#00c853]/10 border border-[#00c853]/20 text-[#00c853] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            Reportude AI
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
          <p className="text-[#555] text-sm mt-1">Sign in to your client portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Email</label>
            <input
              type="email" required autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Password</label>
            <input
              type="password" required autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-[#555] hover:text-[#00c853] transition">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#00c853] hover:bg-[#00b248] text-black font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-[#444] mt-6">
          New to Reportude?{" "}
          <Link href="/register" className="text-[#00c853] hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
