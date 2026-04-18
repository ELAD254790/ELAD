"use client";
import { useEffect, useState } from "react";
import { BarChart2, Loader2, TrendingUp, Target, CheckSquare, FolderOpen } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Analytics { totalHabits: number; completionRate: number; activeGoals: number; completedGoals: number; avgProgress: number; progressEntries: number; }
interface ProgressEntry { id: string; date: string; category: string; metric: string; value: number; }
interface DisciplineSummary { dailyScore: number; completionScore: number; consistencyScore: number; penalties: number; categoryScores: Record<string, number>; }
interface DayScore { date: string; score: number; }

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];

export default function AdvancedAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [discipline, setDiscipline] = useState<{ summary: DisciplineSummary; weekly: DayScore[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/discipline").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ]).then(([prog, disc, dash]) => {
      setProgress(prog);
      setDiscipline(disc);
      setAnalytics({
        totalHabits: dash.habits.total,
        completionRate: dash.habits.completionRate,
        activeGoals: dash.goals.total,
        completedGoals: 0,
        avgProgress: dash.goals.avgProgress,
        progressEntries: prog.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const categoryData = Object.entries(discipline?.summary.categoryScores || {}).map(([name, value]) => ({ name, value }));
  const weeklyData = (discipline?.weekly || []).map((d) => ({ date: d.date.slice(5), score: d.score }));

  const statCards = analytics ? [
    { label: "הרגלים פעילים", value: analytics.totalHabits, icon: CheckSquare, color: "text-indigo-400" },
    { label: "השלמה היום", value: `${analytics.completionRate}%`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "מטרות פעילות", value: analytics.activeGoals, icon: Target, color: "text-violet-400" },
    { label: "רשומות מדדים", value: analytics.progressEntries, icon: FolderOpen, color: "text-amber-400" },
  ] : [];

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 size={36} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3"><BarChart2 className="text-indigo-400" size={28} />אנליטיקה מתקדמת</h1>
        <p className="text-gray-400 text-sm mt-2">תמונה כוללת של כל ההתקדמות שלך.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass rounded-2xl p-5">
              <Icon size={20} className={`${card.color} mb-3`} />
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">ניקוד משמעת שבועי</h2>
          {weeklyData.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">אין נתונים עדיין</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData}>
                <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "12px", color: "#f9fafb" }} />
                <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#scoreGrad)" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">ניקוד לפי קטגוריה</h2>
          {categoryData.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">אין נתונים עדיין</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "12px", color: "#f9fafb" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {progress.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">מדדי התקדמות — רשומות אחרונות</h2>
          <div className="space-y-2">
            {progress.slice(-10).reverse().map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <span className="text-sm font-medium text-white">{e.metric}</span>
                  <span className="text-xs text-gray-500 mr-2">• {e.category}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold text-sm">{e.value}</span>
                  <span className="text-xs text-gray-600">{e.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
