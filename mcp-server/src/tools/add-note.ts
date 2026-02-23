import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerAddNote(server: McpServer, client: BacklogClient) {
  server.tool(
    "add_note",
    [
      "Add a note to an existing project in Sector 7G.",
      "Provide either projectId (exact) or projectTitle (fuzzy match).",
      "This is the primary tool for 'save this conversation to Sector 7G' flows.",
      "Source should be 'claude-chat' when saving from a conversation, 'claude-code' when saving from Claude Code.",
    ].join(" "),
    {
      content: z.string().min(1).describe("Note content (markdown supported)"),
      projectId: z
        .string()
        .optional()
        .describe("Exact project ID (use this if you know it)"),
      projectTitle: z
        .string()
        .optional()
        .describe("Project title for fuzzy search (used if projectId is not provided)"),
      type: z
        .enum(["GENERAL", "PLAN", "DECISION", "BRAINSTORM", "SPEC", "LOG", "SUMMARY"])
        .optional()
        .default("GENERAL")
        .describe("Note type"),
      source: z
        .string()
        .optional()
        .default("claude-chat")
        .describe("Source of the note: 'claude-chat', 'claude-code', or 'manual'"),
    },
    async (args) => {
      try {
        let projectId = args.projectId;

        if (projectId) {
          // Support short/prefix IDs
          const resolved = await client.resolveProjectId(projectId);
          if (!resolved) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ No project found with ID "${projectId}". Use list_projects to find the correct ID or provide a projectTitle instead.`,
                },
              ],
            };
          }
          projectId = resolved;
        } else {
          // Fuzzy match by title
          if (!args.projectTitle) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Provide either projectId or projectTitle to identify the project.",
                },
              ],
            };
          }

          const found = await client.findProjectByTitle(args.projectTitle);
          if (!found) {
            return {
              content: [
                {
                  type: "text",
                  text: [
                    `❌ No project found matching "${args.projectTitle}".`,
                    "Use create_project to create it first, or list_projects to see existing projects.",
                  ].join(" "),
                },
              ],
            };
          }
          projectId = found.id;
        }

        const note = await client.addNote(projectId, {
          content: args.content,
          type: args.type,
          source: args.source,
        });

        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Note added to project.`,
                `Note ID: ${note.id}`,
                `Type: ${note.type} | Source: ${note.source ?? "manual"}`,
                `Preview: ${note.content.slice(0, 100)}${note.content.length > 100 ? "..." : ""}`,
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error adding note: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
