import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { prisma } from "@/lib/db";

const MODE_INSTRUCTIONS: Record<string, string> = {
  conversation:
    "Have a natural conversation. Correct only clear mistakes, not stylistic choices. Keep corrections concise.",
  writing:
    "Focus on grammar and writing quality. Give detailed corrections and suggest more sophisticated vocabulary and sentence structures.",
  speaking:
    "The user spoke aloud and their speech was transcribed. Focus on natural spoken English, contractions, and fluency. Note if their phrasing sounds unnatural in speech.",
  vocabulary:
    "Teach 3-5 new useful English words or phrases per turn, related to the conversation topic. Include idioms and collocations.",
};

function buildSystemPrompt(mode: string): string {
  const modeInstruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.conversation;
  return `You are an expert English language tutor for a Hebrew speaker. Help them reach native-level English as fast as possible.

IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no extra text, just the JSON.

JSON structure:
{
  "message": "<your main response in English>",
  "corrections": [
    {"original": "<what user wrote>", "corrected": "<better version>", "explanation": "<brief why>", "type": "grammar|vocabulary|idiom|pronunciation"}
  ],
  "vocabulary": [
    {"word": "<word or phrase>", "definition": "<clear definition>", "example": "<example sentence>", "level": "A2|B1|B2|C1"}
  ],
  "encouragement": "<optional one short sentence of praise if they did something well>"
}

Rules:
- "corrections" should be an empty array [] if the user wrote correctly
- "vocabulary" should be an empty array [] if no new words to teach
- Always teach through context, not dry definitions
- Be warm, encouraging, and patient
- Never switch to Hebrew
- Adapt your complexity to the user's demonstrated level

Mode: ${modeInstruction}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") || "english_default";
  const messages = await prisma.englishMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, sessionId = "english_default", mode = "conversation" } = body;

  await prisma.englishMessage.create({
    data: { sessionId, role: "user", content: message },
  });

  const history = await prisma.englishMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const messages = history.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: buildSystemPrompt(mode),
    messages,
  });

  let rawContent = "";
  for (const block of response.content) {
    if (block.type === "text") rawContent += block.text;
  }

  let parsed: {
    message: string;
    corrections: Array<{ original: string; corrected: string; explanation: string; type: string }>;
    vocabulary: Array<{ word: string; definition: string; example: string; level: string }>;
    encouragement?: string;
  };

  try {
    // Strip markdown code fences if Claude wraps in ```json
    const clean = rawContent.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = { message: rawContent, corrections: [], vocabulary: [] };
  }

  const saved = await prisma.englishMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: parsed.message,
      rawResponse: JSON.stringify(parsed),
    },
  });

  // Persist new vocabulary words
  if (parsed.vocabulary?.length) {
    for (const v of parsed.vocabulary) {
      try {
        await prisma.englishWord.upsert({
          where: { word: v.word.toLowerCase() },
          update: {},
          create: {
            word: v.word.toLowerCase(),
            definition: v.definition,
            example: v.example ?? null,
            level: v.level ?? "B1",
          },
        });
      } catch {
        // skip duplicate
      }
    }
  }

  return NextResponse.json({ ...saved, parsed });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") || "english_default";
  await prisma.englishMessage.deleteMany({ where: { sessionId } });
  return NextResponse.json({ success: true });
}
