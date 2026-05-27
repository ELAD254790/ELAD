import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [balance, monthTransactions, allTransactions, subscriptions, goal, todayCheckIn] = await Promise.all([
    prisma.bankBalance.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.financialTransaction.findMany({ where: { date: { gte: monthStartStr } } }),
    prisma.financialTransaction.findMany({ orderBy: { date: "desc" }, take: 10 }),
    prisma.financialSubscription.findMany({ where: { active: true } }),
    prisma.financialGoalRecord.findFirst({ where: { achieved: false }, orderBy: { createdAt: "asc" } }),
    prisma.dailyFinancialCheckIn.findUnique({ where: { date: today } }),
  ]);

  const monthIncome = monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpenses = monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalSubscriptions = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  // Category breakdown for this month
  const expenseByCategory: Record<string, number> = {};
  monthTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

  return NextResponse.json({
    balance: balance?.balance ?? null,
    balanceUpdatedAt: balance?.updatedAt ?? null,
    monthIncome,
    monthExpenses,
    monthBalance: monthIncome - monthExpenses,
    recentTransactions: allTransactions,
    subscriptions,
    totalSubscriptions,
    goal,
    todayCheckIn,
    expenseByCategory,
    today,
    isAfter20h: new Date().getHours() >= 20,
  });
}
