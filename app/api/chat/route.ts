import { NextRequest, NextResponse } from "next/server";
import { anthropic, SYSTEM_PROMPT } from "@/lib/anthropic";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") || "default";
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, sessionId = "default" } = body;

  await prisma.chatMessage.create({
    data: { sessionId, role: "user", content: message },
  });

  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const messages = history.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let assistantContent = "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  for (const block of response.content) {
    if (block.type === "text") {
      assistantContent += block.text;
    }
  }

  const saved = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: assistantContent,
    },
  });

  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") || "default";
  await prisma.chatMessage.deleteMany({ where: { sessionId } });
  return NextResponse.json({ success: true });
}
