import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const goalId = searchParams.get("goalId");
  if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });

  const vision = await prisma.goalVision.findUnique({ where: { goalId } });
  return NextResponse.json(vision);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { goalId, whyMatters, identityBehind, ifNeglected, ifCompleted } = body;

  const existing = await prisma.goalVision.findUnique({ where: { goalId } });

  if (existing) {
    const updated = await prisma.goalVision.update({
      where: { goalId },
      data: { whyMatters, identityBehind, ifNeglected, ifCompleted },
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.goalVision.create({
    data: { goalId, whyMatters, identityBehind, ifNeglected, ifCompleted },
  });
  return NextResponse.json(created);
}
