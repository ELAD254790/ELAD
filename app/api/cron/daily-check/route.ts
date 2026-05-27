import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // Create a pending check-in record for today
  await prisma.dailyFinancialCheckIn.upsert({
    where: { date: today },
    update: {},
    create: { date: today, completed: false },
  });

  return NextResponse.json({ success: true, date: today, message: "Daily check-in record created" });
}
