import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  const checkIn = await prisma.dailyFinancialCheckIn.findUnique({ where: { date: today } });
  return NextResponse.json(checkIn);
}

export async function POST(req: NextRequest) {
  const { totalSpent, note } = await req.json();
  const today = new Date().toISOString().split("T")[0];

  const checkIn = await prisma.dailyFinancialCheckIn.upsert({
    where: { date: today },
    update: { completed: true, totalSpent: parseFloat(totalSpent || "0"), note },
    create: { date: today, completed: true, totalSpent: parseFloat(totalSpent || "0"), note },
  });
  return NextResponse.json(checkIn);
}
