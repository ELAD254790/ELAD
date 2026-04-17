import { anthropic } from "./anthropic";

// 30 rotating personal-development themes, one per day-of-month
const MORNING_THEMES = [
  "הסיפור שאתה מספר לעצמך",
  "הפער בין מי שאתה לבין מי שאתה חושב שאתה",
  "עלות ההימנעות — מה אתה משלם על מה שאתה נמנע ממנו",
  "פחד מול אינטואיציה — איך לדעת את ההבדל",
  "מי אתה ברגעי קונפליקט",
  "האנשים שעיצבו אותך — בחינה מחודשת",
  "מה אתה באמת רוצה מול מה שאתה רודף אחריו",
  'המיתוס של "יום אחד"',
  "אינטליגנציה רגשית — לא תיאוריה, אלא יישום",
  "כוחו של משפט שלם — דיוק בתקשורת פנימית וחיצונית",
  "איך אתה מתמודד עם כישלון — תבנית עמוקה",
  "הקשרים שאתה שומר — ולמה",
  "חמלה עצמית שאינה ויתור עצמי",
  "ניהול אנרגיה ולא ניהול זמן",
  "הסיפורים של 'למה' — מה מניע אותך ב-א-מ-ת",
  "לומר לא כביטוי כבוד עצמי",
  "השוואה לאחרים — כלי צמיחה או כלי הרס",
  "אשליית אזור הנוחות",
  "תקשורת אותנטית — מה זה אומר בפועל",
  "התקדמות מול שלמות",
  "האנשים שמרוקנים ממך אנרגיה — ומה לעשות",
  "מה שאתה צורך מעצב אותך",
  "האומץ להיראות — לא לביצועים, אלא לעצמי",
  "בדידות וידע עצמי",
  "גבולות ואהבה — כיצד הם חיים יחד",
  'הסיפורים של "אני לא יכול"',
  "קבלת החלטות בחוסר ודאות",
  "משקל הדברים הלא גמורים",
  "נוכחות ותשומת לב — המיומנות הנדירה ביותר",
  "צמיחה דרך קושי — לא בכל מחיר, אבל תמיד בדרך",
];

// 60 rotating evening questions (used in pairs, advancing with report count)
const EVENING_QUESTIONS_POOL = [
  "מה עשית היום שגרם לך להרגיש גאה בעצמך — לא בעיניי אחרים, אלא בעיניי עצמך?",
  "מה נמנעת לעשות היום ולמה? מה אמרת לעצמך כדי להצדיק זאת?",
  "באיזה רגע היום הרגשת הכי אמיתי? באיזה רגע הרגשת שאתה משחק תפקיד?",
  "מה היה הדבר הכי קשה שעשית היום? מה עזר לך לעשות אותו?",
  "מי השפיע עליך היום — לטובה או לרעה? איך הגבת ומה ריצה אותך?",
  "אם היית מסכם את היום בשלוש מילים שאף אחד לא ישמע — מה היה כתוב?",
  "מה למדת על עצמך היום שלא ידעת אתמול?",
  "מה אמרת היום שלא התכוונת לו? ומה לא אמרת שהיית צריך?",
  "מה הציפייה שהייתה לך מהיום שלא התממשה? מה זה מלמד?",
  "מה היה הרגע בו הגבת בצורה שלא אהבת בעצמך?",
  "מה ביזבזת עליו אנרגיה שלא היה שווה? מה היית עושה אחרת?",
  "עם מי היום הרגשת שאתה באמת נוכח? עם מי הייתה רק הנוכחות שלך גופנית?",
  "מה הייתה ההחלטה הכי קטנה של היום שבכל זאת דרשה אומץ?",
  "מה אמרת 'כן' שהיית רוצה לומר 'לא'? ומה גרם לך לומר 'כן'?",
  "מה השאלה שהיית שואל אותך אם היית המאמן שלך — ומה היית עונה?",
  "תאר רגע של חוסר סבלנות שחווית היום. מה מתחת לחוסר הסבלנות?",
  "מה עשית היום רק כי הרגשת שחייב — ולא כי רצית? מה זה מספר לך?",
  "מה הייתה הפעולה שדחית הכי הרבה? מה המחיר של הדחייה?",
  "איפה היית הכי ממוקד היום? מה גרם לכך?",
  "מה הייתה המחשבה שחזרה הכי הרבה פעמים? מה היא מבקשת?",
  "תאר שיחה שהתנהלה בראשך אחרי שיחה אמיתית. מה ביקשת לומר ולא אמרת?",
  "מה עשית היום כדי להתקדם לעבר מי שאתה רוצה להיות?",
  "מה היה הרגע שהכי התחברת לאנשים שסביבך? מה ייחד אותו?",
  "מה אהבת בעצמך היום? (לפחות דבר אחד — גם אם קשה)",
  "מה התחיל היום שעוד לא הגיע לסיום — במחשבה, בפעולה, בתחושה?",
  "מה אתה מוכן לעשות מחר שלא עשית היום?",
  "מה הרגיש כאילו אתה 'שולט' היום — ובאמת לא?",
  "מה הדבר שהכי גרה אותך רגשית היום? מה מתחתיו?",
  "היכן הרגשת צורך לקבל אישור היום? ממי? למה זה חשוב לך?",
  "מה גילית על עצמך בפני אחרים היום — בכוונה או בשוגג?",
];

