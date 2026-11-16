import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI drafting uploads up to three small photos through a server action.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  async headers() {
    return [
      // The service worker must always be re-checked so a new deploy reaches installed apps.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
