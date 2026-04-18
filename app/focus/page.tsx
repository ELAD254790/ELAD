"use client";
import { useEffect, useRef, useState } from "react";
import { Zap, Play, Pause, RotateCcw, Save, Loader2 } from "lucide-react";
import { getTodayString } from "@/lib/utils";

const defaultForm = { priority1: "", priority2: "", priority3: "", currentTask: "", nextAction: "" };

export default function FocusModePage() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(25);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/focus?date=${getTodayString()}`).then((r) => r.json()).then((data) => {
      if (data) setForm({ priority1: data.priority1 || "", priority2: data.priority2 || "", priority3: data.priority3 || "", currentTask: data.currentTask || "", nextAction: data.nextAction || "" });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/focus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, date: getTodayString() }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const reset = (mins = sessionDuration) => { clearInterval(intervalRef.current!); setRunning(false); setSecondsLeft(mins * 60); };
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const progress = 1 - secondsLeft / (sessionDuration * 60);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Zap className="text-yellow-400" size={28} />מצב ריכוז</h1>
          <p className="text-gray-400 text-sm mt-2">הגדר 3 עדיפויות, ואז בצע בלי הסחות דעת.</p>
        </div>
        <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? "נשמר ✓" : "שמור"}
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-400" /></div> : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-400" />3 העדיפויות להיום</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((n) => {
                  const key = `priority${n}` as keyof typeof form;
                  return (
                    <div key={n} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{n}</div>
                      <input type="text" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={`עדיפות ${n}`} className="flex-1 bg-gray-800/50 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[{ key: "currentTask", title: "משימה נוכחית", placeholder: "מה הדבר שאתה עושה עכשיו?" }, { key: "nextAction", title: "הפעולה הבאה", placeholder: "מה הצעד הקטן הבא?" }].map((f) => (
                <div key={f.key} className="glass rounded-2xl p-5">
                  <h3 className="font-semibold text-white text-sm mb-3">{f.title}</h3>
                  <textarea value={form[f.key as keyof typeof form]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} className="w-full bg-gray-800/50 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none" />
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 flex flex-col items-center">
            <h2 className="font-bold text-white mb-6">טיימר פומודורו</h2>
            <div className="relative w-40 h-40 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 44}`} strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{mins}:{secs}</span>
              </div>
            </div>
            <div className="flex gap-2 mb-4 w-full">
              <button onClick={() => setRunning((p) => !p)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {running ? <Pause size={16} /> : <Play size={16} />}{running ? "עצור" : "התחל"}
              </button>
              <button onClick={() => reset()} className="bg-gray-700 hover:bg-gray-600 text-white rounded-xl px-3 py-2.5 transition-colors"><RotateCcw size={16} /></button>
            </div>
            <div className="flex gap-2 w-full">
              {[25, 50, 90].map((m) => (
                <button key={m} onClick={() => { setSessionDuration(m); reset(m); }} className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${sessionDuration === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{m} דק׳</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
