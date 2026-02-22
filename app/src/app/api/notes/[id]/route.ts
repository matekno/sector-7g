import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NoteType } from "@prisma/client";

const UpdateNoteSchema = z.object({
  content: z.string().min(1),
  type: z.nativeEnum(NoteType).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Auto-versioning: snapshot current content before applying update
  const updated = await prisma.$transaction(async (tx) => {
    await tx.noteVersion.create({
      data: {
        noteId: id,
        content: note.content,
        version: note.version,
      },
    });

    return tx.note.update({
      where: { id },
      data: {
        content: parsed.data.content,
        type: parsed.data.type ?? note.type,
        version: note.version + 1,
      },
    });
  });

  return NextResponse.json(updated);
}
