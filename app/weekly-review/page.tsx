"use client";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Save, Loader2 } from "lucide-react";

const emptyForm = { completedThisWeek: "", inconsistentAreas: "", blockers: "", bestHabits: "", movedGoals: "", adjustments: "", topPriorities: "", wins: "", lessons: "" };

const reviewSteps = [
  { key: "completedThisWeek", title: "מה הושלם השבוע?", placeholder: "מה באמת זז קדימה השבוע?" },
  { key: "inconsistentAreas", title: "איפה לא היית עקבי?", placeholder: "איפה נפלת בין הכוונה לביצוע?" },
  { key: "blockers", title: "מה חסם אותך?", placeholder: "אילו חסמים חזרו?" },
  { key: "bestHabits", title: "אילו הרגלים עבדו הכי טוב?", placeholder: "מה החזיק אותך?" },
  { key: "movedGoals", title: "אילו מטרות התקדמו?", placeholder: "איפה רואים תנועה אמיתית?" },
  { key: "adjustments", title: "אילו התאמות צריך?", placeholder: "מה צריך לשנות בשבוע הבא?" },
  { key: "topPriorities", title: "3 העדיפויות לשבוע הבא", placeholder: "על מה אתה לא מוותר?" },
  { key: "wins", title: "הניצחונות שלך", placeholder: "גם דברים קטנים נחשבים." },
  { key: "lessons", title: "שיעורים לשבוע הבא", placeholder: "מה אתה לוקח איתך הלאה?" },
] as const;

interface Review { id: string; weekDate: string; topPriorities?: string; completedThisWeek?: string; }

export default function WeeklyReviewPage() {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Review[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/weekly-review").then((r) => r.json()),
      fetch("/api/weekly-review?all=1").then((r) => r.json()),
    ]).then(([current, all]) => {
      if (current) setForm({ completedThisWeek: current.completedThisWeek || "", inconsistentAreas: current.inconsistentAreas || "", blockers: current.blockers || "", bestHabits: current.bestHabits || "", movedGoals: current.movedGoals || "", adjustments: current.adjustments || "", topPriorities: current.topPriorities || "", wins: current.wins || "", lessons: current.lessons || "" });
      setHistory(all || []);
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/weekly-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const currentStep = reviewSteps[step - 1];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><TrendingUp className="text-violet-400" size={28} />סקירה שבועית</h1>
          <p className="text-gray-400 text-sm mt-2">בנה למידה, לא רק אשמה. כאן שבוע הופך לנתון.</p>
        </div>
        <button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? "נשמר ✓" : "שמור סקירה"}
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-violet-400" /></div> : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="glass rounded-2xl p-6">
              <div className="flex gap-1.5 mb-6">
                {reviewSteps.map((_, i) => (
                  <button key={i} onClick={() => setStep(i + 1)} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? "bg-violet-500" : "bg-gray-700"}`} />
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-1">שלב {step} מתוך {reviewSteps.length}</p>
              <h2 className="text-xl font-bold text-white mb-4">{currentStep.title}</h2>
              <textarea
                value={form[currentStep.key]}
                onChange={(e) => setForm((p) => ({ ...p, [currentStep.key]: e.target.value }))}
                placeholder={currentStep.placeholder}
                rows={5}
                className="w-full bg-gray-800/50 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:border-violet-500 focus:outline-none resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep((p) => Math.max(1, p - 1))} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl px-5 py-2.5 text-sm font-medium">חזור</button>
                <button onClick={() => setStep((p) => Math.min(reviewSteps.length, p + 1))} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2.5 text-sm font-medium">הבא</button>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 text-sm">סיכום שבועי</h3>
              <div className="space-y-3">
                {reviewSteps.map((s) => form[s.key] && (
                  <div key={s.key}>
                    <p className="text-xs font-semibold text-gray-400 mb-0.5">{s.title}</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{form[s.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-white mb-4">היסטוריה</h3>
            {history.length === 0 ? <p className="text-gray-500 text-sm">עוד לא נשמרו סקירות</p> : (
              <div className="space-y-3">
                {history.slice(0, 8).map((r) => (
                  <div key={r.id} className="bg-gray-800/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">שבוע של {r.weekDate}</p>
                    <p className="text-xs text-gray-300 line-clamp-2">{r.topPriorities || r.completedThisWeek || "ללא תוכן"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
