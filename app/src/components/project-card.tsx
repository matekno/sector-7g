import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { TagBadge } from "@/components/tag-badge";
import type { ProjectStatus, Priority } from "@prisma/client";

interface Tag {
  tag: { id: string; name: string; color: string | null };
}

interface ProjectCardProps {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  tags: Tag[];
  _count?: { notes: number; files: number };
}

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "🔴 Urgent",
};

export function ProjectCard({ id, title, description, status, priority, tags, _count }: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug line-clamp-2">{title}</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <TagBadge key={t.tag.id} name={t.tag.name} color={t.tag.color} />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Priority: {PRIORITY_LABEL[priority]}</span>
            {_count && (
              <span>
                {_count.notes} note{_count.notes !== 1 ? "s" : ""}
                {_count.files > 0 ? ` · ${_count.files} file${_count.files !== 1 ? "s" : ""}` : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
