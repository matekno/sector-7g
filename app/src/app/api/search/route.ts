import { NextRequest, NextResponse } from "next/server";
import { fullTextSearch } from "@/lib/search";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const type = (searchParams.get("type") ?? "all") as "projects" | "notes" | "all";
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = await fullTextSearch(q, type, Math.min(limit, 50));
  return NextResponse.json({ results, query: q });
}
