import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const entries = await prisma.progressEntry.findMany({
    where: category ? { category } : undefined,
    orderBy: { date: "asc" },
    take: 90,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await prisma.progressEntry.create({
    data: {
      date: body.date,
      category: body.category,
      metric: body.metric,
      value: body.value,
      note: body.note,
    },
  });
  return NextResponse.json(entry);
}
