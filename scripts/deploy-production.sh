#!/bin/bash
set -e

echo "🚀 Production Deployment Script"
echo "================================"
echo ""

# Configuration
ENVIRONMENT="${1:-production}"
DRY_RUN="${2:-false}"

echo "Environment: $ENVIRONMENT"
echo "Dry Run: $DRY_RUN"
echo ""

# Pre-deployment checks
echo "📋 Phase 1: Pre-Deployment Checks"
echo "=================================="
bash scripts/pre-deploy-validation.sh || exit 1

# Backup creation
echo ""
echo "💾 Phase 2: Creating Backups"
echo "============================"
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "Backup timestamp: $BACKUP_TIMESTAMP"

# Create backups directory if it doesn't exist
mkdir -p backups

# Save current commit hash
git rev-parse HEAD > "backups/pre-deploy-commit-$BACKUP_TIMESTAMP.txt"
echo "✅ Saved current commit hash"

# Firebase backup instructions
echo ""
echo "⚠️  MANUAL ACTION REQUIRED:"
echo "   1. Create Firestore backup in Firebase Console"
echo "   2. Create Storage backup in Firebase Console"
echo ""
read -p "Press Enter when backups are complete..."

# Build application
echo ""
echo "🏗️  Phase 3: Building Application"
echo "================================"
echo "Installing dependencies..."
npm install

echo "Building Next.js application..."
npm run build

# Run tests
echo ""
echo "🧪 Phase 4: Running Test Suite"
echo "=============================="
npm test

# Deploy Firebase rules
echo ""
echo "🔥 Phase 5: Deploying Firebase Rules"
echo "===================================="
if [ "$DRY_RUN" = "false" ]; then
  echo "Deploying Firestore rules..."
  firebase deploy --only firestore:rules

  echo "Deploying Storage rules..."
  firebase deploy --only storage
else
  echo "DRY RUN: Would deploy Firebase rules"
fi

# Run migrations
echo ""
echo "📊 Phase 6: Running Migrations"
echo "=============================="
if [ "$DRY_RUN" = "false" ]; then
  # Check if migration scripts exist before running
  if [ -f "scripts/migrate-super-admins.ts" ]; then
    echo "Running super admin migration..."
    npx tsx scripts/migrate-super-admins.ts --apply
  else
    echo "⚠️  Super admin migration script not found, skipping..."
  fi

  if [ -f "scripts/migrate-document-paths.ts" ]; then
    echo "Running document path migration..."
    npx tsx scripts/migrate-document-paths.ts --apply
  else
    echo "⚠️  Document path migration script not found, skipping..."
  fi

  # Fix patient data if script exists
  if [ -f "scripts/fix-patient-data.ts" ]; then
    echo "Running patient data fixes..."
    npx tsx scripts/fix-patient-data.ts
  fi
else
  echo "DRY RUN: Would run migrations"
fi

# Deploy application
echo ""
echo "🚀 Phase 7: Deploying Application"
echo "================================="
if [ "$DRY_RUN" = "false" ]; then
  echo "Deploying to $ENVIRONMENT..."

  # Netlify deployment (adjust based on your deployment platform)
  if command -v netlify &> /dev/null; then
    netlify deploy --prod
  else
    echo "⚠️  Netlify CLI not found. Please deploy manually or install Netlify CLI"
    echo "   npm install -g netlify-cli"
    echo "   netlify deploy --prod"
  fi
else
  echo "DRY RUN: Would deploy application to $ENVIRONMENT"
fi

# Post-deployment validation
echo ""
echo "✅ Phase 8: Post-Deployment Validation"
echo "======================================"

if [ "$DRY_RUN" = "false" ]; then
  # Wait for deployment to propagate
  echo "Waiting 30 seconds for deployment to propagate..."
  sleep 30

  # Get production URL from environment or use default
  PRODUCTION_URL="${PRODUCTION_URL:-https://your-production-url.com}"

  echo "Running health checks on $PRODUCTION_URL..."
  bash scripts/post-deploy-validation.sh "$PRODUCTION_URL"
else
  echo "DRY RUN: Would run post-deployment validation"
fi

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Next Steps:"
echo "1. Monitor application logs"
echo "2. Run manual smoke tests"
echo "3. Check error reporting"
echo "4. Notify team of deployment"
echo ""
echo "Rollback instructions:"
echo "  bash scripts/rollback-deployment.sh $(cat backups/pre-deploy-commit-$BACKUP_TIMESTAMP.txt)"
