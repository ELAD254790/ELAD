import { prisma } from "./db";

interface TransactionRow {
  date: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  note: string;
}

export async function generateExcelData(): Promise<{
  transactions: TransactionRow[];
  subscriptions: Array<{ name: string; amount: number; billingDay: number; category: string; yearlyTotal: number }>;
  summary: Array<{ month: string; income: number; expenses: number; balance: number }>;
  goal: { title: string; targetAmount: number; currentAmount: number; progress: number; remaining: number } | null;
  bankBalance: number | null;
  totalSubscriptions: number;
}> {
  const [transactions, subscriptions, balance, goal] = await Promise.all([
    prisma.financialTransaction.findMany({ orderBy: { date: "desc" } }),
    prisma.financialSubscription.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.bankBalance.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.financialGoalRecord.findFirst({ where: { achieved: false }, orderBy: { createdAt: "asc" } }),
  ]);

  // Build monthly summary
  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  transactions.forEach((t) => {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 };
    if (t.type === "income") monthlyMap[month].income += t.amount;
    else monthlyMap[month].expenses += t.amount;
  });

  const summary = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      balance: data.income - data.expenses,
    }));

  const totalSubscriptions = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  return {
    transactions: transactions.map((t) => ({
      date: t.date,
      type: t.type === "income" ? "הכנסה" : "הוצאה",
      category: t.category,
      description: t.description,
      amount: t.amount,
      note: t.note || "",
    })),
    subscriptions: subscriptions.map((sub) => ({
      name: sub.name,
      amount: sub.amount,
      billingDay: sub.billingDay,
      category: sub.category,
      yearlyTotal: sub.amount * 12,
    })),
    summary,
    goal: goal
      ? {
          title: goal.title,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progress: (goal.currentAmount / goal.targetAmount) * 100,
          remaining: goal.targetAmount - goal.currentAmount,
        }
      : null,
    bankBalance: balance?.balance ?? null,
    totalSubscriptions,
  };
}
