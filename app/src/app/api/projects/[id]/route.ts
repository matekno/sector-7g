import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProjectStatus, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      notes: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      files: { orderBy: { createdAt: "desc" } },
      _count: { select: { notes: true, files: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  repoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  deployUrl: z.string().url().optional().or(z.literal("")).nullable(),
  blogUrl: z.string().url().optional().or(z.literal("")).nullable(),
  extraLinks: z.record(z.string(), z.unknown()).optional().nullable(),
  addTags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { addTags, removeTags, extraLinks, ...data } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (addTags && addTags.length > 0) {
    for (const tagName of addTags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
      });
      await prisma.tagsOnProjects.upsert({
        where: { projectId_tagId: { projectId: id, tagId: tag.id } },
        update: {},
        create: { projectId: id, tagId: tag.id },
      });
    }
  }

  if (removeTags && removeTags.length > 0) {
    const tagsToRemove = await prisma.tag.findMany({
      where: { name: { in: removeTags } },
    });
    for (const tag of tagsToRemove) {
      await prisma.tagsOnProjects.deleteMany({
        where: { projectId: id, tagId: tag.id },
      });
    }
  }

  // Keep archivedAt in sync with status changes
  const archivedAtPatch =
    data.status === "ARCHIVED"
      ? { archivedAt: project.archivedAt ?? new Date() }
      : data.status !== undefined
      ? { archivedAt: null }
      : {};

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      ...archivedAtPatch,
      ...(extraLinks !== undefined
        ? {
            extraLinks:
              extraLinks === null
                ? Prisma.DbNull
                : (extraLinks as Prisma.InputJsonValue),
          }
        : {}),
      updatedAt: new Date(),
    },
    include: {
      tags: { include: { tag: true } },
      _count: { select: { notes: true, files: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hard = request.nextUrl.searchParams.get("hard") === "true";

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (hard) {
    await prisma.project.delete({ where: { id } });
  } else {
    await prisma.project.update({
      where: { id },
      data: { archivedAt: new Date(), status: "ARCHIVED" },
    });
  }

  return new NextResponse(null, { status: 204 });
}
