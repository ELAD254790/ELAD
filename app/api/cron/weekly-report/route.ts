import { NextResponse } from "next/server";
import { generateExcelData } from "@/lib/excel";

export async function GET() {
  const data = await generateExcelData();
  const today = new Date().toISOString().split("T")[0];

  return NextResponse.json({
    success: true,
    date: today,
    summary: {
      totalTransactions: data.transactions.length,
      totalSubscriptions: data.totalSubscriptions,
      bankBalance: data.bankBalance,
      goal: data.goal,
      monthlySummary: data.summary[0] || null,
    },
    message: "Weekly report generated",
  });
}
