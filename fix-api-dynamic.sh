#!/bin/bash

# Find all API route files
find app/api -name "route.ts" -o -name "route.js" | while read file; do
  # Check if file uses cookies, requireAuth, or auth-related functions
  if grep -q "cookies()\|requireAuth\|getUser\|getSession\|auth\.get" "$file"; then
    # Check if it already has dynamic export
    if ! grep -q "export const dynamic" "$file"; then
      echo "Fixing: $file"
      # Add the dynamic export after imports
      # Find the line number after the last import
      last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      if [ ! -z "$last_import_line" ]; then
        # Insert the dynamic export after imports
        sed -i '' "${last_import_line}a\\
\\
// Force dynamic rendering for this route\\
export const dynamic = 'force-dynamic'\\
" "$file"
      else
        # No imports, add at the beginning
        sed -i '' "1i\\
// Force dynamic rendering for this route\\
export const dynamic = 'force-dynamic'\\
\\
" "$file"
      fi
    fi
  fi
done

echo "API routes fixed for dynamic rendering"