import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude heavy packages from server-side bundling to improve dev performance
  serverExternalPackages: ["exceljs", "file-saver"],

  // Experimental settings for better performance
  experimental: {
    // Enable instrumentation for runtime ENV logging
    instrumentationHook: true,
    // Optimize package imports to reduce bundle analysis time
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    // Empty config to acknowledge Turbopack usage
  },
};

export default nextConfig;
