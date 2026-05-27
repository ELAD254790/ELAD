import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const balance = await prisma.bankBalance.findFirst({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(balance);
}

export async function POST(req: NextRequest) {
  const { balance, note } = await req.json();
  const record = await prisma.bankBalance.create({
    data: { balance: parseFloat(balance), note },
  });
  return NextResponse.json(record);
}
