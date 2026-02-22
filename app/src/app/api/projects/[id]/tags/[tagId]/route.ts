import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id, tagId } = await params;

  const relation = await prisma.tagsOnProjects.findUnique({
    where: { projectId_tagId: { projectId: id, tagId } },
  });

  if (!relation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tagsOnProjects.delete({
    where: { projectId_tagId: { projectId: id, tagId } },
  });

  return new NextResponse(null, { status: 204 });
}
