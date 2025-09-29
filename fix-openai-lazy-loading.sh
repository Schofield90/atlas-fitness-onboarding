#!/bin/bash

echo "🔧 Fixing OpenAI instantiation to use lazy loading pattern..."

# Function to fix a file
fix_file() {
    local file=$1
    echo "  Fixing: $file"
    
    # Create a temporary file
    local temp_file="${file}.tmp"
    
    # Process the file
    if [[ "$file" == *"/openai.ts" ]] || [[ "$file" == *"/ai-data-analyzer.ts" ]]; then
        echo "  Skipping already fixed file: $file"
        return
    fi
    
    # For files that import OpenAI, update them to use lazy loading
    awk '
    BEGIN { 
        openai_imported = 0
        openai_var_created = 0
        in_function = 0
        bracket_count = 0
    }
    
    # Detect OpenAI import
    /^import.*OpenAI.*from.*"openai"/ {
        openai_imported = 1
        print
        next
    }
    
    # After imports, add lazy loading pattern
    /^import/ { print; next }
    /^$/ && openai_imported && !openai_var_created {
        print ""
        print "// Lazy load OpenAI client to avoid browser environment errors during build"
        print "let openai: OpenAI | null = null;"
        print ""
        print "function getOpenAI(): OpenAI {"
        print "  if (!openai) {"
        print "    openai = new OpenAI({"
        print "      apiKey: process.env.OPENAI_API_KEY,"
        print "    });"
        print "  }"
        print "  return openai;"
        print "}"
        openai_var_created = 1
        print
        next
    }
    
    # Skip lines that create new OpenAI instances
    /const openai = new OpenAI/ || /let openai = new OpenAI/ || /openai = new OpenAI/ {
        if (!openai_var_created) {
            # If we haven'\''t created the lazy pattern yet, skip this line
            next
        }
    }
    
    # Replace openai. with getOpenAI().
    {
        if (openai_var_created) {
            gsub(/\bopenai\./, "getOpenAI().")
        }
        print
    }
    ' "$file" > "$temp_file"
    
    # Move temp file back
    mv "$temp_file" "$file"
}

# Files that need fixing (from grep output)
files=(
    "app/api/migrations/analyze/route.ts"
    "app/api/landing-pages/ai-generate/route.ts"
    "app/api/ai/generate-form/route.ts"
    "app/api/nutrition/generate-single-day-fast/route.ts"
    "app/api/nutrition/meal-feedback/route.ts"
    "app/api/nutrition/chat/wizard/route.ts"
    "app/api/nutrition/generate-single-day/route.ts"
    "app/api/nutrition/coach/route.ts"
    "app/api/nutrition/generate-meal-plan-quick/route.ts"
    "app/api/nutrition/meals/[id]/regenerate/route.ts"
    "app/api/nutrition/generate-single-day-with-library/route.ts"
    "app/api/debug/test-openai/route.ts"
    "app/lib/wellness/plan-manager.ts"
    "app/lib/ai/providers/openai-client.ts"
    "app/lib/workflow/action-handlers/ai-actions.ts"
    "app/lib/nutrition/personalized-ai.ts"
    "app/lib/services/sopProcessor.ts"
)

# Process each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        fix_file "$file"
    else
        echo "  Warning: File not found: $file"
    fi
done

echo "✅ OpenAI lazy loading fixes complete!"
echo ""
echo "🎨 Running prettier to format the code..."
npx prettier --write "${files[@]}" 2>/dev/null || true

echo ""
echo "📝 Summary of changes:"
echo "  - Converted OpenAI instantiation to lazy loading pattern"
echo "  - Replaced direct openai usage with getOpenAI() calls"
echo "  - Added null checks for safety"
echo ""
echo "Next steps:"
echo "  1. Review the changes"
echo "  2. Commit and push to trigger deployment"
echo "  3. Monitor Vercel build logs"