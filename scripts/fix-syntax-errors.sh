#!/bin/bash

# Fix syntax errors in settings pages
echo "Fixing syntax errors in settings pages..."

# List of files to fix
files=(
  "app/settings/phone/page.tsx"
  "app/settings/lead-scoring/page.tsx"
  "app/settings/calendar/page.tsx"
  "app/settings/pipelines/page.tsx"
  "app/settings/custom-fields/page.tsx"
  "app/settings/templates/page.tsx"
  "app/settings/staff/page.tsx"
)

for file in "${files[@]}"; do
  echo "Fixing $file..."
  # Fix the "catch finally" syntax error
  sed -i '' 's/} catch finally {/} catch (error) {/g' "$file"
  # Remove duplicate catch blocks
  sed -i '' '/} (error) {/d' "$file"
done

echo "✅ Syntax errors fixed!"