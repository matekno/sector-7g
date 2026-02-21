import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@prisma/client";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  IDEA: { label: "💡 Idea", variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
  PLANNED: { label: "📋 Planned", variant: "secondary", className: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "🚧 In Progress", variant: "default", className: "bg-green-100 text-green-800" },
  PAUSED: { label: "⏸ Paused", variant: "secondary", className: "bg-gray-100 text-gray-600" },
  DONE: { label: "✅ Done", variant: "secondary", className: "bg-emerald-100 text-emerald-800" },
  ARCHIVED: { label: "📦 Archived", variant: "outline", className: "opacity-60" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
