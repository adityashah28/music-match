import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-images.dzcdn.net",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "e-cdns-images.dzcdn.net",
        pathname: "/images/**",
      },
      // Ticketmaster Discovery event images (show-card fallback when no Deezer artist photo)
      {
        protocol: "https",
        hostname: "**.ticketm.net",
        pathname: "/**",
      },
    ],
    // Portraits change rarely; cache optimized variants longer than the 4h default.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async headers() {
    return [
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
