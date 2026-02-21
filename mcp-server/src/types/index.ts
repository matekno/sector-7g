export type ProjectStatus =
  | "IDEA"
  | "PLANNED"
  | "IN_PROGRESS"
  | "PAUSED"
  | "DONE"
  | "ARCHIVED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type NoteType =
  | "GENERAL"
  | "PLAN"
  | "DECISION"
  | "BRAINSTORM"
  | "SPEC"
  | "LOG"
  | "SUMMARY";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface TagsOnProjects {
  projectId: string;
  tagId: string;
  tag: Tag;
}

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  source: string | null;
  projectId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface File {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  projectId: string | null;
  noteId: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  repoUrl: string | null;
  deployUrl: string | null;
  blogUrl: string | null;
  extraLinks: Record<string, unknown> | null;
  tags: TagsOnProjects[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  _count?: { notes: number; files: number };
}

export interface FullProject extends Project {
  notes: Note[];
  files: File[];
}

export interface SearchResult {
  id: string;
  type: "project" | "note";
  title: string;
  snippet: string;
  projectId?: string;
  rank: number;
}

export interface PaginatedProjects {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}
