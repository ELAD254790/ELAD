import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");

  if (all) {
    const reviews = await prisma.weeklyReview.findMany({ orderBy: { weekDate: "desc" } });
    return NextResponse.json(reviews);
  }

  const weekDate = getWeekStart();
  const review = await prisma.weeklyReview.findUnique({ where: { weekDate } });
  return NextResponse.json(review);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const weekDate = getWeekStart();

  const existing = await prisma.weeklyReview.findUnique({ where: { weekDate } });

  if (existing) {
    const updated = await prisma.weeklyReview.update({
      where: { weekDate },
      data: {
        completedThisWeek: body.completedThisWeek,
        inconsistentAreas: body.inconsistentAreas,
        blockers: body.blockers,
        bestHabits: body.bestHabits,
        movedGoals: body.movedGoals,
        adjustments: body.adjustments,
        topPriorities: body.topPriorities,
        wins: body.wins,
        lessons: body.lessons,
      },
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.weeklyReview.create({
    data: {
      weekDate,
      completedThisWeek: body.completedThisWeek,
      inconsistentAreas: body.inconsistentAreas,
      blockers: body.blockers,
      bestHabits: body.bestHabits,
      movedGoals: body.movedGoals,
      adjustments: body.adjustments,
      topPriorities: body.topPriorities,
      wins: body.wins,
      lessons: body.lessons,
    },
  });
  return NextResponse.json(created);
}
