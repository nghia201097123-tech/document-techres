import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack, use Webpack instead
  experimental: {
    turbo: false,
  },
};

export default nextConfig;
