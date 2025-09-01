#!/bin/bash

# Script to fix all Suspense boundary issues in pages using useSearchParams

echo "🔧 Fixing Suspense boundary issues in all pages..."

# List of files that need fixing
FILES=(
  "app/contacts/page.tsx"
  "app/customers/page.tsx"
  "app/payments/sell/page.tsx"
  "app/auth/magic-link/page.tsx"
  "app/integrations/payments/page.tsx"
  "app/integrations/facebook/callback/page.tsx"
  "app/staff/accept-invite/page.tsx"
  "app/billing/page.tsx"
  "app/client-portal/claim/page.tsx"
)

for FILE in "${FILES[@]}"; do
  echo "Processing $FILE..."
  
  # Check if file exists
  if [ ! -f "$FILE" ]; then
    echo "  ⚠️  File not found: $FILE"
    continue
  fi
  
  # Check if already has Suspense import
  if grep -q "import.*Suspense.*from 'react'" "$FILE"; then
    echo "  ✅ Already has Suspense import"
  else
    # Add Suspense to React imports
    if grep -q "import {.*} from 'react'" "$FILE"; then
      # Add Suspense to existing React import
      sed -i '' "s/import { \(.*\) } from 'react'/import { \1, Suspense } from 'react'/" "$FILE"
      echo "  ✅ Added Suspense to existing React import"
    elif grep -q "import.*from 'react'" "$FILE"; then
      # Add new import line for Suspense
      sed -i '' "/import.*from 'react'/a\\
import { Suspense } from 'react'" "$FILE"
      echo "  ✅ Added new Suspense import"
    else
      # No React import, add one at the top after 'use client'
      sed -i '' "/^'use client'/a\\
\\
import { Suspense } from 'react'" "$FILE"
      echo "  ✅ Added new React Suspense import"
    fi
  fi
done

echo "✅ All files processed!"
echo ""
echo "Note: You may need to manually wrap components using useSearchParams in Suspense boundaries."
echo "The general pattern is:"
echo "  1. Create a separate component for content using useSearchParams"
echo "  2. Wrap that component in <Suspense> in the main export"