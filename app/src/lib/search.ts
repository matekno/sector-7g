import { prisma } from "@/lib/prisma";

export type SearchResultType = "project" | "note";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  projectId?: string;
  rank: number;
}

// Sanitize query for to_tsquery: replace special chars, join words with &
function sanitizeQuery(q: string): string {
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/g, ""))
    .filter(Boolean)
    .join(" & ");
}

export async function fullTextSearch(
  query: string,
  type: "projects" | "notes" | "all" = "all",
  limit = 10
): Promise<SearchResult[]> {
  const tsQuery = sanitizeQuery(query);
  if (!tsQuery) return [];

  const results: SearchResult[] = [];

  if (type === "projects" || type === "all") {
    const projectResults = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string | null;
        rank: number;
      }>
    >`
      SELECT
        id,
        title,
        description,
        ts_rank(
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')),
          to_tsquery('english', ${tsQuery})
        ) as rank
      FROM "Project"
      WHERE
        "archivedAt" IS NULL
        AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
          @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    for (const r of projectResults) {
      results.push({
        id: r.id,
        type: "project",
        title: r.title,
        snippet: r.description ? r.description.slice(0, 200) : "",
        rank: Number(r.rank),
      });
    }
  }

  if (type === "notes" || type === "all") {
    const noteResults = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        projectId: string;
        rank: number;
      }>
    >`
      SELECT
        n.id,
        n.content,
        n."projectId",
        ts_rank(
          to_tsvector('english', n.content),
          to_tsquery('english', ${tsQuery})
        ) as rank
      FROM "Note" n
      INNER JOIN "Project" p ON p.id = n."projectId"
      WHERE
        p."archivedAt" IS NULL
        AND to_tsvector('english', n.content)
          @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    for (const r of noteResults) {
      results.push({
        id: r.id,
        type: "note",
        title: r.content.slice(0, 80),
        snippet: r.content.slice(0, 200),
        projectId: r.projectId,
        rank: Number(r.rank),
      });
    }
  }

  return results.sort((a, b) => b.rank - a.rank).slice(0, limit);
}
