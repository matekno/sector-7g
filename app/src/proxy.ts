import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Health check is public
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Bearer token (API routes, Claude Desktop, mcp-server)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === apiKey) {
    return NextResponse.next();
  }

  // Query param (Claude.ai web UI — no soporta Bearer en su config de MCP)
  const queryKey = request.nextUrl.searchParams.get("apiKey");
  if (queryKey === apiKey) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: "/api/:path*",
};
