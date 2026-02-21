/**
 * MCP tools registered directly with Prisma (used by the /api/mcp route on Vercel).
 * These are equivalent to mcp-server/src/tools/ but call Prisma directly instead of HTTP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fullTextSearch } from "@/lib/search";
import { Prisma, ProjectStatus, Priority, NoteType } from "@prisma/client";

type TextContent = { type: "text"; text: string };
const text = (t: string): { content: TextContent[] } => ({
  content: [{ type: "text", text: t }],
});

// Fuzzy match project by title
async function findProjectByTitle(title: string) {
  const projects = await prisma.project.findMany({
    where: { archivedAt: null },
    take: 100,
    select: { id: true, title: true },
  });
  const lower = title.toLowerCase();
  return (
    projects.find((p) => p.title === title) ??
    projects.find((p) => p.title.toLowerCase() === lower) ??
    projects.find(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        lower.includes(p.title.toLowerCase())
    ) ??
    null
  );
}

export function registerMcpTools(server: McpServer) {
  // 1. create_project
  server.tool(
    "create_project",
    "Create a new project in Sector 7G.",
    {
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.nativeEnum(ProjectStatus).optional().default("IDEA"),
      priority: z.nativeEnum(Priority).optional().default("MEDIUM"),
      repoUrl: z.string().url().optional(),
      deployUrl: z.string().url().optional(),
      blogUrl: z.string().url().optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ tags, ...data }) => {
      const resolvedTagIds: string[] = [];
      if (tags?.length) {
        for (const name of tags) {
          const tag = await prisma.tag.upsert({
            where: { name },
            update: {},
            create: { name },
          });
          resolvedTagIds.push(tag.id);
        }
      }
      const project = await prisma.project.create({
        data: {
          ...data,
          ...(resolvedTagIds.length > 0
            ? { tags: { create: resolvedTagIds.map((tagId) => ({ tagId })) } }
            : {}),
        },
        include: { tags: { include: { tag: true } } },
      });
      const tagNames = project.tags.map((t) => t.tag.name).join(", ");
      return text(
        `✅ Project created: **${project.title}**\nID: ${project.id}\nStatus: ${project.status} | Priority: ${project.priority}${tagNames ? `\nTags: ${tagNames}` : ""}`
      );
    }
  );

  // 2. add_note
  server.tool(
    "add_note",
    "Add a note to a project. Use projectTitle for fuzzy match or projectId for exact. This is the primary tool for 'save this to Sector 7G' flows.",
    {
      content: z.string().min(1),
      projectId: z.string().optional(),
      projectTitle: z.string().optional(),
      type: z.nativeEnum(NoteType).optional().default("GENERAL"),
      source: z.string().optional().default("claude-chat"),
    },
    async ({ content, projectId, projectTitle, type, source }) => {
      let id = projectId;
      if (!id) {
        if (!projectTitle) return text("❌ Provide projectId or projectTitle.");
        const found = await findProjectByTitle(projectTitle);
        if (!found) return text(`❌ No project found matching "${projectTitle}". Use create_project first.`);
        id = found.id;
      }
      const note = await prisma.note.create({
        data: { content, type: type ?? "GENERAL", source: source ?? "claude-chat", projectId: id },
      });
      return text(
        `✅ Note added.\nNote ID: ${note.id}\nType: ${note.type} | Source: ${note.source ?? "manual"}\nPreview: ${note.content.slice(0, 120)}${note.content.length > 120 ? "..." : ""}`
      );
    }
  );

  // 3. get_project
  server.tool(
    "get_project",
    "Get full context of a project (all notes, files, tags). Use projectId or title (fuzzy).",
    {
      projectId: z.string().optional(),
      title: z.string().optional(),
    },
    async ({ projectId, title }) => {
      let id = projectId;
      if (!id) {
        if (!title) return text("❌ Provide projectId or title.");
        const found = await findProjectByTitle(title);
        if (!found) return text(`❌ No project found matching "${title}".`);
        id = found.id;
      }
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          tags: { include: { tag: true } },
          files: { orderBy: { createdAt: "desc" } },
          notes: {
            orderBy: { updatedAt: "desc" },
            include: { versions: { orderBy: { version: "desc" }, take: 1 } },
          },
        },
      });
      if (!project) return text("❌ Project not found.");

      const tagNames = project.tags.map((t) => t.tag.name).join(", ");
      const notesText =
        project.notes.length === 0
          ? "  (no notes yet)"
          : project.notes
              .map(
                (n, i) =>
                  `  ${i + 1}. [${n.type}] ${new Date(n.createdAt).toLocaleDateString()} (v${n.version})\n     ${n.content.slice(0, 200)}${n.content.length > 200 ? "..." : ""}`
              )
              .join("\n");
      const filesText =
        project.files.length === 0
          ? "  (no files)"
          : project.files.map((f) => `  - ${f.filename} (${f.mimeType})`).join("\n");

      return text(
        [
          `# ${project.title}`,
          `ID: ${project.id}`,
          `Status: ${project.status} | Priority: ${project.priority}`,
          tagNames ? `Tags: ${tagNames}` : null,
          project.description ? `\nDescription:\n${project.description}` : null,
          project.repoUrl ? `Repo: ${project.repoUrl}` : null,
          `\n## Notes (${project.notes.length})\n${notesText}`,
          `\n## Files (${project.files.length})\n${filesText}`,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
  );

  // 4. list_projects
  server.tool(
    "list_projects",
    "List projects with optional filters.",
    {
      status: z.nativeEnum(ProjectStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
      tag: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    async ({ status, priority, tag, limit }) => {
      const where: Prisma.ProjectWhereInput = {
        archivedAt: status === "ARCHIVED" ? { not: null } : null,
        ...(status && status !== "ARCHIVED" ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
      };
      const projects = await prisma.project.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          tags: { include: { tag: true } },
          _count: { select: { notes: true } },
        },
      });
      if (projects.length === 0) return text("No projects found.");

      const EMOJI: Record<string, string> = {
        IDEA: "💡", PLANNED: "📋", IN_PROGRESS: "🚧",
        PAUSED: "⏸️", DONE: "✅", ARCHIVED: "📦",
      };
      const lines = projects.map((p) => {
        const tags = p.tags.length > 0 ? ` [${p.tags.map((t) => t.tag.name).join(", ")}]` : "";
        return `${EMOJI[p.status] ?? ""} **${p.title}** (${p.id.slice(0, 8)})${tags} — ${p._count.notes} notes`;
      });
      return text(`${projects.length} projects:\n\n${lines.join("\n")}`);
    }
  );

  // 5. update_project
  server.tool(
    "update_project",
    "Update a project's fields, status, priority, or tags.",
    {
      projectId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.nativeEnum(ProjectStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
      repoUrl: z.string().url().optional(),
      deployUrl: z.string().url().optional(),
      addTags: z.array(z.string()).optional(),
      removeTags: z.array(z.string()).optional(),
    },
    async ({ projectId, addTags, removeTags, ...data }) => {
      if (addTags?.length) {
        for (const name of addTags) {
          const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
          await prisma.tagsOnProjects.upsert({
            where: { projectId_tagId: { projectId, tagId: tag.id } },
            update: {},
            create: { projectId, tagId: tag.id },
          });
        }
      }
      if (removeTags?.length) {
        const toRemove = await prisma.tag.findMany({ where: { name: { in: removeTags } } });
        for (const tag of toRemove) {
          await prisma.tagsOnProjects.deleteMany({ where: { projectId, tagId: tag.id } });
        }
      }
      const project = await prisma.project.update({
        where: { id: projectId },
        data: { ...data, updatedAt: new Date() },
        include: { tags: { include: { tag: true } } },
      });
      const tagNames = project.tags.map((t) => t.tag.name).join(", ");
      return text(`✅ Updated: **${project.title}**\nStatus: ${project.status} | Priority: ${project.priority}\nTags: ${tagNames || "(none)"}`);
    }
  );

  // 6. search
  server.tool(
    "search",
    "Full-text search across projects and notes.",
    {
      query: z.string().min(1),
      type: z.enum(["projects", "notes", "all"]).optional().default("all"),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    async ({ query, type, limit }) => {
      const results = await fullTextSearch(query, type, limit);
      if (results.length === 0) return text(`No results for "${query}".`);
      const lines = results.map((r, i) => {
        const t = r.type === "project" ? "📁" : "📝";
        return `${i + 1}. ${t} **${r.title}** (${r.id.slice(0, 8)})\n   ${r.snippet.slice(0, 150)}`;
      });
      return text(`Results for "${query}" (${results.length}):\n\n${lines.join("\n")}`);
    }
  );

  // 7. backlog_summary
  server.tool(
    "backlog_summary",
    "Get a summary of the Sector 7G backlog by status.",
    { includeArchived: z.boolean().optional().default(false) },
    async ({ includeArchived }) => {
      const statuses: ProjectStatus[] = ["IN_PROGRESS", "PLANNED", "IDEA", "PAUSED", "DONE"];
      if (includeArchived) statuses.push("ARCHIVED");

      const results = await Promise.all(
        statuses.map((status) =>
          prisma.project.findMany({
            where: {
              archivedAt: status === "ARCHIVED" ? { not: null } : null,
              ...(status !== "ARCHIVED" ? { status } : {}),
            },
            take: 5,
            include: { tags: { include: { tag: true } }, _count: { select: { notes: true } } },
          })
        )
      );

      const EMOJI: Record<string, string> = {
        IN_PROGRESS: "🚧", PLANNED: "📋", IDEA: "💡",
        PAUSED: "⏸️", DONE: "✅", ARCHIVED: "📦",
      };
      const sections = statuses.map((status, i) => {
        const projects = results[i];
        if (projects.length === 0) return `${EMOJI[status]} **${status}**: (none)`;
        const lines = projects.map(
          (p) =>
            `  - ${p.title}${p.tags.length > 0 ? ` [${p.tags.map((t) => t.tag.name).join(", ")}]` : ""}`
        );
        return `${EMOJI[status]} **${status}** (${projects.length}):\n${lines.join("\n")}`;
      });

      const activeCount = results.slice(0, 4).reduce((s, r) => s + r.length, 0);
      return text(`# Sector 7G — Backlog\nActive: ${activeCount}\n\n${sections.join("\n")}`);
    }
  );

  // 8. edit_note
  server.tool(
    "edit_note",
    "Edit a note. Previous version is automatically saved.",
    {
      noteId: z.string(),
      content: z.string().min(1),
      type: z.nativeEnum(NoteType).optional(),
    },
    async ({ noteId, content, type }) => {
      const existing = await prisma.note.findUnique({ where: { id: noteId } });
      if (!existing) return text("❌ Note not found.");
      const updated = await prisma.$transaction(async (tx) => {
        await tx.noteVersion.create({
          data: { noteId, content: existing.content, version: existing.version },
        });
        return tx.note.update({
          where: { id: noteId },
          data: { content, type: type ?? existing.type, version: existing.version + 1 },
        });
      });
      return text(`✅ Note updated (v${updated.version}).\n${updated.content.slice(0, 150)}`);
    }
  );

  // 9. upload_file (disabled on Vercel)
  server.tool(
    "upload_file",
    "Upload a file to a project or note. (Not available in the hosted version — use the local MCP server for file uploads.)",
    {
      base64Content: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      projectId: z.string().optional(),
      noteId: z.string().optional(),
    },
    async () => {
      return text("⚠️ File uploads are not available in the hosted MCP server. Run the local mcp-server with --transport stdio for file upload support.");
    }
  );
}
