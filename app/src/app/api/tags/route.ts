import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(tags);
}

const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { name: parsed.data.name },
    update: { color: parsed.data.color },
    create: { name: parsed.data.name, color: parsed.data.color },
  });

  return NextResponse.json(tag, { status: 201 });
}
