import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { TagBadge } from "@/components/tag-badge";
import { NoteList } from "@/components/note-list";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "🔴 Urgent",
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      files: { orderBy: { createdAt: "desc" } },
      notes: {
        orderBy: { updatedAt: "desc" },
        include: { files: true },
      },
    },
  });

  if (!project) notFound();

  const links = [
    project.repoUrl && { label: "Repo", href: project.repoUrl },
    project.deployUrl && { label: "Deploy", href: project.deployUrl },
    project.blogUrl && { label: "Blog", href: project.blogUrl },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Projects
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Project header */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-bold flex-1">{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">Priority: {PRIORITY_LABEL[project.priority]}</Badge>
            {project.tags.map((t) => (
              <TagBadge key={t.tag.id} name={t.tag.name} color={t.tag.color} />
            ))}
          </div>

          {project.description && (
            <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          )}

          {links.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleDateString("es-AR")} ·
            Updated {new Date(project.updatedAt).toLocaleDateString("es-AR")} ·
            ID: <code className="font-mono">{project.id}</code>
          </p>
        </div>

        {/* Notes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Notes{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({project.notes.length})
              </span>
            </h2>
          </div>
          <NoteList notes={project.notes} />
        </section>

        {/* Files */}
        {project.files.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Files{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({project.files.length})
              </span>
            </h2>
            <div className="space-y-2">
              {project.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.mimeType} · {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <a
                    href={`/api/files/${file.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
