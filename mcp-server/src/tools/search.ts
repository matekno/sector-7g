import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerSearch(server: McpServer, client: BacklogClient) {
  server.tool(
    "search",
    "Full-text search across projects and notes in Sector 7G.",
    {
      query: z.string().min(1).describe("Search query"),
      type: z
        .enum(["projects", "notes", "all"])
        .optional()
        .default("all")
        .describe("What to search: projects, notes, or all"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Max results"),
      noteType: z
        .enum(["GENERAL", "PLAN", "DECISION", "BRAINSTORM", "SPEC", "LOG", "SUMMARY"])
        .optional()
        .describe("Filter notes by type (only applies when type is 'notes' or 'all')"),
    },
    async (args) => {
      const { results } = await client.search(args.query, args.type, args.limit, args.noteType);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No results found for "${args.query}".`,
            },
          ],
        };
      }

      const lines = results.map((r, i) => {
        const typeLabel = r.type === "project" ? "📁 Project" : "📝 Note";
        const projectRef = r.type === "note" && r.projectId ? ` (project: \`${r.projectId}\`)` : "";
        return [
          `${i + 1}. ${typeLabel}: **${r.title}**${projectRef}`,
          `   ID: ${r.id}`,
          r.snippet ? `   ${r.snippet.slice(0, 150)}...` : null,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text",
            text: [`Search results for "${args.query}" (${results.length}):`, "", ...lines].join(
              "\n"
            ),
          },
        ],
      };
    }
  );
}
