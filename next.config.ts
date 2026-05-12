import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow service worker and PWA assets
  headers: async () => [
    {
      source: "/manifest.json",
      headers: [{ key: "Content-Type", value: "application/manifest+json" }],
    },
  ],
};

export default nextConfig;
