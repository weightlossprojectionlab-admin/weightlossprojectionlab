#!/bin/bash
set -e

echo "📋 Pre-Deployment Validation"
echo "============================"
echo ""

VALIDATION_FAILED=0

# Check Node.js version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "   Node.js version: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v(18|20|22)\. ]]; then
  echo "   ❌ Node.js version must be 18.x, 20.x, or 22.x"
  VALIDATION_FAILED=1
else
  echo "   ✅ Node.js version is compatible"
fi

# Check npm version
echo ""
echo "2. Checking npm version..."
NPM_VERSION=$(npm -v)
echo "   npm version: $NPM_VERSION"
echo "   ✅ npm is available"

# Check Git status
echo ""
echo "3. Checking Git status..."
if git diff-index --quiet HEAD --; then
  echo "   ✅ Working directory is clean"
else
  echo "   ⚠️  Warning: Working directory has uncommitted changes"
  git status --short
  read -p "   Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "   Current branch: $CURRENT_BRANCH"

# Check for required environment files
echo ""
echo "4. Checking environment configuration..."
if [ -f ".env.production" ]; then
  echo "   ✅ .env.production exists"
else
  echo "   ❌ .env.production not found"
  VALIDATION_FAILED=1
fi

# Check for Firebase configuration
echo ""
echo "5. Checking Firebase configuration..."
if [ -f "firebase.json" ]; then
  echo "   ✅ firebase.json exists"
else
  echo "   ❌ firebase.json not found"
  VALIDATION_FAILED=1
fi

if [ -f ".firebaserc" ]; then
  echo "   ✅ .firebaserc exists"
else
  echo "   ❌ .firebaserc not found"
  VALIDATION_FAILED=1
fi

# Check Firebase rules
if [ -f "firestore.rules" ]; then
  echo "   ✅ firestore.rules exists"
else
  echo "   ⚠️  firestore.rules not found"
fi

if [ -f "storage.rules" ]; then
  echo "   ✅ storage.rules exists"
else
  echo "   ⚠️  storage.rules not found"
fi

# Check for required dependencies
echo ""
echo "6. Checking dependencies..."
if [ -d "node_modules" ]; then
  echo "   ✅ node_modules exists"
else
  echo "   ⚠️  node_modules not found, will install dependencies"
fi

# Check for package-lock.json
if [ -f "package-lock.json" ]; then
  echo "   ✅ package-lock.json exists"
else
  echo "   ⚠️  package-lock.json not found"
fi

# Run TypeScript type check
echo ""
echo "7. Running TypeScript type check..."
if npx tsc --noEmit; then
  echo "   ✅ TypeScript check passed"
else
  echo "   ❌ TypeScript check failed"
  VALIDATION_FAILED=1
fi

# Run linter
echo ""
echo "8. Running ESLint..."
if npm run lint; then
  echo "   ✅ Linter passed"
else
  echo "   ⚠️  Linter found issues"
  read -p "   Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    VALIDATION_FAILED=1
  fi
fi

# Check for critical security vulnerabilities
echo ""
echo "9. Checking for security vulnerabilities..."
if npm audit --audit-level=critical; then
  echo "   ✅ No critical vulnerabilities found"
else
  echo "   ⚠️  Critical vulnerabilities found"
  npm audit --audit-level=critical
  read -p "   Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    VALIDATION_FAILED=1
  fi
fi

# Check disk space
echo ""
echo "10. Checking disk space..."
if command -v df &> /dev/null; then
  DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ "$DISK_USAGE" -lt 90 ]; then
    echo "    ✅ Sufficient disk space (${DISK_USAGE}% used)"
  else
    echo "    ⚠️  Low disk space (${DISK_USAGE}% used)"
  fi
fi

# Summary
echo ""
echo "========================================="
if [ $VALIDATION_FAILED -eq 0 ]; then
  echo "✅ Pre-deployment validation PASSED"
  echo "========================================="
  exit 0
else
  echo "❌ Pre-deployment validation FAILED"
  echo "========================================="
  echo ""
  echo "Please fix the issues above before deploying."
  exit 1
fi
