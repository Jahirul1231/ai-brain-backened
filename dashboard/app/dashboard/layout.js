"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
  }, [router]);
  return (
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
