// GET /api/nutrition/search - Search USDA food database

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods, getUserRecentFoods } from "@/services/foods";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    // Search USDA database
    const { foods } = await searchFoods(query, limit);

    // Also fetch user's recent foods for quick-add
    const recent = await getUserRecentFoods(user.id, 10);

    return NextResponse.json({ foods, recent_foods: recent });
  } catch (error) {
    console.error("GET /api/nutrition/search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
