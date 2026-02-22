import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  const versionNum = parseInt(version, 10);

  if (isNaN(versionNum)) {
    return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
  }

  const noteVersion = await prisma.noteVersion.findFirst({
    where: { noteId: id, version: versionNum },
  });

  if (!noteVersion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(noteVersion);
}
