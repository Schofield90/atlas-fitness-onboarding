#!/bin/bash

echo "🔧 Fixing remaining OpenAI instantiation issues..."

# Files that need fixing
files=(
  "app/api/nutrition/generate-single-day/route.ts"
  "app/api/nutrition/generate-single-day-with-library/route.ts"
  "app/api/nutrition/generate-single-day-fast/route.ts"
  "app/api/nutrition/generate-meal-plan-quick/route.ts"
  "app/api/debug/test-openai/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Fixing: $file"
    
    # Create a temporary file
    temp_file="${file}.tmp"
    
    # Process the file - remove duplicate OpenAI setup and use central import
    awk '
    BEGIN { 
      openai_imported = 0
      skip_lines = 0
      in_lazy_function = 0
      needs_import = 1
    }
    
    # Skip the duplicate lazy load section
    /^\/\/ Lazy load OpenAI client/ {
      skip_lines = 14  # Skip the next 14 lines (the duplicate function)
      next
    }
    
    # Skip lines if in skip mode
    skip_lines > 0 {
      skip_lines--
      next
    }
    
    # Replace OpenAI import with our central import
    /^import OpenAI from "openai"/ {
      print "import { getOpenAI } from \"@/app/lib/openai\";"
      openai_imported = 1
      needs_import = 0
      next
    }
    
    # Add import after other imports if not found
    /^import.*from/ {
      print
      next
    }
    
    # After imports, add our import if needed
    /^$/ && needs_import && !openai_imported {
      print "import { getOpenAI } from \"@/app/lib/openai\";"
      print ""
      openai_imported = 1
      needs_import = 0
      next
    }
    
    # Remove direct OpenAI instantiation
    /const openai = new OpenAI\(/ {
      # Skip this line and the next 2 lines
      getline  # Skip apiKey line
      getline  # Skip closing })
      next
    }
    
    # Replace openai.chat.completions.create with getOpenAI().chat.completions.create
    {
      gsub(/\bopenai\.chat\.completions\.create/, "getOpenAI().chat.completions.create")
      gsub(/\bopenai\.embeddings\.create/, "getOpenAI().embeddings.create")
      gsub(/\bopenai\.images\.generate/, "getOpenAI().images.generate")
      print
    }
    ' "$file" > "$temp_file"
    
    # Move temp file back
    mv "$temp_file" "$file"
  else
    echo "  Warning: File not found: $file"
  fi
done

# Fix files in ai/ folder
ai_files=(
  "app/api/ai/test-system/route.ts"
  "app/api/ai/lead-scoring/route.ts"
  "app/api/ai/insights/recommendations/route.ts"
)

for file in "${ai_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Fixing: $file"
    
    # Check if file imports OpenAI
    if grep -q "openai" "$file"; then
      # Create a temporary file
      temp_file="${file}.tmp"
      
      # Add import and replace usage
      awk '
      BEGIN { 
        needs_import = 1
        has_openai = 0
      }
      
      # Check if OpenAI is imported
      /import.*[Oo]pen[Aa][Ii]/ {
        has_openai = 1
        print "import { getOpenAI } from \"@/app/lib/openai\";"
        needs_import = 0
        next
      }
      
      # Add import after first import if needed
      /^import.*from/ && needs_import {
        print
        print "import { getOpenAI } from \"@/app/lib/openai\";"
        needs_import = 0
        next
      }
      
      # Replace direct usage
      {
        gsub(/const openai = new OpenAI\([^)]*\)/, "")
        gsub(/\bopenai\./, "getOpenAI().")
        if ($0 != "") print
      }
      ' "$file" > "$temp_file"
      
      mv "$temp_file" "$file"
    fi
  fi
done

echo "✅ OpenAI fixes complete!"
echo ""
echo "📝 Summary:"
echo "  - Removed duplicate lazy loading functions"
echo "  - Centralized all OpenAI usage to app/lib/openai.ts"
echo "  - Fixed direct instantiations"