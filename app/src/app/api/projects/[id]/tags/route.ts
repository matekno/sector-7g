import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AddTagSchema = z.object({
  name: z.string().min(1).optional(),
  tagId: z.string().optional(),
  color: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = AddTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let tagId = parsed.data.tagId;

  if (!tagId && parsed.data.name) {
    const tag = await prisma.tag.upsert({
      where: { name: parsed.data.name },
      update: { color: parsed.data.color },
      create: { name: parsed.data.name, color: parsed.data.color },
    });
    tagId = tag.id;
  }

  if (!tagId) {
    return NextResponse.json(
      { error: "Provide either tagId or name" },
      { status: 400 }
    );
  }

  const relation = await prisma.tagsOnProjects.upsert({
    where: { projectId_tagId: { projectId: id, tagId } },
    update: {},
    create: { projectId: id, tagId },
    include: { tag: true },
  });

  return NextResponse.json(relation, { status: 201 });
}
