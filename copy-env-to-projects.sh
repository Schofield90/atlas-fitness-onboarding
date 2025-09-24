#!/bin/bash

# Script to copy environment variables to all three Vercel projects

echo "🚀 Copying environment variables to all three projects..."

# Read the env file and add each variable to all projects
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi

  # Remove any quotes from the value
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  echo "Adding $key to all projects..."

  # Add to Admin Portal
  echo "$value" | vercel env add "$key" production --yes --force --cwd . --project atlas-admin 2>/dev/null || true

  # Add to Gym Dashboard
  echo "$value" | vercel env add "$key" production --yes --force --cwd . --project atlas-gym-dashboard 2>/dev/null || true

  # Add to Member Portal
  echo "$value" | vercel env add "$key" production --yes --force --cwd . --project atlas-member-portal 2>/dev/null || true

done < .env.production

echo "✅ Environment variables copied to all projects!"
echo ""
echo "Projects updated:"
echo "  - atlas-admin"
echo "  - atlas-gym-dashboard"
echo "  - atlas-member-portal"
echo ""
echo "You may need to redeploy each project for the changes to take effect."