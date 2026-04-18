import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const identity = await prisma.identity.findFirst();
  return NextResponse.json(identity);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const existing = await prisma.identity.findFirst();

  if (existing) {
    const updated = await prisma.identity.update({
      where: { id: existing.id },
      data: {
        whoBecoming: body.whoBecoming,
        standards: body.standards,
        nonNegotiables: body.nonNegotiables,
        rules: body.rules,
        values: body.values,
        vision: body.vision,
      },
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.identity.create({
    data: {
      whoBecoming: body.whoBecoming,
      standards: body.standards,
      nonNegotiables: body.nonNegotiables,
      rules: body.rules,
      values: body.values,
      vision: body.vision,
    },
  });
  return NextResponse.json(created);
}
