import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";
import { generateEveningCheckin, getUsedQuestionIndices } from "@/lib/report-generator";
import { getTodayString } from "@/lib/utils";

// POST /api/daily-report/evening — generate evening check-in and send to Telegram
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayString();

  const existing = await prisma.dailyReport.findUnique({
    where: { date_type: { date: today, type: "evening" } },
  });
  if (existing) return NextResponse.json(existing);

  // Collect all past question indices to avoid repeats
  const pastEveningReports = await prisma.dailyReport.findMany({
    where: { type: "evening" },
    orderBy: { date: "desc" },
    take: 20,
  });

  const usedIndices = pastEveningReports.flatMap((r) =>
    getUsedQuestionIndices(r.eveningQuestions)
  );

  // Past user responses for insight generation
  const pastResponses = pastEveningReports
    .filter((r) => r.userResponse)
    .slice(0, 5)
    .map((r) => `[${r.date}]\n${r.userResponse}`)
    .join("\n\n---\n\n");

  const [habits, goals] = await Promise.all([
    prisma.habit.findMany({ include: { logs: { where: { date: today } } } }),
    prisma.goal.findMany({ where: { status: "active" } }),
  ]);

  const completedToday = habits.filter((h) => h.logs.some((l) => l.completed)).length;
  const habitsSummary = `${completedToday}/${habits.length} הרגלים הושלמו`;

  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;
  const goalsSummary = `${goals.length} מטרות, התקדמות ממוצעת ${avgProgress}%`;

  const checkin = await generateEveningCheckin(
    usedIndices,
    pastResponses,
    habitsSummary,
    goalsSummary,
    pastEveningReports.length + 1
  );

  const { _indices, ...checkinData } = checkin as typeof checkin & { _indices: number[] };

  const saved = await prisma.dailyReport.create({
    data: {
      date: today,
      type: "evening",
      eveningQuestions: JSON.stringify(_indices ?? []),
    },
  });

  // Build and send Telegram message
  const morningReport = await prisma.dailyReport.findUnique({
    where: { date_type: { date: today, type: "morning" } },
  });

  const msg = buildEveningTelegramMessage(
    checkinData.questions,
    checkinData.insight,
    morningReport?.dayPlan ?? null,
    habits,
    completedToday,
    today
  );
  await sendTelegramMessage(msg);

  return NextResponse.json({ ...saved, questions: checkinData.questions, insight: checkinData.insight });
}

// PUT /api/daily-report/evening — save user's response + generate insight
export async function PUT(req: NextRequest) {
  const { date, userResponse } = await req.json();
  const target = date || getTodayString();

  // Generate personalized insight based on this response + history
  const pastEveningReports = await prisma.dailyReport.findMany({
    where: { type: "evening", userResponse: { not: null } },
    orderBy: { date: "desc" },
    take: 6,
  });

  const historyContext = pastEveningReports
    .map((r) => `[${r.date}]\n${r.userResponse}`)
    .join("\n\n---\n\n");

  const { anthropic } = await import("@/lib/anthropic");
  const insightRes = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `
אתה מאמן לפיתוח אישי שמלווה אדם לאורך זמן.
להלן התשובה שלו לעיון ערב ${target}:

${userResponse}

הקשר מימים קודמים:
${historyContext || "זוהי התשובה הראשונה."}

כתוב תגובה אישית, כנה, ממוקדת (150-200 מילים בעברית):
- משהו ספציפי שאמר שמשך את תשומת לבך ולמה
- דפוס אחד שאתה מזהה
- שאלה אחת שתעזור לו לחשוב על זה עמוק יותר
אל תהיה מנחם — היה מדויק.
`.trim(),
      },
    ],
  });

  const progressInsight =
    insightRes.content[0].type === "text" ? insightRes.content[0].text : "";

  await prisma.dailyReport.updateMany({
    where: { date: target, type: "evening" },
    data: { userResponse, progressInsight },
  });

  // Send insight back via Telegram
  if (progressInsight) {
    await sendTelegramMessage(
      `🔍 *תובנה על תשובתך — ${target}*\n\n${progressInsight}`
    );
  }

  return NextResponse.json({ progressInsight });
}

function buildEveningTelegramMessage(
  questions: string[],
  insight: string | undefined,
  dayPlan: string | null,
  habits: { name: string; logs: { completed: boolean }[] }[],
  completedCount: number,
  date: string
): string {
  const habitLines = habits
    .map((h) => {
      const done = h.logs.some((l) => l.completed);
      return `${done ? "✅" : "⬜"} ${h.name}`;
    })
    .join("\n");

  const insightSection = insight
    ? `\n━━━━━━━━━━━━━━━━━━━━━\n🔍 *תובנה מהימים האחרונים*\n━━━━━━━━━━━━━━━━━━━━━\n${insight}\n`
    : "";

  const planSection = dayPlan
    ? `\n🗓️ *תוכנית שרשמת בבוקר:*\n${dayPlan}\n`
    : "";

  return `🌙 *סיכום יום — ${date}*
${planSection}
━━━━━━━━━━━━━━━━━━━━━
📋 *הרגלים היום (${completedCount}/${habits.length})*
━━━━━━━━━━━━━━━━━━━━━
${habitLines || "לא הוגדרו הרגלים"}
${insightSection}
━━━━━━━━━━━━━━━━━━━━━
❓ *שאלות לסיכום היום*
━━━━━━━━━━━━━━━━━━━━━
ענה על כל השאלות בכנות. ככל שתכתוב יותר — אני אוכל ללמוד אותך טוב יותר ולדייק עבורך.

1. ${questions[0]}

2. ${questions[1]}

3. ${questions[2]}

שלח את תשובותיך ואני אנתח אותן ואחזיר לך תובנה.`;
}
