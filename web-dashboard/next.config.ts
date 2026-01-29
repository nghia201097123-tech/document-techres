import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal deployment package with all dependencies
  output: "standalone",

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
