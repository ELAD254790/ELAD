import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      priority: body.priority,
      status: body.status,
      progress: body.progress,
      color: body.color,
    },
    include: { milestones: true },
  });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
