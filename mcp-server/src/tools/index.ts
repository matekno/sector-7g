import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BacklogClient } from "../api/client.js";
import { registerCreateProject } from "./create-project.js";
import { registerAddNote } from "./add-note.js";
import { registerGetProject } from "./get-project.js";
import { registerListProjects } from "./list-projects.js";
import { registerUpdateProject } from "./update-project.js";
import { registerSearch } from "./search.js";
import { registerBacklogSummary } from "./backlog-summary.js";
import { registerEditNote } from "./edit-note.js";
import { registerUploadFile } from "./upload-file.js";
import { registerDeleteProject } from "./delete-project.js";

export function registerAll(server: McpServer, client: BacklogClient) {
  registerCreateProject(server, client);
  registerAddNote(server, client);
  registerGetProject(server, client);
  registerListProjects(server, client);
  registerUpdateProject(server, client);
  registerDeleteProject(server, client);
  registerSearch(server, client);
  registerBacklogSummary(server, client);
  registerEditNote(server, client);
  registerUploadFile(server, client);
}
