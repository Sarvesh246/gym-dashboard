import { createClient } from "@/lib/supabase/server";
import { generateYearlyReport } from "@/services/reports/yearly";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  if (isNaN(year) || year < 2020 || year > 2100) {
    return Response.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    const report = await generateYearlyReport(user.id, year, forceRefresh);
    return Response.json({ report });
  } catch {
    return Response.json({ error: "Failed to generate yearly report" }, { status: 500 });
  }
}
