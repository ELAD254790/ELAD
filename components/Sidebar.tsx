"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  MessageSquare,
  TrendingUp,
  FolderOpen,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/habits", label: "הרגלים", icon: CheckSquare },
  { href: "/goals", label: "מטרות", icon: Target },
  { href: "/chat", label: "יועץ AI", icon: MessageSquare },
  { href: "/progress", label: "התקדמות", icon: TrendingUp },
  { href: "/files", label: "קבצים", icon: FolderOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 right-4 z-50 md:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40 transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">GrowthOS</h1>
              <p className="text-xs text-gray-400">פיתוח אישי חכם</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={18} />
                <span>{label}</span>
                {active && (
                  <div className="mr-auto w-2 h-2 bg-white rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4">
            <p className="text-xs font-semibold mb-1">💡 טיפ יומי</p>
            <p className="text-xs text-indigo-100">
              עקביות יומיומית עדיפה על מאמץ ספוראדי. 1% טוב יותר כל יום.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
