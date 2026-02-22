import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProjectStatus, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status") as ProjectStatus | null;
  const priority = searchParams.get("priority") as Priority | null;
  const tag = searchParams.get("tag");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {
    archivedAt: status === "ARCHIVED" ? { not: null } : null,
    ...(status && status !== "ARCHIVED" ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { notes: true, files: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({ projects, total, page, limit });
}

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  repoUrl: z.string().url().optional().or(z.literal("")),
  deployUrl: z.string().url().optional().or(z.literal("")),
  blogUrl: z.string().url().optional().or(z.literal("")),
  extraLinks: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tags, extraLinks, ...data } = parsed.data;

  const resolvedTagIds: string[] = [];
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
      });
      resolvedTagIds.push(tag.id);
    }
  }

  const project = await prisma.project.create({
    data: {
      ...data,
      repoUrl: data.repoUrl || null,
      deployUrl: data.deployUrl || null,
      blogUrl: data.blogUrl || null,
      ...(extraLinks !== undefined
        ? { extraLinks: extraLinks as Prisma.InputJsonValue }
        : {}),
      ...(resolvedTagIds.length > 0
        ? { tags: { create: resolvedTagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
    include: {
      tags: { include: { tag: true } },
      _count: { select: { notes: true, files: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
