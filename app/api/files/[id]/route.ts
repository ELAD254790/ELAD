import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await unlink(path.join(process.cwd(), "public", file.path));
  } catch {
    // File might not exist on disk
  }

  await prisma.uploadedFile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
