#!/bin/bash

echo "🐺 Setting up Husky pre-commit hooks..."

# Install husky if not already installed
if ! npm list husky --depth=0 > /dev/null 2>&1; then
  echo "📦 Installing Husky..."
  npm install --save-dev husky
fi

# Initialize husky
echo "🔧 Initializing Husky..."
npx husky init

# Create pre-commit hook if it doesn't exist
if [ ! -f .husky/pre-commit ]; then
  echo "📝 Creating pre-commit hook..."
  npx husky add .husky/pre-commit "npm test"
fi

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/_/husky.sh

echo "✅ Husky setup complete!"
echo ""
echo "📋 Pre-commit checks enabled:"
echo "   - TypeScript type checking"
echo "   - ESLint code quality"
echo "   - Security validation"
echo "   - Sensitive data detection"
echo "   - Migration file validation"
echo ""
echo "💡 To skip hooks temporarily, use: HUSKY=0 git commit"