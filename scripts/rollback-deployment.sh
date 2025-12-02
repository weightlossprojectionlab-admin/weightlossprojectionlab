#!/bin/bash
set -e

echo "⚠️  PRODUCTION ROLLBACK SCRIPT"
echo "=============================="
echo ""

# Get rollback target
ROLLBACK_COMMIT="${1}"

if [ -z "$ROLLBACK_COMMIT" ]; then
  echo "Usage: $0 <commit-hash>"
  echo ""
  echo "Recent commits:"
  git log --oneline -10
  echo ""
  echo "Recent backups:"
  if [ -d "backups" ]; then
    ls -lt backups/pre-deploy-commit-*.txt | head -5
  else
    echo "No backups directory found"
  fi
  exit 1
fi

# Validate commit exists
if ! git rev-parse "$ROLLBACK_COMMIT" >/dev/null 2>&1; then
  echo "❌ Error: Commit $ROLLBACK_COMMIT does not exist"
  exit 1
fi

# Show commit details
echo "Rollback target commit:"
git log -1 --oneline "$ROLLBACK_COMMIT"
echo ""

# Show what will be reverted
echo "Changes that will be rolled back:"
git log --oneline HEAD..."$ROLLBACK_COMMIT"
echo ""

# Confirmation
echo "⚠️  WARNING: This will rollback production to commit $ROLLBACK_COMMIT"
echo ""
read -p "Type 'ROLLBACK' to confirm: " confirmation

if [ "$confirmation" != "ROLLBACK" ]; then
  echo "Rollback cancelled"
  exit 0
fi

echo ""
echo "Starting rollback process..."
echo ""

# Create emergency backup of current state
echo "1. Creating emergency backup of current state..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
git rev-parse HEAD > "backups/pre-rollback-commit-$BACKUP_TIMESTAMP.txt"
echo "   ✅ Saved current commit: $(cat backups/pre-rollback-commit-$BACKUP_TIMESTAMP.txt)"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo ""
  echo "⚠️  Warning: You have uncommitted changes"
  git status --short
  read -p "   Stash changes and continue? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git stash push -m "Pre-rollback stash $BACKUP_TIMESTAMP"
    echo "   ✅ Changes stashed"
  else
    echo "Rollback cancelled"
    exit 1
  fi
fi

echo ""
echo "2. Reverting code to $ROLLBACK_COMMIT..."
git checkout "$ROLLBACK_COMMIT"
echo "   ✅ Code reverted"

echo ""
echo "3. Installing dependencies..."
npm install
echo "   ✅ Dependencies installed"

echo ""
echo "4. Building application..."
npm run build
echo "   ✅ Application built"

echo ""
echo "5. Running tests..."
if npm test; then
  echo "   ✅ Tests passed"
else
  echo "   ⚠️  Tests failed, but continuing with rollback"
fi

echo ""
echo "6. Deploying rollback..."

# Check if Netlify CLI is available
if command -v netlify &> /dev/null; then
  netlify deploy --prod
  echo "   ✅ Rollback deployed"
else
  echo "   ⚠️  Netlify CLI not found. Please deploy manually:"
  echo "      npm install -g netlify-cli"
  echo "      netlify deploy --prod"
  read -p "   Press Enter when deployment is complete..."
fi

echo ""
echo "7. Running validation..."
# Get production URL from environment or prompt
PRODUCTION_URL="${PRODUCTION_URL:-https://your-production-url.com}"
read -p "   Enter production URL [$PRODUCTION_URL]: " input_url
PRODUCTION_URL="${input_url:-$PRODUCTION_URL}"

if [ -f "scripts/deployment-health-check.sh" ]; then
  bash scripts/deployment-health-check.sh "$PRODUCTION_URL"
else
  echo "   ⚠️  Health check script not found, please validate manually"
fi

echo ""
echo "========================================="
echo "✅ Rollback complete"
echo "========================================="
echo ""
echo "Rollback details:"
echo "  From: $(cat backups/pre-rollback-commit-$BACKUP_TIMESTAMP.txt)"
echo "  To: $ROLLBACK_COMMIT"
echo "  Timestamp: $BACKUP_TIMESTAMP"
echo ""
echo "Next steps:"
echo "1. Monitor application for stability"
echo "2. Verify functionality with manual tests"
echo "3. Review application logs for errors"
echo "4. Document rollback reason"
echo "5. Plan remediation for the original issue"
echo ""
echo "To return to the main branch:"
echo "  git checkout main"
echo ""
echo "To restore the pre-rollback state (if needed):"
echo "  git checkout $(cat backups/pre-rollback-commit-$BACKUP_TIMESTAMP.txt)"
