"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, login } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      // Auto-login after registration
      const session = await login(form.email, form.password);
      localStorage.setItem("token", session.accessToken);
      router.push("/onboarding");
    } catch (err) {
      setError(err.message || "Registration failed");
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
          <h1 className="text-2xl font-extrabold text-white">Create your account</h1>
          <p className="text-[#555] text-sm mt-1">Start your AI data journey</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Business / Your Name</label>
            <input
              type="text" required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="Acme Corp"
            />
          </div>
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
              type="password" required autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1.5 font-medium uppercase tracking-wider">Confirm Password</label>
            <input
              type="password" required autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00c853]/50 transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#00c853] hover:bg-[#00b248] text-black font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-xs text-[#444]">
            By creating an account you agree to our{" "}
            <span className="text-[#00c853]">Terms of Service</span> and{" "}
            <span className="text-[#00c853]">Privacy Policy</span>
          </p>
        </form>

        <p className="text-center text-sm text-[#444] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#00c853] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
