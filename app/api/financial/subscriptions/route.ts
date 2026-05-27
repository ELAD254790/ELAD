import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const subscriptions = await prisma.financialSubscription.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(subscriptions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, amount, billingDay, category } = body;

  const subscription = await prisma.financialSubscription.create({
    data: { name, amount: parseFloat(amount), billingDay: parseInt(billingDay), category: category || "other" },
  });
  return NextResponse.json(subscription);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, active, name, amount, billingDay, category } = body;

  const subscription = await prisma.financialSubscription.update({
    where: { id },
    data: {
      ...(active !== undefined && { active }),
      ...(name && { name }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(billingDay !== undefined && { billingDay: parseInt(billingDay) }),
      ...(category && { category }),
    },
  });
  return NextResponse.json(subscription);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.financialSubscription.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
