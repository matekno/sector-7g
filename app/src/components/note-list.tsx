import type { NoteType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; className: string }> = {
  GENERAL: { label: "General", className: "bg-gray-100 text-gray-700" },
  PLAN: { label: "Plan", className: "bg-blue-100 text-blue-700" },
  DECISION: { label: "Decision", className: "bg-purple-100 text-purple-700" },
  BRAINSTORM: { label: "Brainstorm", className: "bg-yellow-100 text-yellow-700" },
  SPEC: { label: "Spec", className: "bg-orange-100 text-orange-700" },
  LOG: { label: "Log", className: "bg-green-100 text-green-700" },
  SUMMARY: { label: "Summary", className: "bg-indigo-100 text-indigo-700" },
};

interface NoteItem {
  id: string;
  content: string;
  type: NoteType;
  source: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export function NoteList({ notes }: { notes: NoteItem[] }) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No notes yet. Add one via Claude or the API.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => {
        const config = NOTE_TYPE_CONFIG[note.type];
        const date = new Date(note.createdAt).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <div key={note.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className={config.className}>
                {config.label}
              </Badge>
              <span>{date}</span>
              {note.source && <span className="opacity-60">via {note.source}</span>}
              {note.version > 1 && (
                <span className="opacity-60">v{note.version}</span>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          </div>
        );
      })}
    </div>
  );
}
