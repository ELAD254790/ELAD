"use client";

import { useEffect, useState } from "react";
import { Plus, Flame, Check, Trash2, X, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import { getTodayString, getStreakCount } from "@/lib/utils";

interface HabitLog {
  id: string;
  date: string;
  completed: boolean;
  note?: string;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  logs: HabitLog[];
}

const CATEGORIES = [
  { value: "health", label: "בריאות", emoji: "🏥" },
  { value: "fitness", label: "כושר", emoji: "💪" },
  { value: "mindfulness", label: "מיינדפולנס", emoji: "🧘" },
  { value: "learning", label: "למידה", emoji: "📚" },
  { value: "career", label: "קריירה", emoji: "💼" },
  { value: "relationships", label: "מערכות יחסים", emoji: "❤️" },
  { value: "finance", label: "כספים", emoji: "💰" },
  { value: "personal", label: "אישי", emoji: "⭐" },
  { value: "general", label: "כללי", emoji: "✅" },
];

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#14b8a6", "#3b82f6",
];

const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const getDayLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", { weekday: "short" });
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "general", color: "#6366f1" });
  const today = getTodayString();
  const last7Days = getLast7Days();

  const fetchHabits = async () => {
    const res = await fetch("/api/habits");
    const data = await res.json();
    setHabits(data);
    setLoading(false);
  };

  useEffect(() => { fetchHabits(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const url = editingHabit ? `/api/habits/${editingHabit.id}` : "/api/habits";
    const method = editingHabit ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingHabit(null);
    setForm({ name: "", description: "", category: "general", color: "#6366f1" });
    fetchHabits();
  };

  const toggleLog = async (habitId: string) => {
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    if (!confirm("למחוק את ההרגל?")) return;
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    fetchHabits();
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setForm({ name: habit.name, description: habit.description || "", category: habit.category, color: habit.color });
    setShowForm(true);
  };

  const completedToday = habits.filter((h) => h.logs.some((l) => l.date === today && l.completed)).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">הרגלים שלי</h1>
          <p className="text-gray-400 text-sm mt-1">
            {completedToday}/{habits.length} הושלמו היום
          </p>
        </div>
        <button
          onClick={() => { setEditingHabit(null); setForm({ name: "", description: "", category: "general", color: "#6366f1" }); setShowForm(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          הרגל חדש
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingHabit ? "עריכת הרגל" : "הרגל חדש"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">שם ההרגל *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="לדוג׳: שתיית מים, ריצה בוקר..."
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">תיאור (אופציונלי)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="פרט את ההרגל..."
                  rows={2}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">קטגוריה</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.value })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${form.category === cat.value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">צבע</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === color ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  {editingHabit ? "עדכן" : "שמור"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && habits.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-gray-400 text-lg mb-2">אין הרגלים עדיין</p>
          <p className="text-gray-600 text-sm mb-6">התחל לעקוב אחר ההרגלים שלך לשיפור עצמי</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            הוסף הרגל ראשון
          </button>
        </div>
      )}

      {/* Habits list */}
      <div className="space-y-3">
        {habits.map((habit) => {
          const completedTodayBool = habit.logs.some((l) => l.date === today && l.completed);
          const streak = getStreakCount(habit.logs);
          const cat = CATEGORIES.find((c) => c.value === habit.category);

          return (
            <div key={habit.id} className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all group">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleLog(habit.id)}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                    completedTodayBool
                      ? "border-transparent text-white scale-105"
                      : "border-gray-600 hover:border-gray-400"
                  }`}
                  style={completedTodayBool ? { backgroundColor: habit.color } : {}}
                >
                  {completedTodayBool && <Check size={18} strokeWidth={3} />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-base ${completedTodayBool ? "text-gray-400 line-through" : "text-white"}`}>
                      {habit.name}
                    </span>
                    {cat && <span className="text-xs text-gray-500">{cat.emoji} {cat.label}</span>}
                  </div>
                  {habit.description && <p className="text-xs text-gray-500 mb-2">{habit.description}</p>}

                  {/* Last 7 days */}
                  <div className="flex gap-1 mt-2">
                    {last7Days.map((day) => {
                      const log = habit.logs.find((l) => l.date === day);
                      const done = log?.completed;
                      const isToday = day === today;
                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                              done
                                ? "text-white"
                                : isToday
                                ? "bg-gray-700 border border-dashed border-gray-500"
                                : "bg-gray-800 border border-gray-700"
                            }`}
                            style={done ? { backgroundColor: habit.color } : {}}
                          >
                            {done ? <Check size={12} /> : ""}
                          </div>
                          <span className="text-gray-600" style={{ fontSize: "9px" }}>{getDayLabel(day)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Streak & actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {streak > 0 && (
                    <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg">
                      <Flame size={12} />
                      <span className="text-xs font-bold">{streak}</span>
                    </div>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => openEdit(habit)} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteHabit(habit.id)} className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-gray-700 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
