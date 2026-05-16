import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Myostat.",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

const sections = [
  {
    title: "Use of the service",
    body: [
      "Myostat provides fitness planning, training analytics, nutrition logging, recovery insights, and wearable integrations. You may use the service only in compliance with applicable law and these terms.",
      "You are responsible for maintaining the confidentiality of your account credentials and for activity that occurs under your account.",
    ],
  },
  {
    title: "Health and wellness disclaimer",
    body: [
      "Myostat is provided for informational and wellness purposes only. It does not provide medical advice, diagnosis, or treatment, and it is not a substitute for professional medical guidance.",
      "You should consult a qualified professional before making significant training, nutrition, or health decisions, especially if you have a medical condition or injury.",
    ],
  },
  {
    title: "Wearable integrations",
    body: [
      "If you connect a third-party wearable provider, you authorize Myostat to access and process the data that provider makes available in order to deliver syncing, analytics, and recovery features.",
      "Your use of third-party integrations is also subject to the terms and privacy policies of those third parties.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "You may not misuse the service, interfere with its operation, attempt unauthorized access, reverse engineer protected parts of the platform except where prohibited by law, or use the service to violate the rights of others.",
    ],
  },
  {
    title: "Intellectual property",
    body: [
      "The Myostat service, branding, software, and related content are owned by the project operators or their licensors and are protected by applicable intellectual property laws.",
    ],
  },
  {
    title: "Termination",
    body: [
      "We may suspend or terminate access if you violate these terms, create risk for the service or other users, or if continued operation is no longer commercially or technically feasible.",
    ],
  },
  {
    title: "Disclaimers and liability limits",
    body: [
      "The service is provided on an as-is and as-available basis without warranties of any kind to the fullest extent permitted by law.",
      "To the fullest extent permitted by law, Myostat will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, or business opportunities arising from use of the service.",
    ],
  },
  {
    title: "Changes to these terms",
    body: [
      "We may revise these Terms of Service from time to time. Updated terms take effect when posted on this page with a revised effective date.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 rounded-[2rem] border border-border bg-card/95 p-8 shadow-sm">
          <p className="text-sm font-medium text-primary">Myostat legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Effective date: {LEGAL_EFFECTIVE_DATE}. These terms govern access
            to and use of the Myostat application and its connected wearable
            features.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
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
