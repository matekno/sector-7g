import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import path from "path";
import crypto from "crypto";

// File uploads require local disk storage, not available on Vercel.
// When VERCEL=1 is set (injected automatically by Vercel), return 501.
export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "File uploads are not available in the hosted version. Use the local MCP server for file uploads." },
      { status: 501 }
    );
  }
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const noteId = formData.get("noteId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB ?? "10", 10);
  if (file.size > maxSizeMb * 1024 * 1024) {
    return NextResponse.json(
      { error: `File exceeds ${maxSizeMb}MB limit` },
      { status: 413 }
    );
  }

  // Validate project/note exist if provided
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }
  if (noteId) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
  }

  const ext = path.extname(file.name);
  const safeExt = ext.replace(/[^.a-zA-Z0-9]/g, "");
  const filename = `${crypto.randomUUID()}${safeExt}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await saveFile(filename, buffer);

  const dbFile = await prisma.file.create({
    data: {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      path: filename,
      ...(projectId ? { projectId } : {}),
      ...(noteId ? { noteId } : {}),
    },
  });

  return NextResponse.json(dbFile, { status: 201 });
}
