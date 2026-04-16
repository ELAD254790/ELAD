"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Target, TrendingUp, FolderOpen, Flame, Award, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  habits: { total: number; completedToday: number; completionRate: number };
  goals: { total: number; avgProgress: number };
  files: { total: number };
  recentProgress: Array<{ id: string; category: string; metric: string; value: number; date: string }>;
}

const motivationalQuotes = [
  "כל יום הוא הזדמנות להיות גרסה טובה יותר של עצמך.",
  "ההצלחה היא סכום של מאמצים קטנים שחוזרים על עצמם יום אחרי יום.",
  "אל תחכה לזמן הנכון. עשה את הזמן נכון.",
  "הדרך הטובה ביותר לניבוי העתיד היא ליצור אותו.",
  "הנסיעה של אלף קילומטרים מתחילה בצעד אחד.",
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "הרגלים שלמו היום",
      value: loading ? "..." : `${data?.habits.completedToday || 0}/${data?.habits.total || 0}`,
      sub: `${data?.habits.completionRate || 0}% השלמה`,
      icon: CheckSquare,
      color: "from-indigo-500 to-indigo-600",
      href: "/habits",
    },
    {
      label: "מטרות פעילות",
      value: loading ? "..." : `${data?.goals.total || 0}`,
      sub: `${data?.goals.avgProgress || 0}% התקדמות ממוצעת`,
      icon: Target,
      color: "from-violet-500 to-violet-600",
      href: "/goals",
    },
    {
      label: "מדדי התקדמות",
      value: loading ? "..." : `${data?.recentProgress.length || 0}`,
      sub: "רשומות שבועיות",
      icon: TrendingUp,
      color: "from-emerald-500 to-emerald-600",
      href: "/progress",
    },
    {
      label: "קבצים שמורים",
      value: loading ? "..." : `${data?.files.total || 0}`,
      sub: "מסמכים ומשאבים",
      icon: FolderOpen,
      color: "from-amber-500 to-amber-600",
      href: "/files",
    },
  ];

  const quickActions = [
    { label: "הוסף הרגל", href: "/habits", icon: CheckSquare, color: "bg-indigo-600 hover:bg-indigo-500" },
    { label: "הגדר מטרה", href: "/goals", icon: Target, color: "bg-violet-600 hover:bg-violet-500" },
    { label: "שאל את ה-AI", href: "/chat", icon: Zap, color: "bg-emerald-600 hover:bg-emerald-500" },
    { label: "העלה קובץ", href: "/files", icon: FolderOpen, color: "bg-amber-600 hover:bg-amber-500" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-3xl">👋</div>
          <div>
            <h1 className="text-3xl font-bold text-white">{greeting}!</h1>
            <p className="text-gray-400 text-sm mt-1">הנה סיכום ההתקדמות שלך היום</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl mt-0.5">✨</div>
            <p className="text-gray-300 italic text-sm leading-relaxed">&quot;{quote}&quot;</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="glass rounded-2xl p-5 hover:scale-[1.02] transition-all duration-200 cursor-pointer group">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                  <Icon size={20} className="text-white" />
                </div>
                <p className="text-gray-400 text-xs font-medium mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
                <div className="flex items-center gap-1 mt-3 text-indigo-400 text-xs group-hover:gap-2 transition-all">
                  <span>צפה עוד</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {data && data.habits.total > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-orange-400" />
              <h2 className="font-semibold text-white">השלמת הרגלים היום</h2>
            </div>
            <span className="text-sm font-bold text-orange-400">{data.habits.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700"
              style={{ width: `${data.habits.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {data.habits.completedToday} מתוך {data.habits.total} הרגלים הושלמו
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-yellow-400" />
          <h2 className="font-semibold text-white">פעולות מהירות</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <button className={`w-full ${action.color} text-white rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]`}>
                  <Icon size={16} />
                  {action.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      {data && data.recentProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-emerald-400" />
            <h2 className="font-semibold text-white">פעילות אחרונה</h2>
          </div>
          <div className="space-y-2">
            {data.recentProgress.slice(0, 5).map((entry) => (
              <div key={entry.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white">{entry.metric}</span>
                  <span className="text-xs text-gray-500 mr-2">• {entry.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">{entry.value}</span>
                  <span className="text-xs text-gray-600">{entry.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
