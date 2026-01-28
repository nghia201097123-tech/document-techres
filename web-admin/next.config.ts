import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable instrumentation for runtime ENV logging
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
