/**
 * GET /api/admin/users
 * List all users (paginated) — admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/saas/rbac";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);

  // auth.users requires service role — use the admin client, not the publishable-key client
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: Math.floor(offset / limit) + 1,
    perPage: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data?.users ?? []).map((u: any) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    confirmed: !!u.confirmed_at,
  }));

  return NextResponse.json({ users, total: data?.total ?? users.length });
}
