#!/bin/bash

# Temporary build script to work around React Flow SSR issues

echo "Starting production build with workarounds..."

# Clean previous build
rm -rf .next

# Temporarily remove problematic directories
if [ -d "app/api/automations/webhooks-disabled" ]; then
  mv app/api/automations/webhooks-disabled app/api/automations/.webhooks-temp-removed
fi

# Run the build
NODE_OPTIONS='--max-old-space-size=8192' NEXT_TELEMETRY_DISABLED=1 npm run build

BUILD_EXIT_CODE=$?

# Restore directories
if [ -d "app/api/automations/.webhooks-temp-removed" ]; then
  mv app/api/automations/.webhooks-temp-removed app/api/automations/webhooks-disabled
fi

exit $BUILD_EXIT_CODE