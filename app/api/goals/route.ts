import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const goals = await prisma.goal.findMany({
    include: { milestones: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const goal = await prisma.goal.create({
    data: {
      title: body.title,
      description: body.description,
      category: body.category || "personal",
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      priority: body.priority || "medium",
      color: body.color || "#8b5cf6",
      milestones: {
        create: (body.milestones || []).map((m: string) => ({ title: m })),
      },
    },
    include: { milestones: true },
  });
  return NextResponse.json(goal);
}
