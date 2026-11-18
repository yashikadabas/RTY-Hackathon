import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Native / binary packages must not be bundled.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "sharp"],
  // Ship music beds + ffmpeg binary with the API functions.
  outputFileTracingIncludes: {
    "/api/**": ["./public/audio/**", "./node_modules/@ffmpeg-installer/**"],
  },
};

export default nextConfig;