export interface MorningReport {
  aiNews: string;
  personalDev: string;
  writingTask1: string;
  writingTask2: string;
}

export interface EveningCheckin {
  questions: string[];
  insight?: string;
}

export async function generateMorningReport(
  newsContext: string,
  pastResponses: string,
  habitsSummary: string,
  goalsSummary: string,
  date: Date
): Promise<MorningReport> {
  const dayOfMonth = date.getDate();
  const theme = MORNING_THEMES[(dayOfMonth - 1) % MORNING_THEMES.length];

  const prompt = `
היום: ${date.toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
נושא יומי לפיתוח אישי: **${theme}**

הקשר על המשתמש מהשבוע האחרון (תשובות ערב קודמות):
${pastResponses || "אין עדיין תשובות קודמות — זה הדוח הראשון."}

מצב הרגלים: ${habitsSummary || "אין נתונים"}
מצב מטרות: ${goalsSummary || "אין נתונים"}

חדשות AI מאתמול (תקציר גולמי):
${newsContext}

---

צור את הדוח הבא בפורמט JSON מדויק. כל שדה חייב להיות מלא וכתוב בעברית:

{
  "aiNews": "...",
  "personalDev": "...",
  "writingTask1": "...",
  "writingTask2": "..."
}

**הנחיות לכל שדה:**

aiNews: כתוב סיכום עשיר ומנותח של חדשות ה-AI מאתמול. לא רשימת פריטים יבשה — אלא ניתוח. מה קרה? למה זה חשוב? מה המשמעות לחיי היומיום ולתעסוקה? מה כדאי לשים לב אליו? 300-400 מילים.

personalDev: כתוב על הנושא "${theme}" בעומק אמיתי. לא טיפים גנריים — אלא חדירה לתוך הנושא. תן דוגמאות חיות, תופעות שאנשים מכירים מחיי היומיום, תובנות מבוססות על פסיכולוגיה ומחקר, ואמת שלפעמים קשה לשמוע. כתוב כאילו אתה שוחח עם אדם בוגר ורפלקטיבי שרוצה להתקדם באמת. 400-500 מילים.

writingTask1: משימת כתיבה ראשונה לחשיפה עצמית. זה לא יומן — זה כלי לחקירה עצמית. שאלה ספציפית, ממוקדת, שמאלצת חשיבה לא נוחה ועמוקה. לא "כתוב על מטרותיך" — אלא שאלה שגורמת לאדם לעצור ולחפור. 50-70 מילים.

writingTask2: משימת כתיבה שנייה שמשלימה את הראשונה — פרספקטיבה שונה, זווית חדשה. שתי המשימות ביחד אמורות לאפשר לאדם לראות משהו על עצמו שלא ראה קודם. 50-70 מילים.

חשוב: החזר JSON בלבד, ללא טקסט נוסף.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse morning report JSON from Claude");
  return JSON.parse(jsonMatch[0]) as MorningReport;
}

export async function generateEveningCheckin(
  pastQuestionIndices: number[],
  pastResponses: string,
  habitsSummary: string,
  goalsSummary: string,
  reportCount: number
): Promise<EveningCheckin> {
  // Pick 3 questions not used recently
  const used = new Set(pastQuestionIndices);
  const available = EVENING_QUESTIONS_POOL
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !used.has(i));
  const picked = available.slice(0, 3).map(({ q }) => q);
  const pickedIndices = available.slice(0, 3).map(({ i }) => i);

  let insight: string | undefined;

  if (pastResponses && reportCount > 1) {
    const insightPrompt = `
אתה מאמן לפיתוח אישי שמלווה אדם לאורך זמן.
להלן תשובות ממנו מהימים האחרונים:

${pastResponses}

נתח בקצרה (150-200 מילים בעברית):
- מה אתה רואה כנושא חוזר או דפוס?
- האם יש התקדמות? היכן?
- מה אחד הדברים שכדאי לשים לב אליו?
החזר ניתוח כנה, לא מחמיא, שמסייע לאדם לראות את עצמו יותר בבהירות.
`.trim();

    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: insightPrompt }],
    });
    insight = r.content[0].type === "text" ? r.content[0].text : undefined;
  }

  return { questions: picked, insight, ...{ _indices: pickedIndices } } as EveningCheckin & { _indices: number[] };
}

export function getUsedQuestionIndices(raw: string | null): number[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}
