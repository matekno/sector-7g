import { NextRequest } from "next/server";

const API_KEY = process.env.API_KEY;

export function validateApiKey(request: NextRequest): boolean {
  if (!API_KEY) {
    console.error("API_KEY environment variable is not set");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  return token === API_KEY;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
