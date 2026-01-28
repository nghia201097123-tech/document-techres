// This file runs when the Next.js server starts (npm run start)
// NOT during build time (npm run build)
//
// NOTE about NODE_ENV:
// - `next dev` → NODE_ENV = 'development' (automatic)
// - `next start` → NODE_ENV = 'production' (always, cannot be changed)
// This is Next.js's built-in behavior, not configurable via .env file

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Determine the actual mode based on how Next.js was started
    const isDevMode = process.env.NODE_ENV === 'development';
    const modeLabel = isDevMode ? 'development (next dev)' : 'production (next start)';

    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║             WEB-ADMIN - Environment Configuration             ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ App Settings:                                                  ║");
    console.log(`║   SERVICE_PORT: ${process.env.SERVICE_PORT || "1500 (default)"}`.padEnd(67) + "║");
    console.log(`║   NODE_ENV: ${modeLabel}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ APISIX Gateway:                                                ║");
    console.log(`║   NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || "https://beta.api.gateway.overate-vntech.com (default)"}`.padEnd(67) + "║");
    console.log(`║   CONFIG_RESOURCE_URL: ${process.env.CONFIG_RESOURCE_URL || "https://beta.api.gateway.overate-vntech.com/s3 (default)"}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ Service IDs (x-svc-id header):                                 ║");
    console.log(`║   API_ADMIN (1502): ${process.env.CONFIG_NODEJS_ADMIN_SERVICE_ID || "1502 (default)"}`.padEnd(67) + "║");
    console.log(`║   API_DASHBOARD (1503): ${process.env.CONFIG_NODEJS_MANAGEMENT_SERVICE_ID || "1503 (default)"}`.padEnd(67) + "║");
    console.log(`║   API_UPLOAD (1505): ${process.env.CONFIG_NODEJS_MEDIA_SERVICE_ID || "1505 (default)"}`.padEnd(67) + "║");
    console.log(`║   API_OAUTH (1506): ${process.env.CONFIG_NODEJS_OAUTH_SERVICE_ID || "1506 (default)"}`.padEnd(67) + "║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("\n");
  }
}
