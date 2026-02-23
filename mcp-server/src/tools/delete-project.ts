import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerDeleteProject(server: McpServer, client: BacklogClient) {
  server.tool(
    "delete_project",
    "Archive (soft-delete) or permanently delete a project. Defaults to archive.",
    {
      projectId: z.string().describe("Project ID to delete"),
      hard: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, permanently deletes. If false (default), archives it."),
    },
    async ({ projectId, hard }) => {
      await client.deleteProject(projectId, hard ?? false);
      return {
        content: [
          {
            type: "text",
            text: hard
              ? `🗑️ Project ${projectId} permanently deleted.`
              : `📦 Project ${projectId} archived. Use update_project with status IDEA/PLANNED/etc. to restore it.`,
          },
        ],
      };
    }
  );
}
