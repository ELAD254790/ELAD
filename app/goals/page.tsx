"use client";

import { useEffect, useState } from "react";
import { Plus, Target, Trash2, X, Edit2, CheckCircle, Circle, ChevronDown, ChevronUp, Calendar } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  targetDate?: string;
  progress: number;
  status: string;
  priority: string;
  color: string;
  milestones: Milestone[];
  createdAt: string;
}

const CATEGORIES = [
  { value: "personal", label: "אישי", emoji: "⭐" },
  { value: "career", label: "קריירה", emoji: "💼" },
  { value: "health", label: "בריאות", emoji: "🏥" },
  { value: "fitness", label: "כושר", emoji: "💪" },
  { value: "learning", label: "למידה", emoji: "📚" },
  { value: "finance", label: "כספים", emoji: "💰" },
  { value: "relationships", label: "מערכות יחסים", emoji: "❤️" },
  { value: "mindfulness", label: "מיינדפולנס", emoji: "🧘" },
];

const PRIORITIES = [
  { value: "high", label: "גבוהה", color: "text-red-400 bg-red-400/10" },
  { value: "medium", label: "בינונית", color: "text-yellow-400 bg-yellow-400/10" },
  { value: "low", label: "נמוכה", color: "text-green-400 bg-green-400/10" },
];

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#14b8a6", "#3b82f6"];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", category: "personal",
    targetDate: "", priority: "medium", color: "#6366f1",
    milestones: [] as string[],
  });
  const [milestoneInput, setMilestoneInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchGoals = async () => {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals";
    const method = editingGoal ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingGoal(null);
    setForm({ title: "", description: "", category: "personal", targetDate: "", priority: "medium", color: "#6366f1", milestones: [] });
    fetchGoals();
  };

  const addMilestoneToForm = () => {
    if (!milestoneInput.trim()) return;
    setForm({ ...form, milestones: [...form.milestones, milestoneInput.trim()] });
    setMilestoneInput("");
  };

  const toggleMilestone = async (goalId: string, milestoneId: string) => {
    await fetch(`/api/goals/${goalId}/milestone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestoneId }),
    });
    fetchGoals();
  };

  const addMilestone = async (goalId: string) => {
    if (!newMilestone.trim()) return;
    await fetch(`/api/goals/${goalId}/milestone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newMilestone }),
    });
    setNewMilestone("");
    fetchGoals();
  };

  const updateStatus = async (goalId: string, status: string) => {
    await fetch(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("למחוק את המטרה?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchGoals();
  };

  const filteredGoals = goals.filter((g) => filterStatus === "all" || g.status === filterStatus);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">המטרות שלי</h1>
          <p className="text-gray-400 text-sm mt-1">{goals.filter((g) => g.status === "active").length} מטרות פעילות</p>
        </div>
        <button
          onClick={() => { setEditingGoal(null); setShowForm(true); }}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          מטרה חדשה
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "all", label: "הכל" },
          { value: "active", label: "פעיל" },
          { value: "completed", label: "הושלם" },
          { value: "paused", label: "מושהה" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === f.value ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl animate-fade-in my-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingGoal ? "עריכת מטרה" : "מטרה חדשה"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">כותרת המטרה *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="מה אתה רוצה להשיג?"
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">תיאור</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="פרט את המטרה שלך..."
                  rows={2}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">קטגוריה</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">עדיפות</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">תאריך יעד</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">צבע</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === color ? "border-white" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Milestones in form */}
              {!editingGoal && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">אבני דרך</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={milestoneInput}
                      onChange={(e) => setMilestoneInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMilestoneToForm())}
                      placeholder="הוסף אבן דרך..."
                      className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none"
                    />
                    <button type="button" onClick={addMilestoneToForm} className="bg-violet-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-violet-500">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {form.milestones.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300">
                        <span>• {m}</span>
                        <button type="button" onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, j) => j !== i) })}>
                          <X size={14} className="text-gray-500 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-xl py-3 text-sm font-medium">
                  ביטול
                </button>
                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-medium">
                  {editingGoal ? "עדכן" : "שמור"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && goals.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-gray-400 text-lg mb-2">אין מטרות עדיין</p>
          <p className="text-gray-600 text-sm mb-6">הגדר מטרות ועקוב אחר ההתקדמות שלך</p>
          <button onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl text-sm font-medium">
            הוסף מטרה ראשונה
          </button>
        </div>
      )}

      {/* Goals list */}
      <div className="space-y-4">
        {filteredGoals.map((goal) => {
          const cat = CATEGORIES.find((c) => c.value === goal.category);
          const pri = PRIORITIES.find((p) => p.value === goal.priority);
          const isExpanded = expandedId === goal.id;

          return (
            <div key={goal.id} className="glass rounded-2xl overflow-hidden hover:bg-white/[0.06] transition-all">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Color indicator */}
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: goal.color }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`font-bold text-lg ${goal.status === "completed" ? "text-gray-400 line-through" : "text-white"}`}>
                            {goal.title}
                          </span>
                          {cat && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{cat.emoji} {cat.label}</span>}
                          {pri && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pri.color}`}>{pri.label}</span>}
                        </div>
                        {goal.description && <p className="text-sm text-gray-400 mb-3">{goal.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setExpandedId(isExpanded ? null : goal.id)} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button onClick={() => { setEditingGoal(goal); setForm({ title: goal.title, description: goal.description || "", category: goal.category, targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "", priority: goal.priority, color: goal.color, milestones: [] }); setShowForm(true); }} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteGoal(goal.id)} className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-gray-700 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">התקדמות</span>
                        <span className="text-white font-bold">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      {goal.targetDate && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(goal.targetDate).toLocaleDateString("he-IL")}
                        </div>
                      )}
                      <span>{goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length} אבני דרך</span>
                      <select
                        value={goal.status}
                        onChange={(e) => updateStatus(goal.id, e.target.value)}
                        className="bg-gray-800 text-gray-400 rounded-lg px-2 py-0.5 text-xs border border-gray-700 focus:outline-none hover:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="active">פעיל</option>
                        <option value="completed">הושלם</option>
                        <option value="paused">מושהה</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones expanded */}
              {isExpanded && (
                <div className="border-t border-gray-800 p-5 space-y-2 animate-fade-in">
                  <p className="text-xs font-semibold text-gray-400 mb-3">אבני דרך</p>
                  {goal.milestones.length === 0 && (
                    <p className="text-xs text-gray-600 text-center py-2">אין אבני דרך עדיין</p>
                  )}
                  {goal.milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 group">
                      <button onClick={() => toggleMilestone(goal.id, m.id)} className="flex-shrink-0 transition-transform hover:scale-110">
                        {m.completed
                          ? <CheckCircle size={18} className="text-green-400" />
                          : <Circle size={18} className="text-gray-600 hover:text-gray-400" />
                        }
                      </button>
                      <span className={`text-sm flex-1 ${m.completed ? "text-gray-500 line-through" : "text-gray-300"}`}>{m.title}</span>
                    </div>
                  ))}

                  {/* Add milestone */}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMilestone(goal.id)}
                      placeholder="הוסף אבן דרך..."
                      className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-violet-500 focus:outline-none"
                    />
                    <button onClick={() => addMilestone(goal.id)} className="bg-violet-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-violet-500">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
