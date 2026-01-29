import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal deployment package with all dependencies
  output: "standalone",

  // instrumentation.ts is supported by default in Next.js 15+
  // No additional config needed for runtime ENV logging
};

export default nextConfig;
