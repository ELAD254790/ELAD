"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, Loader2 } from "lucide-react";

interface CalEvent { id: string; date: string; title: string; type: string; }

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const TYPE_COLORS: Record<string, string> = {
  habit: "bg-blue-500",
  task: "bg-emerald-500",
  deadline: "bg-red-500",
  review: "bg-purple-500",
};

function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const days: Date[] = [];
  for (let i = 0; i < startDay; i++) days.push(new Date(year, month, 1 - (startDay - i)));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
  while (days.length % 7 !== 0) { const last = days[days.length - 1]; days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)); }
  return days;
}

function toKey(d: Date) { return d.toISOString().split("T")[0]; }

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const grid = useMemo(() => getMonthGrid(current.year, current.month), [current]);
  const startDate = toKey(grid[0]);
  const endDate = toKey(grid[grid.length - 1]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?startDate=${startDate}&endDate=${endDate}`).then((r) => r.json()).then(setEvents).finally(() => setLoading(false));
  }, [startDate, endDate]);

  const grouped = useMemo(() => events.reduce<Record<string, CalEvent[]>>((acc, e) => { (acc[e.date] ||= []).push(e); return acc; }, {}), [events]);

  const monthLabel = new Date(current.year, current.month, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  const prev = () => setCurrent((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCurrent((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3"><CalendarDays className="text-blue-400" size={28} />לוח שנה</h1>
        <p className="text-gray-400 text-sm mt-2">כל מה שמתוכנן — הרגלים, משימות, דדליינים וסקירות.</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prev} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors"><ChevronRight size={18} /></button>
          <h2 className="text-xl font-bold text-white">{monthLabel}</h2>
          <button onClick={next} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors"><ChevronLeft size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((d) => <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>)}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20"><Loader2 size={32} className="animate-spin text-blue-400" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {grid.map((day) => {
              const key = toKey(day);
              const items = grouped[key] || [];
              const isCurrentMonth = day.getMonth() === current.month;
              const isToday = key === toKey(today);
              return (
                <div key={key} className={`min-h-24 rounded-xl p-2 border transition-all ${isToday ? "border-indigo-500 bg-indigo-500/10" : isCurrentMonth ? "border-gray-800 bg-gray-900/50" : "border-gray-800/50 bg-gray-900/20 opacity-40"}`}>
                  <div className={`text-xs font-bold mb-1 ${isToday ? "text-indigo-400" : isCurrentMonth ? "text-white" : "text-gray-600"}`}>{day.getDate()}</div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((e) => (
                      <div key={e.id} className={`${TYPE_COLORS[e.type] || "bg-gray-500"} text-white text-xs px-1.5 py-0.5 rounded-md truncate`}>{e.title}</div>
                    ))}
                    {items.length > 3 && <div className="text-gray-500 text-xs">+{items.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800 flex-wrap">
          {Object.entries(TYPE_COLORS).map(([type, color]) => {
            const labels: Record<string, string> = { habit: "הרגלים", task: "משימות", deadline: "דדליינים", review: "סקירות" };
            return <div key={type} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-sm ${color}`} /><span className="text-xs text-gray-400">{labels[type]}</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}
