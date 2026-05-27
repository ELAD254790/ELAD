import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const month = searchParams.get("month"); // YYYY-MM format

  const where = month ? { date: { startsWith: month } } : {};

  const transactions = await prisma.financialTransaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, type, category, description, amount, note } = body;

  const transaction = await prisma.financialTransaction.create({
    data: { date, type, category, description, amount: parseFloat(amount), note },
  });
  return NextResponse.json(transaction);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.financialTransaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
