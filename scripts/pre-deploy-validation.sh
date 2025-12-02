#!/bin/bash
# Pre-Deployment Validation Script
# Run this before deploying to production

echo "🔍 Pre-Deployment Validation"
echo "=============================="
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
node --version || exit 1

# Check required env vars
echo "🔑 Checking environment variables..."
REQUIRED_VARS=("SUPER_ADMIN_EMAILS" "ALLOWED_ORIGINS" "NODE_ENV")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing: $var"
    else
        echo "✅ Set: $var"
    fi
done

# Run tests
echo "🧪 Running tests..."
npm test || exit 1

# Run build
echo "🏗️  Running build..."
npm run build || exit 1

echo ""
echo "✅ Pre-deployment validation complete!"
echo "Ready to deploy to production."
