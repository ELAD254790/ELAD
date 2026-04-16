import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

export async function GET() {
  const habits = await prisma.habit.findMany({
    include: {
      logs: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(habits);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const habit = await prisma.habit.create({
    data: {
      name: body.name,
      description: body.description,
      category: body.category || "general",
      frequency: body.frequency || "daily",
      color: body.color || "#6366f1",
      icon: body.icon || "check",
      targetDays: body.targetDays || 7,
    },
    include: { logs: true },
  });
  return NextResponse.json(habit);
}
