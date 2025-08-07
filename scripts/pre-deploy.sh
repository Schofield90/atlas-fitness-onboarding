#!/bin/bash
# Pre-deployment validation script

set -e  # Exit on any error

echo "🔍 Running pre-deployment checks..."

# 1. TypeScript compilation
echo "📝 Checking TypeScript..."
npm run type-check || { echo "❌ TypeScript check failed"; exit 1; }

# 2. Linting
echo "🧹 Running ESLint..."
npm run lint || { echo "❌ Linting failed"; exit 1; }

# 3. Build check
echo "🏗️ Testing build..."
npm run build || { echo "❌ Build failed"; exit 1; }

# 4. Environment variables check
echo "🔐 Validating environment variables..."
node scripts/validate-env.js || { echo "❌ Environment validation failed"; exit 1; }

echo "✅ All pre-deployment checks passed!"