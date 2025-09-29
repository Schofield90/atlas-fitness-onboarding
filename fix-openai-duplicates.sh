#!/bin/bash

echo "🔧 Fixing duplicate OpenAI lazy loading patterns..."

# Files with duplicates based on the system reminders
files=(
    "app/api/landing-pages/ai-generate/route.ts"
    "app/api/ai/generate-form/route.ts"
    "app/api/nutrition/coach/route.ts"
    "app/api/nutrition/meals/[id]/regenerate/route.ts"
    "app/lib/nutrition/personalized-ai.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  Fixing: $file"
        
        # Remove duplicate lazy loading patterns and direct instantiations
        # Keep only the first lazy loading pattern
        sed -i '' '
            # Remove duplicate openai variable declarations
            /^let openai: OpenAI | null = null;$/d
            # Remove duplicate getOpenAI functions after the first one
            /^function getOpenAI\(\): OpenAI {$/,/^}$/{
                /^function getOpenAI/!d
            }
            # Remove duplicate getOpenAIClient functions
            /^function getOpenAIClient\(\): OpenAI {$/,/^}$/d
            # Remove direct instantiations
            /^const openai = new OpenAI({$/,/^});$/d
            /^    openai = new OpenAI({$/d
            /^      apiKey: process\.env\.OPENAI_API_KEY$/d
            /^    });$/d
        ' "$file"
        
        # Add back the lazy loading pattern if needed
        if ! grep -q "function getOpenAI()" "$file"; then
            # Find the line after imports and add the lazy loading
            awk '
            BEGIN { imports_done = 0; added = 0 }
            /^import/ { print; next }
            /^$/ && !imports_done { imports_done = 1 }
            imports_done && !added {
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
                added = 1
            }
            { print }
            ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        fi
        
        # Replace all openai. with getOpenAI().
        sed -i '' 's/\bopenai\./getOpenAI()./g' "$file"
    fi
done

echo "✅ Fixed duplicate OpenAI patterns!"