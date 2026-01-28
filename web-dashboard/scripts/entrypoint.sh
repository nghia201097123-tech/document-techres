#!/bin/sh

# =============================================================
# Docker Entrypoint Script for Next.js with Runtime ENV Support
# =============================================================
#
# Problem: Next.js inlines NEXT_PUBLIC_* variables at build time,
# so they cannot be changed at runtime via environment variables.
#
# Solution: This script replaces placeholders in the built JS files
# with actual environment values before starting the server.
#
# Placeholders format: CONFIG_VALUE_<VARIABLE_NAME>
# =============================================================

set -e

echo "================================================"
echo "  WEB-DASHBOARD - Docker Entrypoint"
echo "================================================"

# Directory containing the Next.js build
NEXT_DIR="/app/.next"

# Function to replace placeholder with actual value
replace_placeholder() {
    local placeholder="$1"
    local env_var="$2"
    local default_value="$3"

    # Get the actual value from environment or use default
    eval "actual_value=\${$env_var:-$default_value}"

    if [ -n "$actual_value" ] && [ "$actual_value" != "$placeholder" ]; then
        echo "  Replacing $placeholder -> $actual_value"

        # Replace in all JS files within .next directory
        find "$NEXT_DIR" -type f -name "*.js" -exec sed -i "s|$placeholder|$actual_value|g" {} + 2>/dev/null || true
    else
        echo "  Skipping $placeholder (no value or same as placeholder)"
    fi
}

echo ""
echo "Step 1: Replacing NEXT_PUBLIC_* placeholders..."
echo "------------------------------------------------"

# Replace NEXT_PUBLIC_API_URL placeholder
replace_placeholder "CONFIG_VALUE_NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_API_URL" "https://beta.api.gateway.overate-vntech.com"

# Replace NEXT_PUBLIC_API_APP_FOOD_URL placeholder (specific to dashboard)
replace_placeholder "CONFIG_VALUE_NEXT_PUBLIC_API_APP_FOOD_URL" "NEXT_PUBLIC_API_APP_FOOD_URL" "http://172.16.10.201:3010/api"

echo ""
echo "Step 2: Displaying final configuration..."
echo "------------------------------------------------"

echo "  NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://beta.api.gateway.overate-vntech.com}"
echo "  NEXT_PUBLIC_API_APP_FOOD_URL: ${NEXT_PUBLIC_API_APP_FOOD_URL:-http://172.16.10.201:3010/api}"
echo "  CONFIG_RESOURCE_URL: ${CONFIG_RESOURCE_URL:-https://beta.api.gateway.overate-vntech.com/s3}"
echo "  SERVICE_PORT: ${SERVICE_PORT:-8080}"
echo "  NODE_ENV: production"

echo ""
echo "Step 3: Starting Next.js server..."
echo "================================================"
echo ""

# Execute the main command (npm start or node scripts/start.js)
exec "$@"
