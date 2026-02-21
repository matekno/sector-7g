import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BacklogClient } from "./api/client.js";
import { registerAll } from "./tools/index.js";

export function createServer(client: BacklogClient): McpServer {
  const server = new McpServer({
    name: "sector-7g",
    version: "1.0.0",
  });

  registerAll(server, client);

  return server;
}
