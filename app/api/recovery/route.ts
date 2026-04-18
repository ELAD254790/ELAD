import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

export async function GET() {
  const logs = await prisma.recoveryLog.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const log = await prisma.recoveryLog.create({
    data: {
      date: body.date || getTodayString(),
      whatHappened: body.whatHappened,
      trigger: body.trigger,
      nextSmallWin: body.nextSmallWin,
      commitment: body.commitment,
    },
  });
  return NextResponse.json(log);
}
