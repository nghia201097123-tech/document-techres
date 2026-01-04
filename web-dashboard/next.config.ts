import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude heavy packages from server-side bundling to improve dev performance
  serverExternalPackages: ["exceljs"],

  // Experimental settings for better performance
  experimental: {
    // Optimize package imports to reduce bundle analysis time
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // Webpack config to handle heavy packages
  webpack: (config, { isServer }) => {
    // Don't bundle exceljs on server - it's only used client-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("exceljs", "file-saver");
    }
    return config;
  },
};

export default nextConfig;
