import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

export async function GET() {
  const today = getTodayString();

  const [habits, goals, files, recentProgress] = await Promise.all([
    prisma.habit.findMany({
      include: {
        logs: {
          where: { date: today },
        },
      },
    }),
    prisma.goal.findMany({ where: { status: "active" } }),
    prisma.uploadedFile.count(),
    prisma.progressEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
  ]);

  const completedToday = habits.filter((h) => h.logs.some((l) => l.completed)).length;
  const avgGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  return NextResponse.json({
    habits: {
      total: habits.length,
      completedToday,
      completionRate: habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0,
    },
    goals: {
      total: goals.length,
      avgProgress: avgGoalProgress,
    },
    files: { total: files },
    recentProgress,
  });
}
