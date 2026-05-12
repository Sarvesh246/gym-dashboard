import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { User } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
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

  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <PageContainer>
      <SectionContainer className="mb-2">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              Your Profile
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <ProfileEditor profile={profile} />
      </SectionContainer>
    </PageContainer>
  );
}
