import { createClient } from "@/lib/supabase/server";
import { generateWeeklyReport } from "@/services/reports/weekly";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";
  const targetDays = parseInt(url.searchParams.get("targetDays") ?? "4", 10);

  try {
    const report = await generateWeeklyReport(user.id, targetDays, forceRefresh);
    return Response.json({ report });
  } catch {
    return Response.json({ error: "Failed to generate weekly report" }, { status: 500 });
  }
}
