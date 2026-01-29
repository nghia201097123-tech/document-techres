// This file runs when the Next.js server starts (npm run start)
// NOT during build time (npm run build)

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const notSet = "NOT SET";
    console.log("\n");
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║           WEB-DASHBOARD - Environment Configuration           ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ App Settings:                                                  ║");
    console.log(`║   SERVICE_PORT: ${process.env.SERVICE_PORT || notSet}`.padEnd(67) + "║");
    console.log(`║   NODE_ENV: ${process.env.NODE_ENV || notSet}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ APISIX Gateway:                                                ║");
    console.log(`║   CONFIG_API_GATEWAY_URL: ${process.env.CONFIG_API_GATEWAY_URL || notSet}`.padEnd(67) + "║");
    console.log(`║   CONFIG_RESOURCE_URL: ${process.env.CONFIG_RESOURCE_URL || notSet}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ Service IDs (x-svc-id header):                                 ║");
    console.log(`║   CONFIG_NODEJS_ADMIN_SERVICE_ID: ${process.env.CONFIG_NODEJS_ADMIN_SERVICE_ID || notSet}`.padEnd(67) + "║");
    console.log(`║   CONFIG_NODEJS_MANAGEMENT_SERVICE_ID: ${process.env.CONFIG_NODEJS_MANAGEMENT_SERVICE_ID || notSet}`.padEnd(67) + "║");
    console.log(`║   CONFIG_NODEJS_MEDIA_SERVICE_ID: ${process.env.CONFIG_NODEJS_MEDIA_SERVICE_ID || notSet}`.padEnd(67) + "║");
    console.log(`║   CONFIG_NODEJS_OAUTH_SERVICE_ID: ${process.env.CONFIG_NODEJS_OAUTH_SERVICE_ID || notSet}`.padEnd(67) + "║");
    console.log(`║   CONFIG_NODEJS_APP_FOOD_SERVICE_ID: ${process.env.CONFIG_NODEJS_APP_FOOD_SERVICE_ID || notSet}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ Build Info:                                                    ║");
    console.log(`║   CONFIG_BUILD_NUMBER: ${process.env.CONFIG_BUILD_NUMBER || notSet}`.padEnd(67) + "║");
    console.log(`║   CONFIG_BUILD_TIME: ${process.env.CONFIG_BUILD_TIME || notSet}`.padEnd(67) + "║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ Logger:                                                        ║");
    console.log(`║   CONFIG_LOGGER_LEVEL: ${process.env.CONFIG_LOGGER_LEVEL || notSet}`.padEnd(67) + "║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("\n");
  }
}
