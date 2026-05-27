import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const goal = await prisma.financialGoalRecord.findFirst({
    where: { achieved: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(goal);
}

export async function POST(req: NextRequest) {
  const { title, targetAmount, currentAmount, deadline } = await req.json();
  const goal = await prisma.financialGoalRecord.create({
    data: {
      title,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || "0"),
      deadline,
    },
  });
  return NextResponse.json(goal);
}

export async function PATCH(req: NextRequest) {
  const { id, currentAmount } = await req.json();
  const goal = await prisma.financialGoalRecord.update({
    where: { id },
    data: { currentAmount: parseFloat(currentAmount) },
  });
  return NextResponse.json(goal);
}
