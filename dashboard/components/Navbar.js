"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };
  return (
    <nav className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-extrabold text-lg">AI Brain</span>
        <Link href="/dashboard" className="text-sm text-[#888] hover:text-white transition">Overview</Link>
        <Link href="/dashboard/tenants" className="text-sm text-[#888] hover:text-white transition">Tenants</Link>
      </div>
      <button onClick={logout} className="text-xs text-[#666] hover:text-white transition">Sign out</button>
    </nav>
  );
}
