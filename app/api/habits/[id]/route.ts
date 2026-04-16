import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const habit = await prisma.habit.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      frequency: body.frequency,
      color: body.color,
      icon: body.icon,
      targetDays: body.targetDays,
    },
    include: { logs: true },
  });
  return NextResponse.json(habit);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.habit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
