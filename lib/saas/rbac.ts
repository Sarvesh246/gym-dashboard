/**
 * Role-based access control.
 *
 * Roles: "admin" | "user"
 *
 * Admin identity is determined server-side via the ADMIN_EMAILS env var
 * (comma-separated list). No client-side trust.
 */

import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "user";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export async function getCurrentUserRole(): Promise<Role> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "user";
  const email = (user.email ?? "").toLowerCase();
  return ADMIN_EMAILS.has(email) ? "admin" : "user";
}

export async function requireAdmin(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(email.toLowerCase());
}
