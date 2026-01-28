// This file runs when the Next.js server starts (npm run start)
// NOT during build time (npm run build)

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║           WEB-DASHBOARD - Environment Configuration           ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ App Settings:                                                  ║");
    console.log(`║   SERVICE_PORT: ${process.env.SERVICE_PORT || "1501 (default)"}`.padEnd(67) + "║");
    console.log(`║   NODE_ENV: ${process.env.NODE_ENV || "development (default)"}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ APISIX Gateway:                                                ║");
    console.log(`║   NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || "http://172.16.10.118:7080 (default)"}`.padEnd(67) + "║");
    console.log(`║   CONFIG_RESOURCE_URL: ${process.env.CONFIG_RESOURCE_URL || "http://172.16.10.118:7080/s3 (default)"}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ Service IDs (x-svc-id header):                                 ║");
    console.log(`║   API_ADMIN (1502): ${process.env.CONFIG_NODEJS_ADMIN_SERVICE_ID || "1502 (default)"}`.padEnd(67) + "║");
    console.log(`║   API_DASHBOARD (1503): ${process.env.CONFIG_NODEJS_MANAGEMENT_SERVICE_ID || "1503 (default)"}`.padEnd(67) + "║");
    console.log(`║   API_UPLOAD (1505): ${process.env.CONFIG_NODEJS_MEDIA_SERVICE_ID || "1505 (default)"}`.padEnd(67) + "║");
    console.log(`║   API_OAUTH (1506): ${process.env.CONFIG_NODEJS_OAUTH_SERVICE_ID || "1506 (default)"}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ External Services:                                             ║");
    console.log(`║   API_APP_FOOD_URL: ${process.env.NEXT_PUBLIC_API_APP_FOOD_URL || "http://172.16.10.201:3010/api (default)"}`.padEnd(67) + "║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("\n");
  }
}
