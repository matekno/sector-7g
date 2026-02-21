import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerBacklogSummary(server: McpServer, client: BacklogClient) {
  server.tool(
    "backlog_summary",
    "Get a summary of the entire Sector 7G backlog grouped by status.",
    {
      includeArchived: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include archived projects in the summary"),
    },
    async (args) => {
      const statuses = args.includeArchived
        ? (["IN_PROGRESS", "PLANNED", "IDEA", "PAUSED", "DONE", "ARCHIVED"] as const)
        : (["IN_PROGRESS", "PLANNED", "IDEA", "PAUSED", "DONE"] as const);

      const results = await Promise.all(
        statuses.map((status) => client.listProjects({ status, limit: 50 }))
      );

      const sections = statuses.map((status, i) => {
        const { projects, total } = results[i];
        const emoji =
          status === "IN_PROGRESS"
            ? "🚧"
            : status === "PLANNED"
            ? "📋"
            : status === "IDEA"
            ? "💡"
            : status === "PAUSED"
            ? "⏸️"
            : status === "DONE"
            ? "✅"
            : "📦";

        if (total === 0) return `${emoji} **${status}**: (none)`;

        const projectLines = projects
          .slice(0, 5)
          .map((p) => {
            const tags =
              p.tags.length > 0
                ? ` [${p.tags.map((t) => t.tag.name).join(", ")}]`
                : "";
            return `  - ${p.title}${tags}`;
          })
          .join("\n");

        const moreText = total > 5 ? `\n  ... and ${total - 5} more` : "";
        return `${emoji} **${status}** (${total}):\n${projectLines}${moreText}`;
      });

      const totalActive = results
        .filter((_, i) => statuses[i] !== "ARCHIVED" && statuses[i] !== "DONE")
        .reduce((sum, r) => sum + r.total, 0);

      return {
        content: [
          {
            type: "text",
            text: [
              "# Sector 7G — Backlog Summary",
              `Active projects: ${totalActive}`,
              "",
              ...sections,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
