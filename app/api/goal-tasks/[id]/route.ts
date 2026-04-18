import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const task = await prisma.goalTask.update({
    where: { id },
    data: {
      title: body.title,
      completed: body.completed,
      completedAt: body.completed ? new Date() : null,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.goalTask.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
