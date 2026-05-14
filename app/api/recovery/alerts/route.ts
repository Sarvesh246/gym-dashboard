import { createClient } from "@/lib/supabase/server";
import { getActiveAlerts, dismissAlert } from "@/services/alerts";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDismissed = searchParams.get("include_dismissed") === "true";

    let alerts;

    if (includeDismissed) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("recovery_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("alert_date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[GET /api/recovery/alerts] Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
      }

      alerts = data || [];
    } else {
      alerts = await getActiveAlerts(user.id, supabase);
    }

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[GET /api/recovery/alerts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: { alert_id: number; dismissed: boolean } = await request.json();
    const { alert_id, dismissed } = body;

    if (dismissed) {
      const result = await dismissAlert(alert_id, supabase);

      if (!result) {
        return NextResponse.json({ error: "Failed to dismiss alert" }, { status: 500 });
      }

      return NextResponse.json({ success: true, alert: result });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/recovery/alerts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
