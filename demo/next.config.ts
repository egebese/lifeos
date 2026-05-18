import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  // Pin the workspace root to this dir so the parent lockfile doesn't confuse
  // Next's auto-detection on Vercel.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "v3.fal.media" },
      { protocol: "https", hostname: "v3b.fal.media" },
    ],
  },
};

export default config;
