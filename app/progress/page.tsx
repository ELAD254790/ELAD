"use client";

import { useEffect, useState } from "react";
import { Plus, TrendingUp, X, BarChart2, Activity } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { getTodayString } from "@/lib/utils";

interface ProgressEntry {
  id: string;
  date: string;
  category: string;
  metric: string;
  value: number;
  note?: string;
}

const METRICS_BY_CATEGORY: Record<string, string[]> = {
  fitness: ["ק\"מ ריצה", "משקל (ק\"ג)", "כושר יחידות", "צעדים יומיים", "זמן אימון (דק)"],
  health: ["שעות שינה", "כוסות מים", "דופק מנוחה", "לחץ דם"],
  learning: ["שעות לימוד", "עמודים קראתי", "קורסים הושלמו", "מיומנויות חדשות"],
  mindfulness: ["דקות מדיטציה", "רמת סטרס (1-10)", "רמת אנרגיה (1-10)", "מצב רוח (1-10)"],
  finance: ["חיסכון (₪)", "הוצאות (₪)", "הכנסה (₪)"],
  career: ["משימות הושלמו", "שעות עבודה", "מפגשים", "לידים"],
};

const CATEGORIES = [
  { value: "fitness", label: "כושר", emoji: "💪", color: "#f59e0b" },
  { value: "health", label: "בריאות", emoji: "🏥", color: "#10b981" },
  { value: "learning", label: "למידה", emoji: "📚", color: "#3b82f6" },
  { value: "mindfulness", label: "מיינדפולנס", emoji: "🧘", color: "#8b5cf6" },
  { value: "finance", label: "כספים", emoji: "💰", color: "#14b8a6" },
  { value: "career", label: "קריירה", emoji: "💼", color: "#ef4444" },
];

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];

export default function ProgressPage() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("fitness");
  const [form, setForm] = useState({ date: getTodayString(), category: "fitness", metric: "", value: "", note: "" });

  const fetchEntries = async () => {
    const res = await fetch("/api/progress");
    const data = await res.json();
    setEntries(data);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: parseFloat(form.value) }),
    });
    setShowForm(false);
    setForm({ date: getTodayString(), category: "fitness", metric: "", value: "", note: "" });
    fetchEntries();
  };

  // Group entries by metric for charts
  const filteredEntries = entries.filter((e) => e.category === selectedCategory);
  const metrics = [...new Set(filteredEntries.map((e) => e.metric))];

  const chartData = filteredEntries.reduce((acc, entry) => {
    const existing = acc.find((d) => d.date === entry.date);
    if (existing) {
      existing[entry.metric] = entry.value;
    } else {
      acc.push({ date: entry.date, [entry.metric]: entry.value });
    }
    return acc;
  }, [] as Record<string, unknown>[]).sort((a, b) => (a.date as string).localeCompare(b.date as string));

  // Weekly summary
  const last7 = entries.filter((e) => {
    const d = new Date(e.date);
    const week = new Date();
    week.setDate(week.getDate() - 7);
    return d >= week;
  });

  const categorySummary = CATEGORIES.map((cat) => {
    const catEntries = last7.filter((e) => e.category === cat.value);
    return {
      ...cat,
      count: catEntries.length,
      avg: catEntries.length > 0 ? (catEntries.reduce((s, e) => s + e.value, 0) / catEntries.length).toFixed(1) : "0",
    };
  }).filter((c) => c.count > 0);

  const selectedCat = CATEGORIES.find((c) => c.value === selectedCategory);
  const availableMetrics = METRICS_BY_CATEGORY[form.category] || [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">התקדמות שלי</h1>
          <p className="text-gray-400 text-sm mt-1">עקוב אחר המדדים שלך לאורך זמן</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          הוסף מדד
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">הוסף מדד</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">תאריך</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">קטגוריה</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.value, metric: "" })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${form.category === cat.value ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">מדד</label>
                <div className="space-y-2">
                  <select
                    value={form.metric}
                    onChange={(e) => setForm({ ...form, metric: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">בחר מדד...</option>
                    {availableMetrics.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="custom">הכנס מדד מותאם...</option>
                  </select>
                  {form.metric === "custom" && (
                    <input
                      type="text"
                      placeholder="שם המדד"
                      onChange={(e) => setForm({ ...form, metric: e.target.value })}
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ערך</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="הכנס ערך מספרי"
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">הערה</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="הערה אופציונלית..."
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 text-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-700">
                  ביטול
                </button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-sm font-medium">
                  שמור
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weekly summary cards */}
      {categorySummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          {categorySummary.map((cat) => (
            <div key={cat.value} className="glass rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{cat.emoji}</div>
              <p className="text-xs text-gray-400 mb-1">{cat.label}</p>
              <p className="text-lg font-bold text-white">{cat.count}</p>
              <p className="text-xs text-gray-500">רשומות</p>
            </div>
          ))}
        </div>
      )}

      {/* Category selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => {
          const hasData = entries.some((e) => e.category === cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.value
                  ? "text-white scale-105"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              } ${!hasData ? "opacity-50" : ""}`}
              style={selectedCategory === cat.value ? { backgroundColor: cat.color } : {}}
            >
              {cat.emoji} {cat.label}
              {hasData && <span className="text-xs opacity-70">({entries.filter((e) => e.category === cat.value).length})</span>}
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      {filteredEntries.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BarChart2 size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">אין נתונים ל{selectedCat?.label}</p>
          <p className="text-gray-600 text-sm mb-4">הוסף מדדים כדי לראות גרפים</p>
          <button onClick={() => setShowForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-500">
            הוסף מדד ראשון
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {metrics.map((metric, idx) => {
            const metricData = chartData.filter((d) => d[metric] !== undefined);
            const values = metricData.map((d) => d[metric] as number);
            const latest = values[values.length - 1];
            const prev = values[values.length - 2];
            const trend = prev !== undefined ? ((latest - prev) / prev * 100).toFixed(1) : null;
            const color = CHART_COLORS[idx % CHART_COLORS.length];

            return (
              <div key={metric} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-white text-lg">{metric}</h3>
                    <p className="text-xs text-gray-500">{selectedCat?.emoji} {selectedCat?.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{latest?.toFixed(1)}</p>
                    {trend !== null && (
                      <p className={`text-xs font-medium ${parseFloat(trend) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {parseFloat(trend) >= 0 ? "↑" : "↓"} {Math.abs(parseFloat(trend))}%
                      </p>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metricData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`gradient_${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "12px", color: "#f9fafb" }}
                    />
                    <Area type="monotone" dataKey={metric} stroke={color} fill={`url(#gradient_${idx})`} strokeWidth={2} dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}

          {/* Recent entries table */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-emerald-400" />
              <h3 className="font-bold text-white">רשומות אחרונות</h3>
            </div>
            <div className="space-y-2">
              {filteredEntries.slice(-10).reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-white">{entry.metric}</span>
                    {entry.note && <span className="text-xs text-gray-500 mr-2">• {entry.note}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400 font-bold text-sm">{entry.value}</span>
                    <span className="text-xs text-gray-600">{entry.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
