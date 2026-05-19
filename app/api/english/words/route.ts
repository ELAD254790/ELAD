import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const words = await prisma.englishWord.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(words);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { word, definition, example, level } = body;
  const saved = await prisma.englishWord.upsert({
    where: { word: word.toLowerCase() },
    update: { definition, example, level },
    create: { word: word.toLowerCase(), definition, example, level: level ?? "B1" },
  });
  return NextResponse.json(saved);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, mastered } = body;
  const updated = await prisma.englishWord.update({
    where: { id },
    data: { mastered },
  });
  return NextResponse.json(updated);
}
