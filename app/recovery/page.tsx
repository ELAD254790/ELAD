"use client";
import { useEffect, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";

interface RecoveryLog { id: string; date: string; whatHappened: string; trigger: string; nextSmallWin: string; commitment: string; }

const initialForm = { whatHappened: "", trigger: "", nextSmallWin: "", commitment: "" };
const steps = [
  { key: "whatHappened", title: "מה קרה בפועל?", placeholder: "בלי סיפורים, בלי שיפוט. מה קרה?" },
  { key: "trigger", title: "מה הפעיל אותך?", placeholder: "עייפות? לחץ? טלפון? סביבה?" },
  { key: "nextSmallWin", title: "הניצחון הקטן הבא", placeholder: "מה אתה עושה היום כדי לחזור?" },
  { key: "commitment", title: "המחויבות שלך", placeholder: "מה אתה עושה מחר כדי לחזור למסלול?" },
] as const;

export default function RecoveryPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLogs = async () => {
    const data = await fetch("/api/recovery").then((r) => r.json());
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const currentStep = step > 0 ? steps[step - 1] : null;

  const handleNext = async () => {
    if (!currentStep) return;
    if (!form[currentStep.key].trim()) return;
    if (step === steps.length) {
      setSaving(true);
      await fetch("/api/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setSaving(false); setStep(0); setForm(initialForm); fetchLogs();
      return;
    }
    setStep((p) => p + 1);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3"><RotateCcw className="text-emerald-400" size={28} />פרוטוקול התאוששות</h1>
        <p className="text-gray-400 text-sm mt-2">כשנופלים, חוזרים למסלול מהר. בלי דרמה, עם כנות.</p>
      </div>

      {step === 0 ? (
        <div className="glass rounded-2xl p-10 text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <RotateCcw size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">נפלת מהמסלול?</h2>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">תהליך קצר שיעזור לך להבין, לאפס, ולבנות את הצעד הבא.</p>
          <button onClick={() => setStep(1)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium transition-colors">
            התחל התאוששות
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? "bg-emerald-500" : "bg-gray-700"}`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{currentStep?.title}</h2>
          <textarea
            value={currentStep ? form[currentStep.key] : ""}
            onChange={(e) => currentStep && setForm((p) => ({ ...p, [currentStep.key]: e.target.value }))}
            placeholder={currentStep?.placeholder}
            rows={5}
            className="w-full bg-gray-800/50 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none"
          />
          <div className="flex gap-3 mt-5">
            <button onClick={() => step === 1 ? setStep(0) : setStep((p) => p - 1)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors">
              {step === 1 ? "ביטול" : "חזור"}
            </button>
            <button onClick={handleNext} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {step === steps.length ? "שמור התאוששות" : "הבא"}
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold text-white text-lg mb-4">יומן התאוששות</h2>
        {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
          : logs.length === 0 ? <p className="text-gray-500 text-sm text-center py-6">אין עדיין רשומות</p>
          : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-gray-500">{log.date}</p>
                  <p className="text-sm text-gray-300"><span className="font-semibold text-white">מה קרה: </span>{log.whatHappened}</p>
                  <p className="text-sm text-gray-300"><span className="font-semibold text-white">טריגר: </span>{log.trigger}</p>
                  <p className="text-sm text-gray-300"><span className="font-semibold text-white">ניצחון קטן: </span>{log.nextSmallWin}</p>
                  <p className="text-sm text-gray-300"><span className="font-semibold text-white">מחויבות: </span>{log.commitment}</p>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
