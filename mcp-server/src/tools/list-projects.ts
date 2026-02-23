import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

const STATUS_EMOJI: Record<string, string> = {
  IDEA: "💡",
  PLANNED: "📋",
  IN_PROGRESS: "🚧",
  PAUSED: "⏸️",
  DONE: "✅",
  ARCHIVED: "📦",
};

const PRIORITY_EMOJI: Record<string, string> = {
  LOW: "🔽",
  MEDIUM: "➡️",
  HIGH: "🔼",
  URGENT: "🔴",
};

export function registerListProjects(server: McpServer, client: BacklogClient) {
  server.tool(
    "list_projects",
    "List projects in Sector 7G with optional filters by status, priority, or tag.",
    {
      status: z
        .enum(["IDEA", "PLANNED", "IN_PROGRESS", "PAUSED", "DONE", "ARCHIVED"])
        .optional()
        .describe("Filter by status"),
      priority: z
        .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .optional()
        .describe("Filter by priority"),
      tag: z.string().optional().describe("Filter by tag name"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Max number of results"),
    },
    async (args) => {
      const { projects, total } = await client.listProjects({
        status: args.status,
        priority: args.priority,
        tag: args.tag,
        limit: args.limit,
      });

      if (projects.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No projects found matching the filters.",
            },
          ],
        };
      }

      const lines = projects.map((p) => {
        const statusEmoji = STATUS_EMOJI[p.status] ?? "";
        const priorityEmoji = PRIORITY_EMOJI[p.priority] ?? "";
        const tags =
          p.tags.length > 0
            ? ` [${p.tags.map((t) => t.tag.name).join(", ")}]`
            : "";
        const noteCount = p._count?.notes ?? 0;
        return `${statusEmoji} ${priorityEmoji} **${p.title}** \`${p.id}\`${tags} — ${noteCount} note${noteCount !== 1 ? "s" : ""}`;
      });

      const filterDesc = [
        args.status ? `status=${args.status}` : null,
        args.priority ? `priority=${args.priority}` : null,
        args.tag ? `tag=${args.tag}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        content: [
          {
            type: "text",
            text: [
              `Showing ${projects.length} of ${total} projects${filterDesc ? ` (${filterDesc})` : ""}:`,
              "",
              ...lines,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
