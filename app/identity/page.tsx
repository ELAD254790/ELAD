"use client";
import { useEffect, useState } from "react";
import { Save, Sparkles, Loader2 } from "lucide-react";

const emptyForm = { whoBecoming: "", standards: "", nonNegotiables: "", rules: "", values: "", vision: "" };

const fields = [
  { key: "whoBecoming", title: "מי אתה הופך להיות?", placeholder: "כתוב בגוף ראשון: אני הופך להיות..." },
  { key: "standards", title: "הסטנדרטים שלי", placeholder: "אילו סטנדרטים אינם מתפשרים?" },
  { key: "nonNegotiables", title: "הדברים שאין עליהם משא ומתן", placeholder: "על מה אין ויתור?" },
  { key: "rules", title: "הכללים שאני חי לפיהם", placeholder: "הכללים שמנחים את הדרך שלי..." },
  { key: "values", title: "הערכים שמובילים אותי", placeholder: "הערכים החשובים ביותר שלי..." },
  { key: "vision", title: "החזון שלי לחיים", placeholder: "איך נראים החיים שאני בונה?" },
];

export default function IdentityPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/identity").then((r) => r.json()).then((data) => {
      if (data) setForm({ whoBecoming: data.whoBecoming || "", standards: data.standards || "", nonNegotiables: data.nonNegotiables || "", rules: data.rules || "", values: data.values || "", vision: data.vision || "" });
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/identity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Sparkles className="text-indigo-400" size={28} />דף הזהות שלי</h1>
          <p className="text-gray-400 text-sm mt-2">כאן אתה מגדיר את האדם שאתה בונה — לא רק את המשימות שלך.</p>
        </div>
        <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? "נשמר ✓" : "שמור"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>
      ) : (
        <>
          {form.whoBecoming && (
            <div className="glass rounded-2xl p-6 mb-6 border border-indigo-500/30 bg-indigo-500/10">
              <div className="flex items-start gap-3">
                <Sparkles size={20} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">הצהרת זהות</p>
                  <p className="text-lg font-semibold text-white whitespace-pre-wrap">{form.whoBecoming}</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.key} className="glass rounded-2xl p-5">
                <h2 className="font-bold text-white mb-3">{field.title}</h2>
                <textarea
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full bg-gray-800/50 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
