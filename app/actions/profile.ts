"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProfileUpdate } from "@/lib/supabase/types";

export async function updateProfile(data: ProfileUpdate) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .update(data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
