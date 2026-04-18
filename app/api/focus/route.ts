import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || getTodayString();
  const focus = await prisma.focusPriority.findUnique({ where: { date } });
  return NextResponse.json(focus);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = body.date || getTodayString();

  const existing = await prisma.focusPriority.findUnique({ where: { date } });

  if (existing) {
    const updated = await prisma.focusPriority.update({
      where: { date },
      data: {
        priority1: body.priority1,
        priority2: body.priority2,
        priority3: body.priority3,
        currentTask: body.currentTask,
        nextAction: body.nextAction,
      },
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.focusPriority.create({
    data: {
      date,
      priority1: body.priority1,
      priority2: body.priority2,
      priority3: body.priority3,
      currentTask: body.currentTask,
      nextAction: body.nextAction,
    },
  });
  return NextResponse.json(created);
}
