import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerCreateProject(server: McpServer, client: BacklogClient) {
  server.tool(
    "create_project",
    "Create a new project in Sector 7G. Optionally include tags (they will be created if they don't exist).",
    {
      title: z.string().min(1).describe("Project title"),
      description: z.string().optional().describe("Project description"),
      status: z
        .enum(["IDEA", "PLANNED", "IN_PROGRESS", "PAUSED", "DONE", "ARCHIVED"])
        .optional()
        .default("IDEA")
        .describe("Project status"),
      priority: z
        .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .optional()
        .default("MEDIUM")
        .describe("Project priority"),
      repoUrl: z.string().url().optional().describe("Repository URL"),
      deployUrl: z.string().url().optional().describe("Deploy/production URL"),
      blogUrl: z.string().url().optional().describe("Blog post or docs URL"),
      tags: z
        .array(z.string())
        .optional()
        .describe("List of tag names to associate with the project"),
    },
    async (args) => {
      const project = await client.createProject(args);
      const tagNames = project.tags.map((t) => t.tag.name).join(", ");
      return {
        content: [
          {
            type: "text",
            text: [
              `✅ Project created: **${project.title}**`,
              `ID: ${project.id}`,
              `Status: ${project.status} | Priority: ${project.priority}`,
              tagNames ? `Tags: ${tagNames}` : null,
              project.repoUrl ? `Repo: ${project.repoUrl}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    }
  );
}
