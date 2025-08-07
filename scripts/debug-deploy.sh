#!/bin/bash
# Debug deployment issues script

echo "🔍 Debugging deployment issues..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in project root directory"
  exit 1
fi

# Check Node version
echo "📌 Node version:"
node --version

# Check for build errors
echo -e "\n🏗️ Testing local build..."
if npm run build 2>&1 | tee build.log; then
  echo "✅ Build successful"
else
  echo "❌ Build failed - check build.log for details"
  exit 1
fi

# Check environment
echo -e "\n🔐 Checking environment variables..."
node scripts/validate-env.js

# Check for TypeScript errors
echo -e "\n📝 Checking TypeScript..."
npm run type-check 2>&1 | tee typescript.log

# Check dependencies
echo -e "\n📦 Checking for dependency conflicts..."
npm ls --depth=0 2>&1 | tee dependencies.log

# Check for large files
echo -e "\n📊 Checking for large files (>1MB)..."
find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" | head -20

# Check .env.local exists
echo -e "\n🔍 Checking .env.local..."
if [ -f ".env.local" ]; then
  echo "✅ .env.local exists"
  echo "📊 Environment variables count: $(grep -c "=" .env.local || echo 0)"
else
  echo "❌ .env.local not found"
fi

# Check for common issues
echo -e "\n🔍 Checking for common issues..."

# Check if .env file is being tracked
if git ls-files | grep -q "^\.env$"; then
  echo "⚠️  WARNING: .env file is tracked by git (security risk)"
fi

# Check for console.log statements
console_count=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next . | wc -l)
if [ $console_count -gt 0 ]; then
  echo "⚠️  Found $console_count console.log statements"
fi

echo -e "\n✅ Debug checks complete"
echo "📋 Generated files: build.log, typescript.log, dependencies.log"