import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerMcpTools } from "@/lib/mcp-tools";

function checkAuth(request: NextRequest): NextResponse | null {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null; // misconfigured but don't block

  // 1. Bearer token (Claude Desktop / Streamable HTTP clients)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === apiKey) {
    return null;
  }

  // 2. Query param ?apiKey= (Claude.ai web UI — no soporta Bearer en la config)
  const queryKey = request.nextUrl.searchParams.get("apiKey");
  if (queryKey === apiKey) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "sector-7g", version: "1.0.0" });
  registerMcpTools(server);
  return server;
}

export async function POST(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // Stateless mode — no sessionIdGenerator
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({});
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({});
  await server.connect(transport);
  return transport.handleRequest(request);
}
