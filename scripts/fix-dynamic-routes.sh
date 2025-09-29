#!/bin/bash

# Fix Dynamic Server Usage errors by adding export const dynamic = 'force-dynamic' to API routes

echo "Adding force-dynamic to API routes that use cookies, headers, or request properties..."

# Admin routes
admin_routes=(
  "app/api/admin/apply-org-fix/route.ts"
  "app/api/admin/billing/metrics/route.ts"
  "app/api/admin/billing/revenue-chart/route.ts"
  "app/api/admin/billing/processor-stats/route.ts"
  "app/api/admin/impersonation/status/route.ts"
  "app/api/admin/system/health/route.ts"
  "app/api/admin/apply-nutrition-migration/route.ts"
  "app/api/admin/emergency-login/route.ts"
  "app/api/admin/check-messaging-schema/route.ts"
  "app/api/admin/impersonation/start/route.ts"
)

# Analytics routes
analytics_routes=(
  "app/api/analytics/dashboard/route.ts"
  "app/api/analytics/realtime/route.ts"
)

# AI routes
ai_routes=(
  "app/api/ai/active-conversations/route.ts"
  "app/api/ai/conversation-state/route.ts"
)

# Other routes
other_routes=(
  "app/api/appointments/staff/route.ts"
  "app/api/appointments/types/route.ts"
  "app/api/contacts/birthdays/route.ts"
)

# Function to add force-dynamic to a file
add_force_dynamic() {
  local file=$1
  if [ -f "$file" ]; then
    # Check if force-dynamic already exists
    if ! grep -q "export const dynamic" "$file"; then
      echo "Processing: $file"
      # Add the export at the top of the file after imports
      # First, find the line number of the first non-import line
      first_func_line=$(grep -n "export\|async function\|function\|const.*=.*async" "$file" | head -1 | cut -d: -f1)
      if [ -n "$first_func_line" ]; then
        # Insert before the first function/export
        sed -i '' "${first_func_line}i\\
// Force dynamic rendering to handle cookies and request properties\\
export const dynamic = 'force-dynamic';\\
" "$file"
      else
        # If no function found, add at the end of imports
        echo -e "\n// Force dynamic rendering to handle cookies and request properties\nexport const dynamic = 'force-dynamic';\n" >> "$file"
      fi
    else
      echo "Skipping (already has dynamic export): $file"
    fi
  else
    echo "File not found: $file"
  fi
}

# Process all routes
for route in "${admin_routes[@]}"; do
  add_force_dynamic "$route"
done

for route in "${analytics_routes[@]}"; do
  add_force_dynamic "$route"
done

for route in "${ai_routes[@]}"; do
  add_force_dynamic "$route"
done

for route in "${other_routes[@]}"; do
  add_force_dynamic "$route"
done

echo "Done! Added force-dynamic to API routes that need it."