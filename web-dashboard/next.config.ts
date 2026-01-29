import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal deployment package with all dependencies
  output: "standalone",

  // Map CONFIG_* to NEXT_PUBLIC_* for Turbopack compatibility
  // .env uses CONFIG_*, but Turbopack requires NEXT_PUBLIC_* prefix for browser access
  env: {
    NEXT_PUBLIC_API_GATEWAY_URL: process.env.CONFIG_API_GATEWAY_URL,
    NEXT_PUBLIC_ADMIN_SERVICE_ID: process.env.CONFIG_NODEJS_ADMIN_SERVICE_ID,
    NEXT_PUBLIC_MANAGEMENT_SERVICE_ID: process.env.CONFIG_NODEJS_MANAGEMENT_SERVICE_ID,
    NEXT_PUBLIC_MEDIA_SERVICE_ID: process.env.CONFIG_NODEJS_MEDIA_SERVICE_ID,
    NEXT_PUBLIC_OAUTH_SERVICE_ID: process.env.CONFIG_NODEJS_OAUTH_SERVICE_ID,
    NEXT_PUBLIC_APP_FOOD_SERVICE_ID: process.env.CONFIG_NODEJS_APP_FOOD_SERVICE_ID,
  },

  // Exclude heavy packages from server-side bundling to improve dev performance
  serverExternalPackages: ["exceljs", "file-saver"],

  // Experimental settings for better performance
  experimental: {
    // Optimize package imports to reduce bundle analysis time
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // Turbopack config (Next.js 15 default bundler)
  turbopack: {
    // Empty config to acknowledge Turbopack usage
  },
};

export default nextConfig;
