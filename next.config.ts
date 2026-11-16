import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI drafting uploads up to three small photos through a server action.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
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
