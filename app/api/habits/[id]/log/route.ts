import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const date = body.date || getTodayString();

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: id, date } },
  });

  if (existing) {
    const log = await prisma.habitLog.update({
      where: { habitId_date: { habitId: id, date } },
      data: { completed: !existing.completed, note: body.note },
    });
    return NextResponse.json(log);
  }

  const log = await prisma.habitLog.create({
    data: {
      habitId: id,
      date,
      completed: true,
      note: body.note,
    },
  });
  return NextResponse.json(log);
}
