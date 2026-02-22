import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await prisma.noteVersion.findMany({
    where: { noteId: id },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(versions);
}
