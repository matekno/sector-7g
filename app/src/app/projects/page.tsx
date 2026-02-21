import { prisma } from "@/lib/prisma";
import { ProjectCard } from "@/components/project-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "IN_PROGRESS", label: "🚧 In Progress" },
  { value: "PLANNED", label: "📋 Planned" },
  { value: "IDEA", label: "💡 Ideas" },
  { value: "PAUSED", label: "⏸ Paused" },
  { value: "DONE", label: "✅ Done" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; priority?: string; tag?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status as ProjectStatus | undefined;
  const priority = params.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
  const tag = params.tag;

  const projects = await prisma.project.findMany({
    where: {
      archivedAt: status === "ARCHIVED" ? { not: null } : null,
      ...(status && status !== "ARCHIVED" ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      tags: { include: { tag: true } },
      _count: { select: { notes: true, files: true } },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">
            ⚛️ Sector 7G{" "}
            <span className="text-muted-foreground font-normal text-sm">
              — Backlog
            </span>
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <Link href="/projects">
            <Badge
              variant={!status ? "default" : "outline"}
              className="cursor-pointer"
            >
              All
            </Badge>
          </Link>
          {STATUSES.map((s) => (
            <Link key={s.value} href={`/projects?status=${s.value}`}>
              <Badge
                variant={status === s.value ? "default" : "outline"}
                className="cursor-pointer"
              >
                {s.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Active filters info */}
        {(status || priority || tag) && (
          <div className="text-sm text-muted-foreground flex gap-2 items-center">
            <span>Filtering by:</span>
            {status && <Badge variant="secondary">{status}</Badge>}
            {priority && <Badge variant="secondary">{priority}</Badge>}
            {tag && <Badge variant="secondary">#{tag}</Badge>}
            <Link href="/projects" className="text-xs underline">
              Clear
            </Link>
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>

        {/* Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">🏭</p>
            <p className="text-lg font-medium">No projects here yet</p>
            <p className="text-sm mt-2">
              Tell Claude: &ldquo;Creame un proyecto en Sector 7G&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
