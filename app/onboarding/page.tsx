import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { Profile } from "@/lib/supabase/types";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single() as { data: Profile | null };

  if (profile?.onboarding_complete) redirect("/");

  return (
    <OnboardingWizard
      initialStep={profile?.onboarding_step_index ?? 0}
      initialData={profile ?? {}}
    />
  );
}
