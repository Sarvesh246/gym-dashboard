import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport } from "@/services/reports/monthly";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";

  const now = new Date();
  const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return Response.json({ error: "Invalid year or month" }, { status: 400 });
  }

  try {
    const report = await generateMonthlyReport(user.id, year, month, forceRefresh);
    return Response.json({ report });
  } catch {
    return Response.json({ error: "Failed to generate monthly report" }, { status: 500 });
  }
}
