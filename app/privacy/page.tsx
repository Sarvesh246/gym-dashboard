import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Myostat.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "Myostat collects information you provide directly, such as your name, email address, profile details, training goals, workout history, nutrition entries, and recovery notes.",
      "If you connect a wearable provider such as Garmin, Fitbit, Polar, Wahoo, or Apple Health, we may collect health and fitness data made available by that provider, including activity, heart rate, sleep, stress, training load, steps, calories, and related recovery metrics.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use your information to operate the product, personalize dashboards, calculate training and recovery insights, sync wearable data, maintain account security, and improve product performance and reliability.",
      "We do not sell personal information. We only use wearable and health data to provide the features you request inside Myostat.",
    ],
  },
  {
    title: "How information is shared",
    body: [
      "We may share information with service providers that help us host, authenticate, store, and secure the application. We may also disclose information when required by law or to protect the rights, safety, and security of users and the service.",
      "We do not share your wearable data with third parties for advertising purposes.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "We retain account, workout, nutrition, and wearable data for as long as needed to provide the service and meet legal, security, and operational obligations.",
      "If you disconnect a wearable integration or request account deletion, associated data may be removed or anonymized subject to backup retention and legal requirements.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can review and update profile information from within the app, disconnect wearable providers, and manage certain synced data through your connected provider account.",
      "You may also stop using the service at any time. Disconnecting a provider stops future syncing but does not automatically remove previously stored data unless separately deleted.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational measures to protect personal information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Children",
    body: [
      "Myostat is not intended for children under 13, and we do not knowingly collect personal information from children under 13.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. Material changes will take effect when posted on this page with a revised effective date.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 rounded-[2rem] border border-border bg-card/95 p-8 shadow-sm">
          <p className="text-sm font-medium text-primary">Myostat legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Effective date: {LEGAL_EFFECTIVE_DATE}. This policy explains how
            Myostat collects, uses, stores, and shares information when users
            access the app and connect wearable providers.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-foreground">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
