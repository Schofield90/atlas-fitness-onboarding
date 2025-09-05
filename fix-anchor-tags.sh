#!/bin/bash

# Find all files with internal <a> tags
files=$(grep -r 'href="/[^"]*"' app --include="*.tsx" --include="*.jsx" | grep "<a " | cut -d: -f1 | sort -u)

for file in $files; do
  echo "Processing: $file"
  
  # Check if Link is already imported
  if ! grep -q "import.*Link.*from.*'next/link'" "$file"; then
    # Add Link import at the top if not present
    if grep -q "^import" "$file"; then
      # Add after the last import
      sed -i '' "/^import/{ :a; n; /^import/ba; i\\
import Link from 'next/link'
}" "$file"
    else
      # Add at the very top if no imports exist
      sed -i '' "1i\\
import Link from 'next/link'\\
" "$file"
    fi
  fi
  
  # Replace <a href="/..."> with <Link href="/...">
  sed -i '' 's/<a href="\(\/[^"]*\)"/<Link href="\1"/g' "$file"
  # Replace </a> with </Link> for internal links
  perl -i -pe 's/(<Link[^>]*>.*?)<\/a>/$1<\/Link>/gs' "$file"
done

echo "Fixed anchor tags in $file"
