"use client";
import { useEffect, useState } from "react";
import { Eye, Heart, AlertTriangle, Star, Save, Loader2 } from "lucide-react";

interface Goal { id: string; title: string; description?: string; }
interface Vision { whyMatters?: string; identityBehind?: string; ifNeglected?: string; ifCompleted?: string; }

const emptyVision: Vision = { whyMatters: "", identityBehind: "", ifNeglected: "", ifCompleted: "" };
const sections = [
  { key: "whyMatters", title: "למה זה חשוב?", icon: Heart, color: "text-red-400" },
  { key: "identityBehind", title: "הזהות מאחורי זה", icon: Star, color: "text-yellow-400" },
  { key: "ifNeglected", title: "מה יקרה אם אזניח", icon: AlertTriangle, color: "text-orange-400" },
  { key: "ifCompleted", title: "איך ייראו החיים אם אשלים", icon: Eye, color: "text-emerald-400" },
] as const;

export default function GoalVisionPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vision, setVision] = useState<Vision>(emptyVision);
  const [loading, setLoading] = useState(true);
  const [visionLoading, setVisionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/goals").then((r) => r.json()).then((data: Goal[]) => {
      setGoals(data);
      if (data.length > 0) setSelectedId(data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setVisionLoading(true);
    fetch(`/api/goal-vision?goalId=${selectedId}`).then((r) => r.json()).then((data) => {
      setVision(data ? { whyMatters: data.whyMatters || "", identityBehind: data.identityBehind || "", ifNeglected: data.ifNeglected || "", ifCompleted: data.ifCompleted || "" } : emptyVision);
    }).finally(() => setVisionLoading(false));
  }, [selectedId]);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    await fetch("/api/goal-vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId: selectedId, ...vision }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const selectedGoal = goals.find((g) => g.id === selectedId);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Eye className="text-emerald-400" size={28} />חזון מטרה</h1>
          <p className="text-gray-400 text-sm mt-2">הופך כל מטרה ליותר מיעד — לזהות, מחיר, ותמונה עתידית.</p>
        </div>
        {selectedGoal && (
          <button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? "נשמר ✓" : "שמור חזון"}
          </button>
        )}
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-emerald-400" /></div>
        : goals.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-gray-400">אין עדיין מטרות. צור מטרות קודם בדף המטרות.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">בחר מטרה</h2>
              <div className="space-y-2">
                {goals.map((goal) => (
                  <button key={goal.id} onClick={() => setSelectedId(goal.id)} className={`w-full text-right rounded-xl p-4 transition-all ${selectedId === goal.id ? "bg-emerald-600/20 border border-emerald-500/50" : "bg-gray-800/50 border border-gray-700 hover:border-gray-600"}`}>
                    <p className="font-semibold text-white text-sm">{goal.title}</p>
                    {goal.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{goal.description}</p>}
                  </button>
                ))}
              </div>
            </div>

            <div className="xl:col-span-2 space-y-4">
              {selectedGoal && (
                <div className="glass rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-xs text-gray-400 mb-1">מטרה נבחרת</p>
                  <h2 className="text-2xl font-bold text-white">{selectedGoal.title}</h2>
                  {selectedGoal.description && <p className="text-gray-400 text-sm mt-1">{selectedGoal.description}</p>}
                </div>
              )}
              {visionLoading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-emerald-400" /></div> : (
                sections.map(({ key, title, icon: Icon, color }) => (
                  <div key={key} className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={18} className={color} />
                      <h3 className="font-bold text-white">{title}</h3>
                    </div>
                    <textarea
                      value={vision[key] || ""}
                      onChange={(e) => setVision((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={title}
                      rows={4}
                      className="w-full bg-gray-800/50 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
    </div>
  );
}
