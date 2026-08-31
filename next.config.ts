import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local dev access via 127.0.0.1 as well as localhost.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
