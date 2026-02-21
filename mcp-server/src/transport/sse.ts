import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function runSSE(server: McpServer, port: number): Promise<void> {
  const transports = new Map<string, SSEServerTransport>();

  const httpServer = createHttpServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers for Claude.ai
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "GET" && req.url === "/sse") {
        const transport = new SSEServerTransport("/messages", res);
        transports.set(transport.sessionId, transport);

        res.on("close", () => {
          transports.delete(transport.sessionId);
        });

        await server.connect(transport);
        return;
      }

      if (req.method === "POST" && req.url?.startsWith("/messages")) {
        const urlObj = new URL(req.url, `http://localhost`);
        const sessionId = urlObj.searchParams.get("sessionId");
        const transport = sessionId ? transports.get(sessionId) : undefined;

        if (!transport) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found" }));
          return;
        }

        await transport.handlePostMessage(req, res);
        return;
      }

      res.writeHead(404);
      res.end();
    }
  );

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      console.error(`Sector 7G MCP SSE server listening on http://localhost:${port}`);
      console.error(`  SSE endpoint: http://localhost:${port}/sse`);
      resolve();
    });
  });
}
