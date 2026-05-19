import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const events: Array<{ id: string; date: string; title: string; type: string }> = [];

  const habits = await prisma.habit.findMany({ include: { schedules: true } });
  for (const habit of habits) {
    if (habit.schedules.length > 0) {
      let cursor = new Date(startDate);
      const end = new Date(endDate);
      while (cursor <= end) {
        const dayOfWeek = cursor.getDay();
        if (habit.schedules.some((s: { dayOfWeek: number }) => s.dayOfWeek === dayOfWeek)) {
          const dateStr = cursor.toISOString().split("T")[0];
          events.push({ id: `habit-${habit.id}-${dateStr}`, date: dateStr, title: habit.name, type: "habit" });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  const goals = await prisma.goal.findMany({ include: { tasks: true, deadline: true } });
  for (const goal of goals) {
    for (const task of goal.tasks) {
      if (task.dueDate) {
        const dateStr = new Date(task.dueDate).toISOString().split("T")[0];
        if (dateStr >= startDate && dateStr <= endDate) {
          events.push({ id: `task-${task.id}`, date: dateStr, title: task.title, type: "task" });
        }
      }
    }
    const dueDate = goal.deadline?.deadline ?? goal.targetDate;
    if (dueDate) {
      const dateStr = new Date(dueDate).toISOString().split("T")[0];
      if (dateStr >= startDate && dateStr <= endDate) {
        events.push({ id: `deadline-${goal.id}`, date: dateStr, title: goal.title, type: "deadline" });
      }
    }
  }

  const reviews = await prisma.weeklyReview.findMany({ where: { weekDate: { gte: startDate, lte: endDate } } });
  for (const review of reviews) {
    events.push({ id: `review-${review.id}`, date: review.weekDate, title: "סקירה שבועית", type: "review" });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json(events);
}
