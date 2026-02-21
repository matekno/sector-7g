import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/[id]/full
 * Returns complete project context for MCP use:
 * all notes (no pagination), all files, all tags, last 3 versions per note.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      files: { orderBy: { createdAt: "desc" } },
      notes: {
        orderBy: { updatedAt: "desc" },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 3,
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
