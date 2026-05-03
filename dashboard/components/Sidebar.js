"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◈", live: true },
  { href: "/dashboard/brain", label: "Master Brain", icon: "◎", live: true },
  { href: "/dashboard/agents", label: "Agent Network", icon: "⬡", live: true },
  { href: "/dashboard/issues", label: "Client Issues", icon: "⚡", live: true },
  { href: "/dashboard/customers", label: "Onboarding", icon: "◉", live: true },
  { href: "/dashboard/trials", label: "Trials & Sales", icon: "◈", live: true },
  { href: "/dashboard/finance", label: "Finance", icon: "◇", live: true },
  { href: "/dashboard/intel", label: "Intelligence", icon: "◎", live: true },
  { href: "/dashboard/tenants", label: "Tenants", icon: "▣", live: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <aside className="w-56 shrink-0 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-[#1e1e1e]">
        <div className="text-xs text-[#00c853] font-bold tracking-widest uppercase mb-1">Reportude AI</div>
        <div className="text-[#444] text-xs">Founder OS</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <div key={item.href}>
              {item.live ? (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    active
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#666] hover:text-[#aaa] hover:bg-[#111]"
                  }`}
                >
                  <span className="text-[#00c853] text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#333] cursor-default">
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                  <span className="ml-auto text-[10px] text-[#2a2a2a] border border-[#222] rounded px-1">soon</span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#1e1e1e]">
        <button onClick={logout} className="text-xs text-[#444] hover:text-[#888] transition w-full text-left">
          Sign out
        </button>
      </div>
    </aside>
  );
}
