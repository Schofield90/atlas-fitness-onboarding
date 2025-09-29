#!/bin/bash

echo "Finding and fixing all API routes that use dynamic features..."

# Find all route.ts files that use cookies, request.url, request.headers, or request.nextUrl
routes=$(find app/api -name "route.ts" -type f | xargs grep -l "cookies\|request\.url\|request\.headers\|request\.nextUrl" 2>/dev/null)

count=0
for route in $routes; do
  # Check if force-dynamic already exists
  if ! grep -q "export const dynamic" "$route"; then
    echo "Adding force-dynamic to: $route"
    
    # Find the line with the first import
    first_import_line=$(grep -n "^import" "$route" | head -1 | cut -d: -f1)
    
    # Find the last import line
    last_import_line=$(grep -n "^import" "$route" | tail -1 | cut -d: -f1)
    
    if [ -n "$last_import_line" ]; then
      # Insert after the last import
      insert_line=$((last_import_line + 1))
      sed -i '' "${insert_line}i\\
\\
// Force dynamic rendering to handle cookies and request properties\\
export const dynamic = 'force-dynamic';\\
" "$route"
      ((count++))
    fi
  fi
done

echo "Fixed $count API routes with dynamic features."
echo ""
echo "Also adding to routes that directly use auth.getUser() or auth.getSession()..."

# Find routes that use auth methods
auth_routes=$(find app/api -name "route.ts" -type f | xargs grep -l "auth\.getUser\|auth\.getSession\|getUser()\|getSession()" 2>/dev/null)

for route in $auth_routes; do
  # Check if force-dynamic already exists
  if ! grep -q "export const dynamic" "$route"; then
    echo "Adding force-dynamic to: $route"
    
    # Find the last import line
    last_import_line=$(grep -n "^import" "$route" | tail -1 | cut -d: -f1)
    
    if [ -n "$last_import_line" ]; then
      # Insert after the last import
      insert_line=$((last_import_line + 1))
      sed -i '' "${insert_line}i\\
\\
// Force dynamic rendering to handle authentication\\
export const dynamic = 'force-dynamic';\\
" "$route"
      ((count++))
    fi
  fi
done

echo "Total routes fixed: $count"