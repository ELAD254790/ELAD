import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.milestoneId) {
    const existing = await prisma.milestone.findUnique({ where: { id: body.milestoneId } });
    const milestone = await prisma.milestone.update({
      where: { id: body.milestoneId },
      data: {
        completed: !existing?.completed,
        completedAt: !existing?.completed ? new Date() : null,
      },
    });

    const milestones = await prisma.milestone.findMany({ where: { goalId: id } });
    const completedCount = milestones.filter((m) => m.completed).length;
    const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
    await prisma.goal.update({ where: { id }, data: { progress } });

    return NextResponse.json(milestone);
  }

  const milestone = await prisma.milestone.create({
    data: { goalId: id, title: body.title },
  });
  return NextResponse.json(milestone);
}
