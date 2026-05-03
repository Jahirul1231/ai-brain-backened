"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientSidebar from "../../components/ClientSidebar";
import { getMe } from "../../lib/api";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getMe()
      .then((data) => {
        // Redirect to onboarding if not complete
        if (!data.onboarding?.completed) {
          router.replace("/onboarding");
          return;
        }
        setMe(data);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <ClientSidebar tenant={me.tenant} />
      <main className="flex-1 min-w-0 text-white overflow-auto">
        {children}
      </main>
    </div>
  );
}
