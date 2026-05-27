import { NextRequest, NextResponse } from "next/server";
import { financialAnthropic, FINANCIAL_ADVISOR_SYSTEM_PROMPT, getFinancialContext } from "@/lib/financial-advisor";
import { prisma } from "@/lib/db";

export async function GET() {
  const messages = await prisma.financialChatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  await prisma.financialChatMessage.create({
    data: { role: "user", content: message },
  });

  const history = await prisma.financialChatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const financialContext = await getFinancialContext();
  const systemPrompt = FINANCIAL_ADVISOR_SYSTEM_PROMPT + financialContext;

  const messages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await financialAnthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  let assistantContent = "";
  for (const block of response.content) {
    if (block.type === "text") assistantContent += block.text;
  }

  const saved = await prisma.financialChatMessage.create({
    data: { role: "assistant", content: assistantContent },
  });

  return NextResponse.json(saved);
}

export async function DELETE() {
  await prisma.financialChatMessage.deleteMany();
  return NextResponse.json({ success: true });
}
