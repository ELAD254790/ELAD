import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

async function buildSummary(forDate = new Date()) {
  const today = forDate.toISOString().split("T")[0];
  const weekStart = getWeekStart(forDate);

  const habits = await prisma.habit.findMany({ include: { logs: true } });
  const goals = await prisma.goal.findMany();

  const habitStats = await Promise.all(
    habits.map(async (habit) => {
      const todayLog = habit.logs.find((l) => l.date === today);
      const weekLogs = habit.logs.filter((l) => {
        const d = new Date(l.date);
        return d >= weekStart && d <= forDate && l.completed;
      });
      return {
        category: habit.category,
        completedToday: Boolean(todayLog?.completed),
        weeklyCompletions: weekLogs.length,
        targetDays: habit.targetDays || 7,
      };
    })
  );

  const completedCount = habitStats.filter((h) => h.completedToday).length;
  const completionRate = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;
  const consistencyRate =
    habitStats.length > 0
      ? (habitStats.reduce((sum, h) => sum + Math.min(h.weeklyCompletions / Math.max(h.targetDays, 1), 1), 0) / habitStats.length) * 100
      : 0;

  const overdueGoals = goals.filter(
    (g) => g.status !== "completed" && g.targetDate && new Date(g.targetDate) < forDate
  ).length;
  const penalties = Math.min(25, overdueGoals * 5 + Math.max(0, habits.length - completedCount - 2) * 3);
  const dailyScore = clamp(completionRate * 0.6 + consistencyRate * 0.4 - penalties);

  const categoryMap: Record<string, { total: number; completed: number }> = {};
  for (const h of habitStats) {
    const cat = h.category || "general";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, completed: 0 };
    categoryMap[cat].total++;
    if (h.completedToday) categoryMap[cat].completed++;
  }
  const categoryScores = Object.fromEntries(
    Object.entries(categoryMap).map(([cat, v]) => [cat, clamp((v.completed / v.total) * 100)])
  );

  return {
    date: today,
    dailyScore,
    completionScore: clamp(completionRate),
    consistencyScore: clamp(consistencyRate),
    penalties,
    categoryScores,
    completedTodayCount: completedCount,
    totalHabits: habits.length,
    activeGoals: goals.filter((g) => g.status === "active").length,
  };
}

export async function GET() {
  const now = new Date();
  const weekStart = getWeekStart(now);

  const summary = await buildSummary(now);

  const weekly = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const date = addDays(weekStart, i);
      const s = await buildSummary(date);
      return { date: date.toISOString().split("T")[0], score: s.dailyScore };
    })
  );

  return NextResponse.json({ summary, weekly });
}
