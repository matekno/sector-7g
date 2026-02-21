import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerUpdateProject(server: McpServer, client: BacklogClient) {
  server.tool(
    "update_project",
    "Update an existing project's fields, status, priority, or tags.",
    {
      projectId: z.string().describe("Project ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: z
        .enum(["IDEA", "PLANNED", "IN_PROGRESS", "PAUSED", "DONE", "ARCHIVED"])
        .optional()
        .describe("New status"),
      priority: z
        .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .optional()
        .describe("New priority"),
      repoUrl: z.string().url().optional().describe("New repository URL"),
      deployUrl: z.string().url().optional().describe("New deploy URL"),
      addTags: z.array(z.string()).optional().describe("Tag names to add"),
      removeTags: z.array(z.string()).optional().describe("Tag names to remove"),
    },
    async (args) => {
      const { projectId, ...data } = args;
      const project = await client.updateProject(projectId, data);
      const tagNames = project.tags.map((t) => t.tag.name).join(", ");

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ Project updated: **${project.title}**`,
              `Status: ${project.status} | Priority: ${project.priority}`,
              tagNames ? `Tags: ${tagNames}` : "Tags: (none)",
            ].join("\n"),
          },
        ],
      };
    }
  );
}
