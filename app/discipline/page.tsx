"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

interface Summary {
  dailyScore: number;
  completionScore: number;
  consistencyScore: number;
  penalties: number;
  categoryScores: Record<string, number>;
  completedTodayCount: number;
  totalHabits: number;
  activeGoals: number;
}

interface DayScore { date: string; score: number; }

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#6366f1" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 85 ? "מצוין" : score >= 70 ? "טוב" : score >= 50 ? "בינוני" : "זקוק לשיפור";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="text-center -mt-2">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function DisciplinePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<DayScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/discipline").then((r) => r.json()).then(({ summary, weekly }) => {
      setSummary(summary); setWeekly(weekly);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 size={36} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3"><ShieldCheck className="text-indigo-400" size={28} />ניקוד משמעת</h1>
        <p className="text-gray-400 text-sm mt-2">ניקוד מבוסס ביצוע אמיתי, עקביות, וקנסות על פספוסים.</p>
      </div>

      {summary && (
        <>
          <div className="glass rounded-2xl p-8 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
              <div className="flex flex-col items-center gap-2">
                <ScoreRing score={summary.dailyScore} />
                <span className="text-xs text-gray-400 font-medium">ניקוד יומי</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ScoreRing score={summary.completionScore} size={100} />
                <span className="text-xs text-gray-400 font-medium">השלמה</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ScoreRing score={summary.consistencyScore} size={100} />
                <span className="text-xs text-gray-400 font-medium">עקביות</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full border-4 border-red-500/30 bg-red-500/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-red-400">-{summary.penalties}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">קנסות</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-indigo-400" />
                <h2 className="font-bold text-white text-lg">ניקוד לפי קטגוריה</h2>
              </div>
              {Object.keys(summary.categoryScores).length === 0 ? (
                <p className="text-gray-500 text-sm">אין עדיין נתונים לקטגוריות</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(summary.categoryScores).map(([cat, score]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 font-medium">{cat}</span>
                        <span className="text-white font-bold">{score}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800">
                        <div className="h-2 rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle size={18} className="text-yellow-400" />
                <h2 className="font-bold text-white text-lg">שבוע אחרון</h2>
              </div>
              <div className="space-y-3">
                {weekly.map((day) => {
                  const d = new Date(day.date);
                  const label = d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" });
                  return (
                    <div key={day.date} className="bg-gray-800/50 rounded-xl p-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">{label}</span>
                        <span className="text-white font-bold">{day.score}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-700">
                        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${day.score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
