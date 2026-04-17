import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";
import { generateMorningReport, getUsedQuestionIndices } from "@/lib/report-generator";
import { getTodayString } from "@/lib/utils";

// GET /api/daily-report — list all reports (latest first)
export async function GET() {
  const reports = await prisma.dailyReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(reports);
}

// POST /api/daily-report — generate today's morning report
// Protected by CRON_SECRET header when called by cron
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayString();

  // Idempotent: return existing report if already generated today
  const existing = await prisma.dailyReport.findUnique({
    where: { date_type: { date: today, type: "morning" } },
  });
  if (existing) return NextResponse.json(existing);

  // Gather context: last 7 evening responses for personalization
  const pastEvening = await prisma.dailyReport.findMany({
    where: { type: "evening", userResponse: { not: null } },
    orderBy: { date: "desc" },
    take: 7,
  });

  const pastResponses = pastEvening
    .map((r) => `[${r.date}]\n${r.userResponse}`)
    .join("\n\n---\n\n");

  // Gather habits & goals summary
  const [habits, goals] = await Promise.all([
    prisma.habit.findMany({
      include: { logs: { where: { date: today } } },
    }),
    prisma.goal.findMany({ where: { status: "active" } }),
  ]);

  const completedToday = habits.filter((h) => h.logs.some((l) => l.completed)).length;
  const habitsSummary = `${completedToday}/${habits.length} הרגלים הושלמו היום`;

  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;
  const goalsSummary = goals.length > 0
    ? `${goals.length} מטרות פעילות, התקדמות ממוצעת: ${avgProgress}%`
    : "אין מטרות פעילות";

  // Fetch AI news via web search (fallback to empty string if unavailable)
  let newsContext = "";
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];
    const newsRes = await fetch(
      `https://newsapi.org/v2/everything?q=artificial+intelligence&from=${dateStr}&to=${dateStr}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${process.env.NEWSAPI_KEY}`,
      { next: { revalidate: 0 } }
    );
    if (newsRes.ok) {
      const data = await newsRes.json();
      newsContext = (data.articles as { title: string; description: string }[])
        .map((a) => `• ${a.title}: ${a.description || ""}`)
        .join("\n");
    }
  } catch {
    newsContext = "לא הצלחתי לאחזר חדשות AI — Claude יסכם על פי ידע עדכני.";
  }

  const report = await generateMorningReport(
    newsContext,
    pastResponses,
    habitsSummary,
    goalsSummary,
    new Date()
  );

  const saved = await prisma.dailyReport.create({
    data: {
      date: today,
      type: "morning",
      aiNews: report.aiNews,
      personalDev: report.personalDev,
      writingTask1: report.writingTask1,
      writingTask2: report.writingTask2,
    },
  });

  // Build Telegram message
  const msg = buildMorningTelegramMessage(report, today);
  await sendTelegramMessage(msg);

  return NextResponse.json(saved);
}

// PUT /api/daily-report — save user's day plan response
export async function PUT(req: NextRequest) {
  const { date, dayPlan } = await req.json();
  const target = date || getTodayString();

  const updated = await prisma.dailyReport.updateMany({
    where: { date: target, type: "morning" },
    data: { dayPlan },
  });

  return NextResponse.json({ updated: updated.count });
}

function buildMorningTelegramMessage(
  report: { aiNews: string; personalDev: string; writingTask1: string; writingTask2: string },
  date: string
): string {
  return `☀️ *דוח בוקר — ${date}*

━━━━━━━━━━━━━━━━━━━━━
🤖 *חדשות בינה מלאכותית מאתמול*
━━━━━━━━━━━━━━━━━━━━━
${report.aiNews}

━━━━━━━━━━━━━━━━━━━━━
🌱 *פיתוח אישי להיום*
━━━━━━━━━━━━━━━━━━━━━
${report.personalDev}

━━━━━━━━━━━━━━━━━━━━━
✍️ *משימות כתיבה לחשיפה עצמית*
━━━━━━━━━━━━━━━━━━━━━
*משימה 1:*
${report.writingTask1}

*משימה 2:*
${report.writingTask2}

━━━━━━━━━━━━━━━━━━━━━
❓ *מה מתוכנן לך היום?*
ספר לי — ואסדר לך את הכל. בשעה 20:00 תקבל ממני התראה עם שאלות לסיכום היום.`;
}
