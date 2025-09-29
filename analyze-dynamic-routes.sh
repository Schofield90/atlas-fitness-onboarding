#!/bin/bash

echo "🔍 Analyzing API routes that actually need dynamic rendering..."
echo ""

# Find all API routes with dynamic export
routes_with_dynamic=$(find app/api -name "route.ts" -o -name "route.js" | xargs grep -l "export const dynamic")

# Count routes that actually need dynamic (use auth/cookies)
need_dynamic=0
dont_need_dynamic=0

echo "Routes that NEED dynamic rendering (use cookies/auth):"
echo "------------------------------------------------------"
for file in $routes_with_dynamic; do
  # Check if file uses cookies, requireAuth, or other auth functions
  if grep -q "cookies()\|requireAuth\|getUser\|getSession\|auth\.get\|createClient\|createServerClient" "$file" 2>/dev/null; then
    echo "  ✓ $file"
    ((need_dynamic++))
  fi
done

echo ""
echo "Routes that DON'T need dynamic rendering:"
echo "-----------------------------------------"
for file in $routes_with_dynamic; do
  # Check if file doesn't use auth functions
  if ! grep -q "cookies()\|requireAuth\|getUser\|getSession\|auth\.get\|createClient\|createServerClient" "$file" 2>/dev/null; then
    echo "  ✗ $file"
    ((dont_need_dynamic++))
  fi
done

echo ""
echo "📊 Summary:"
echo "  Routes with dynamic export: $(echo $routes_with_dynamic | wc -w)"
echo "  Routes that NEED dynamic: $need_dynamic"
echo "  Routes that DON'T need dynamic: $dont_need_dynamic"
echo ""
echo "Recommendation: Remove 'export const dynamic' from routes that don't use auth/cookies"