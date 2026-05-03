"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
  }, [router]);
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto h-screen">{children}</main>
    </div>
  );
}
