"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileUpdate } from "@/lib/supabase/types";

export async function saveOnboardingStep(
  stepIndex: number,
  data: ProfileUpdate
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("profiles").upsert(
    {
      user_id: user.id,
      ...data,
      onboarding_step_index: stepIndex,
      onboarding_complete: false,
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

export async function completeOnboarding(data: ProfileUpdate) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("profiles").upsert(
    {
      user_id: user.id,
      ...data,
      onboarding_complete: true,
      onboarding_step_index: 8,
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };

  redirect("/");
}
