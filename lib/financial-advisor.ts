import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";

export const financialAnthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const FINANCIAL_ADVISOR_SYSTEM_PROMPT = `אתה יועץ פיננסי אישי קשוח אבל מוכשר. שמך "דני היועץ".

🎯 המשימה שלך:
המשתמש רוצה לחסוך 10,000 ₪ כדי להתחיל להשקיע. יש לו הרגלים כלכליים רעים ואתה כאן לעזור לו לשנות זאת.

📋 כללים שאתה חייב לפעול לפיהם:
1. **תמיד בעברית** - ענה רק בעברית
2. **ביקורת ישירה** - אל תפחד לבקר. אם המשתמש בזבז כסף שלא צריך - תגיד לו בצורה ברורה וחדה
3. **תמיד חשב נתונים** - כשאתה יודע על הוצאות, חשב ואמור כמה זה עולה בשנה, ואיפה זה שם אותו ביחס ליעד של 10,000 ₪
4. **קח בחשבון את ההיסטוריה** - זכור כל מה שסיפר לך המשתמש
5. **תן עצות פרקטיות** - לא תיאוריה, אלא צעדים מעשיים ממש עכשיו
6. **מנויים** - כשמשתמש מזכיר מנוי חדש, שאל תמיד "האם זה באמת הכרחי?"
7. **יתרת חשבון** - כשאתה יודע את היתרה, תמיד שאל כמה מזה חסכונות אמיתיים

סגנון דיבור:
- ישיר, ברור, לא מסובב
- השתמש בנתונים ומספרים
- הוסף אמוג'י לקריאות
- כשמבקר - עשה זאת בצורה בונה לא פוגעת
- כשמשבח - שבח רק כשמגיע באמת

דוגמת סגנון ביקורת: "רגע, 200 ₪ על ארוחת ערב אחת? זה 15 ארוחות ערב בבית. בחודש אחד זה יכול להיות 800 ₪ שנחסכים."

דוגמת חישוב: "אם תוציא 50 ₪ בכל יום על קפה ואוכל בחוץ, זה 1,500 ₪ בחודש, 18,000 ₪ בשנה. זה כמעט פי 2 מהיעד שלך."

כשמשתמש שולח פירוט יומי של הוצאות:
- סכם את כל ההוצאות
- חלק לקטגוריות
- ציין מה היה הכרחי ומה לא
- חשב כמה זה עולה בחודש אם זה קצב קבוע
- תן ציון יומי מ-1 עד 10 (10 = חסכן מושלם)`;

export async function getFinancialContext(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [balance, transactions, subscriptions, goal, checkIn] = await Promise.all([
    prisma.bankBalance.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.financialTransaction.findMany({
      where: { date: { gte: monthStartStr } },
      orderBy: { date: "desc" },
    }),
    prisma.financialSubscription.findMany({ where: { active: true } }),
    prisma.financialGoalRecord.findFirst({ where: { achieved: false }, orderBy: { createdAt: "asc" } }),
    prisma.dailyFinancialCheckIn.findUnique({ where: { date: today } }),
  ]);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalSubscriptions = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  let context = `\n\n📊 **מצב פיננסי נוכחי של המשתמש (${today}):**\n`;

  if (balance) {
    context += `💳 יתרת חשבון: ${balance.balance.toLocaleString("he-IL")} ₪ (עודכן: ${new Date(balance.updatedAt).toLocaleDateString("he-IL")})\n`;
  }

  context += `\n📅 **החודש הנוכחי:**\n`;
  context += `✅ הכנסות: ${totalIncome.toLocaleString("he-IL")} ₪\n`;
  context += `❌ הוצאות: ${totalExpenses.toLocaleString("he-IL")} ₪\n`;
  context += `📈 מאזן: ${(totalIncome - totalExpenses).toLocaleString("he-IL")} ₪\n`;

  if (subscriptions.length > 0) {
    context += `\n🔄 **מנויים חודשיים פעילים (${totalSubscriptions.toLocaleString("he-IL")} ₪/חודש = ${(totalSubscriptions * 12).toLocaleString("he-IL")} ₪/שנה):**\n`;
    subscriptions.forEach((sub) => {
      context += `  • ${sub.name}: ${sub.amount} ₪/חודש (חיוב ב-${sub.billingDay} לחודש)\n`;
    });
  }

  if (goal) {
    const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
    const remaining = goal.targetAmount - goal.currentAmount;
    context += `\n🎯 **יעד חיסכון: "${goal.title}"**\n`;
    context += `  • יעד: ${goal.targetAmount.toLocaleString("he-IL")} ₪\n`;
    context += `  • חסך עד כה: ${goal.currentAmount.toLocaleString("he-IL")} ₪ (${progress}%)\n`;
    context += `  • נותר: ${remaining.toLocaleString("he-IL")} ₪\n`;
  }

  if (!checkIn?.completed) {
    context += `\n⚠️ הצ'ק-אין היומי של היום טרם הושלם.\n`;
  }

  // Recent transactions (last 5)
  if (transactions.length > 0) {
    context += `\n📝 **עסקאות אחרונות:**\n`;
    transactions.slice(0, 8).forEach((t) => {
      const emoji = t.type === "income" ? "💚" : "🔴";
      context += `  ${emoji} ${t.date} | ${t.description} | ${t.amount.toLocaleString("he-IL")} ₪ [${t.category}]\n`;
    });
  }

  return context;
}
