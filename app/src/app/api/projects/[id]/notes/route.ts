import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NoteType } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const skip = (page - 1) * limit;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where: { projectId: id },
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { files: true },
    }),
    prisma.note.count({ where: { projectId: id } }),
  ]);

  return NextResponse.json({ notes, total, page, limit });
}

const CreateNoteSchema = z.object({
  content: z.string().min(1),
  type: z.nativeEnum(NoteType).optional(),
  source: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = CreateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: {
      content: parsed.data.content,
      type: parsed.data.type ?? "GENERAL",
      source: parsed.data.source ?? "manual",
      projectId: id,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
