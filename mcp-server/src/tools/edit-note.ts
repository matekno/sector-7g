import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerEditNote(server: McpServer, client: BacklogClient) {
  server.tool(
    "edit_note",
    "Edit an existing note. The previous version is automatically saved in the version history.",
    {
      noteId: z.string().describe("Note ID to edit"),
      content: z.string().min(1).describe("New content for the note"),
      type: z
        .enum(["GENERAL", "PLAN", "DECISION", "BRAINSTORM", "SPEC", "LOG", "SUMMARY"])
        .optional()
        .describe("New note type (optional, keeps current if not provided)"),
    },
    async (args) => {
      const note = await client.editNote(args.noteId, {
        content: args.content,
        type: args.type,
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ Note updated (now at version ${note.version}).`,
              `Note ID: ${note.id}`,
              `Type: ${note.type}`,
              `Preview: ${note.content.slice(0, 150)}${note.content.length > 150 ? "..." : ""}`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
