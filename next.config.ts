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
      // Show images from Bandsintown (media., assets.prod.) and Songkick, for shows without a Deezer photo.
      // Without these, next/image throws and the whole Shows page crashes.
      {
        protocol: "https",
        hostname: "**.bandsintown.com",
      },
      {
        protocol: "https",
        hostname: "images.sk-static.com",
      },
      // Google profile pictures (avatarUrl on profiles that signed in with Google)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
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
