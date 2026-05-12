import { createClient } from "@/lib/supabase/server";
import { getBodyMapData } from "@/services/muscles";
import type { BodyMapData } from "@/lib/recovery/types";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bodyMap: BodyMapData = await getBodyMapData(user.id);
    return Response.json(bodyMap);
  } catch (err) {
    console.error("[GET /api/recovery/body-map]", err);
    return Response.json({ error: "Failed to load body map" }, { status: 500 });
  }
}
