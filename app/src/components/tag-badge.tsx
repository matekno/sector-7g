import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  name: string;
  color?: string | null;
}

export function TagBadge({ name, color }: TagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      style={color ? { backgroundColor: color, color: "#fff" } : undefined}
      className="text-xs"
    >
      {name}
    </Badge>
  );
}
