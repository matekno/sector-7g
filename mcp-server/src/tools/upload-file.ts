import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BacklogClient } from "../api/client.js";

export function registerUploadFile(server: McpServer, client: BacklogClient) {
  server.tool(
    "upload_file",
    "Upload a file (provided as base64) to associate with a project or note in Sector 7G.",
    {
      base64Content: z
        .string()
        .describe("File content encoded as base64"),
      filename: z.string().describe("Original filename including extension"),
      mimeType: z.string().describe("MIME type (e.g., 'image/png', 'text/plain')"),
      projectId: z
        .string()
        .optional()
        .describe("Project ID to associate the file with"),
      noteId: z
        .string()
        .optional()
        .describe("Note ID to associate the file with"),
    },
    async (args) => {
      // Convert base64 to Blob
      const binary = Buffer.from(args.base64Content, "base64");
      const blob = new Blob([binary], { type: args.mimeType });
      const file = new File([blob], args.filename, { type: args.mimeType });

      const formData = new FormData();
      formData.append("file", file);
      if (args.projectId) formData.append("projectId", args.projectId);
      if (args.noteId) formData.append("noteId", args.noteId);

      const baseUrl = (client as unknown as { baseUrl: string }).baseUrl;
      const apiKey = (client as unknown as { apiKey: string }).apiKey;

      const res = await fetch(`${baseUrl}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${text}`);
      }

      const uploaded = (await res.json()) as { id: string; filename: string; size: number };

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ File uploaded: **${uploaded.filename}**`,
              `ID: ${uploaded.id}`,
              `Size: ${(uploaded.size / 1024).toFixed(1)} KB`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
