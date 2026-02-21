import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerGetProject(server: McpServer, client: BacklogClient) {
  server.tool(
    "get_project",
    "Get full context of a project including all notes, files, and tags. Use this to retrieve project details before adding notes or updating.",
    {
      projectId: z.string().optional().describe("Exact project ID"),
      title: z.string().optional().describe("Project title (fuzzy match)"),
    },
    async (args) => {
      let projectId = args.projectId;

      if (!projectId) {
        if (!args.title) {
          return {
            content: [
              {
                type: "text",
                text: "❌ Provide either projectId or title.",
              },
            ],
          };
        }

        const found = await client.findProjectByTitle(args.title);
        if (!found) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No project found matching "${args.title}".`,
              },
            ],
          };
        }
        projectId = found.id;
      }

      const project = await client.getProjectFull(projectId);
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

      return {
        content: [
          {
            type: "text",
            text: [
              `# ${project.title}`,
              `ID: ${project.id}`,
              `Status: ${project.status} | Priority: ${project.priority}`,
              tagNames ? `Tags: ${tagNames}` : null,
              project.description ? `\nDescription:\n${project.description}` : null,
              project.repoUrl ? `Repo: ${project.repoUrl}` : null,
              project.deployUrl ? `Deploy: ${project.deployUrl}` : null,
              `\n## Notes (${project.notes.length})\n${notesText}`,
              `\n## Files (${project.files.length})\n${filesText}`,
              `\nCreated: ${new Date(project.createdAt).toLocaleDateString()} | Updated: ${new Date(project.updatedAt).toLocaleDateString()}`,
            ]
              .filter((l) => l !== null)
              .join("\n"),
          },
        ],
      };
    }
  );
}
