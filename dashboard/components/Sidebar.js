"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getNotifications } from "../lib/api";

const NAV = [
  { href: "/dashboard",               label: "Overview",       icon: "◈" },
  { href: "/dashboard/brain",         label: "Master Brain",   icon: "◎" },
  { href: "/dashboard/agents",        label: "Agent Network",  icon: "⬡" },
  { href: "/dashboard/issues",        label: "Client Issues",  icon: "⚡" },
  { href: "/dashboard/customers",     label: "Onboarding",     icon: "◉" },
  { href: "/dashboard/trials",        label: "Trials & Sales", icon: "◈" },
  { href: "/dashboard/finance",       label: "Finance",        icon: "◇" },
  { href: "/dashboard/intel",         label: "Intelligence",   icon: "◎" },
  { href: "/dashboard/tenants",       label: "Tenants",        icon: "▣" },
];

const BOTTOM_NAV = [
  { href: "/dashboard/notifications", label: "Notifications",  icon: "◇", badge: true },
  { href: "/dashboard/settings",      label: "Settings",       icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getNotifications().then((d) => setUnread(d.unread || 0)).catch(() => {});
    const interval = setInterval(() => {
      getNotifications().then((d) => setUnread(d.unread || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => { localStorage.removeItem("token"); router.push("/login"); };

  const NavItem = ({ item }) => {
    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
    return (
      <Link href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#aaa] hover:bg-[#111]"}`}>
        <span className={`text-base ${active ? "text-[#00c853]" : "text-[#333]"}`}>{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.badge && unread > 0 && (
          <span className="bg-[#00c853] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-56 shrink-0 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-[#1e1e1e]">
        <div className="text-xs text-[#00c853] font-bold tracking-widest uppercase mb-1">Reportude AI</div>
        <div className="text-[#333] text-xs">Founder OS</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      <div className="px-3 py-3 border-t border-[#1e1e1e] space-y-0.5">
        {BOTTOM_NAV.map((item) => <NavItem key={item.href} item={item} />)}
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#333] hover:text-[#666] transition">
          <span className="text-base">→</span> Sign out
        </button>
      </div>
    </aside>
  );
}
