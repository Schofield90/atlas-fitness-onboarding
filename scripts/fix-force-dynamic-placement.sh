#!/bin/bash

echo "Fixing force-dynamic placement in API routes..."

# Find all route.ts files that have the misplaced export
files=$(find app/api -name "route.ts" -type f | xargs grep -l "export const dynamic = 'force-dynamic'" 2>/dev/null)

count=0
for file in $files; do
  echo "Fixing: $file"
  
  # Create a temporary file
  temp_file="${file}.tmp"
  
  # Remove the existing force-dynamic export line
  grep -v "export const dynamic = 'force-dynamic'" "$file" > "$temp_file"
  
  # Also remove the comment line if it exists
  grep -v "// Force dynamic rendering to handle" "$temp_file" > "${temp_file}2"
  mv "${temp_file}2" "$temp_file"
  
  # Find the last import line
  last_import_line=$(grep -n "^import\|^} from" "$temp_file" | tail -1 | cut -d: -f1)
  
  if [ -n "$last_import_line" ]; then
    # Insert after the last import
    head -n "$last_import_line" "$temp_file" > "${file}"
    echo "" >> "${file}"
    echo "// Force dynamic rendering to handle cookies and request properties" >> "${file}"
    echo "export const dynamic = 'force-dynamic';" >> "${file}"
    echo "" >> "${file}"
    tail -n +$((last_import_line + 1)) "$temp_file" >> "${file}"
  else
    # If no imports, add at the top
    echo "// Force dynamic rendering to handle cookies and request properties" > "${file}"
    echo "export const dynamic = 'force-dynamic';" >> "${file}"
    echo "" >> "${file}"
    cat "$temp_file" >> "${file}"
  fi
  
  rm "$temp_file"
  ((count++))
done

echo "Fixed $count files."