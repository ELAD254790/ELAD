"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, Target, MessageSquare, TrendingUp, FolderOpen,
  Sparkles, Menu, X, ShieldCheck, Zap, RotateCcw, User, Eye, CalendarDays, BarChart2, BookOpen, GraduationCap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "ראשי",
    items: [
      { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
      { href: "/habits", label: "הרגלים", icon: CheckSquare },
      { href: "/goals", label: "מטרות", icon: Target },
    ],
  },
  {
    label: "ביצוע",
    items: [
      { href: "/focus", label: "מצב ריכוז", icon: Zap },
      { href: "/discipline", label: "ניקוד משמעת", icon: ShieldCheck },
      { href: "/recovery", label: "התאוששות", icon: RotateCcw },
    ],
  },
  {
    label: "עומק",
    items: [
      { href: "/identity", label: "דף זהות", icon: User },
      { href: "/goal-vision", label: "חזון מטרה", icon: Eye },
      { href: "/weekly-review", label: "סקירה שבועית", icon: BookOpen },
    ],
  },
  {
    label: "ניתוח וכלים",
    items: [
      { href: "/progress", label: "מדדי התקדמות", icon: TrendingUp },
      { href: "/advanced-analytics", label: "אנליטיקה מתקדמת", icon: BarChart2 },
      { href: "/calendar", label: "לוח שנה", icon: CalendarDays },
      { href: "/chat", label: "יועץ AI", icon: MessageSquare },
      { href: "/english", label: "מורה אנגלית", icon: GraduationCap },
      { href: "/files", label: "קבצים", icon: FolderOpen },
    ],
  },
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
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40 transform transition-transform duration-300 border-l border-gray-800",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">GrowthOS</h1>
              <p className="text-xs text-gray-500">פיתוח אישי חכם</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium",
                        active
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <Icon size={16} className={active ? "text-white" : ""} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer tip */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <div className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 rounded-xl p-3">
            <p className="text-xs font-semibold mb-1">💡 טיפ יומי</p>
            <p className="text-xs text-indigo-100 leading-relaxed">עקביות יומיומית עדיפה על מאמץ ספוראדי. 1% טוב יותר כל יום.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
