#!/bin/bash

###############################################################################
# Pre-Migration Checklist Script
#
# This script performs automated pre-migration checks to ensure the environment
# is ready for production database migrations.
#
# Checks performed:
# - Environment variables configured
# - Firebase connectivity
# - Migration validation script execution
# - Backup verification reminders
#
# Exit codes:
#   0 - All checks passed, ready for migration
#   1 - Warnings present, review before proceeding
#   2 - Critical errors, do not proceed with migration
#
# Usage:
#   bash scripts/pre-migration-checklist.sh
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}$1${NC}"
    echo "$(printf '=%.0s' {1..60})"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Start checklist
print_header "📋 Pre-Migration Checklist"
echo "Date: $(date)"
echo ""

###############################################################################
# 1. Environment Variables Check
###############################################################################
print_header "🔑 Checking Environment Variables"

# Check SUPER_ADMIN_EMAILS
if [ -z "$SUPER_ADMIN_EMAILS" ]; then
    print_error "SUPER_ADMIN_EMAILS not set"
else
    # Count emails
    EMAIL_COUNT=$(echo "$SUPER_ADMIN_EMAILS" | tr ',' '\n' | grep -v '^[[:space:]]*$' | wc -l)
    print_success "SUPER_ADMIN_EMAILS configured ($EMAIL_COUNT email(s))"

    # Validate email format
    echo "$SUPER_ADMIN_EMAILS" | tr ',' '\n' | while read -r email; do
        email=$(echo "$email" | xargs) # Trim whitespace
        if [ -n "$email" ]; then
            if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                print_warning "Invalid email format: $email"
            fi
        fi
    done
fi

# Check Firebase Admin credentials
if [ -n "$FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64" ]; then
    print_success "Firebase Admin credentials (base64) found"
elif [ -n "$FIREBASE_ADMIN_PROJECT_ID" ] && [ -n "$FIREBASE_ADMIN_CLIENT_EMAIL" ] && [ -n "$FIREBASE_ADMIN_PRIVATE_KEY" ]; then
    print_success "Firebase Admin credentials (individual vars) found"
else
    print_error "Firebase Admin credentials not found"
fi

# Check Firebase Project ID
if [ -n "$FIREBASE_ADMIN_PROJECT_ID" ] || [ -n "$FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64" ]; then
    print_success "Firebase Project ID configured"
else
    print_error "Firebase Project ID not set"
fi

# Check Storage Bucket
if [ -n "$FIREBASE_STORAGE_BUCKET" ]; then
    print_success "Firebase Storage bucket configured: $FIREBASE_STORAGE_BUCKET"
else
    print_warning "FIREBASE_STORAGE_BUCKET not set (will use default)"
fi

###############################################################################
# 2. Node.js and Dependencies Check
###############################################################################
print_header "📦 Checking Node.js and Dependencies"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_success "node_modules directory exists"
else
    print_warning "node_modules not found - run 'npm install'"
fi

# Check for required packages
if [ -f "package.json" ]; then
    if grep -q "firebase-admin" package.json; then
        print_success "firebase-admin package found in package.json"
    else
        print_error "firebase-admin package not found in package.json"
    fi

    if grep -q "tsx" package.json; then
        print_success "tsx package found in package.json"
    else
        print_warning "tsx package not found (required to run TypeScript scripts)"
    fi
fi

###############################################################################
# 3. Migration Scripts Check
###############################################################################
print_header "📄 Checking Migration Scripts"

# Check if migration scripts exist
REQUIRED_SCRIPTS=(
    "scripts/migrate-super-admins.ts"
    "scripts/migrate-document-paths.ts"
    "scripts/rollback-super-admins.ts"
    "scripts/rollback-document-paths.ts"
    "scripts/validate-migrations.ts"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        print_success "Found: $script"
    else
        print_error "Missing: $script"
    fi
done

###############################################################################
# 4. Firebase Connectivity Check
###############################################################################
print_header "🔥 Checking Firebase Connectivity"

print_info "Testing Firebase Admin SDK connectivity..."

# Test Firebase Auth connection
if command -v npx &> /dev/null; then
    # Create a temporary test script
    TEST_SCRIPT=$(cat <<'EOF'
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

try {
  if (!admin.apps.length) {
    const base64ServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;

    if (base64ServiceAccount) {
      const serviceAccount = JSON.parse(
        Buffer.from(base64ServiceAccount, 'base64').toString('utf8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
      });
    } else if (process.env.FIREBASE_ADMIN_PROJECT_ID &&
               process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
               process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`
      });
    } else {
      console.error('ERROR: Firebase credentials not configured');
      process.exit(1);
    }
  }

  // Test Auth connection
  admin.auth().listUsers(1)
    .then(() => {
      console.log('SUCCESS: Firebase Auth connected');
      return admin.firestore().collection('_test_').limit(1).get();
    })
    .then(() => {
      console.log('SUCCESS: Firestore connected');
      return admin.storage().bucket().getFiles({ maxResults: 1 });
    })
    .then(() => {
      console.log('SUCCESS: Firebase Storage connected');
      process.exit(0);
    })
    .catch((error) => {
      console.error('ERROR: Firebase connection failed:', error.message);
      process.exit(1);
    });
} catch (error) {
  console.error('ERROR: Firebase initialization failed:', error.message);
  process.exit(1);
}
EOF
)

    # Run the test script
    CONNECTIVITY_OUTPUT=$(echo "$TEST_SCRIPT" | npx tsx 2>&1)
    CONNECTIVITY_EXIT_CODE=$?

    if [ $CONNECTIVITY_EXIT_CODE -eq 0 ]; then
        if echo "$CONNECTIVITY_OUTPUT" | grep -q "Firebase Auth connected"; then
            print_success "Firebase Auth connection successful"
        fi
        if echo "$CONNECTIVITY_OUTPUT" | grep -q "Firestore connected"; then
            print_success "Firestore connection successful"
        fi
        if echo "$CONNECTIVITY_OUTPUT" | grep -q "Firebase Storage connected"; then
            print_success "Firebase Storage connection successful"
        fi
    else
        print_error "Firebase connectivity test failed"
        echo "$CONNECTIVITY_OUTPUT" | grep "ERROR:" | while read -r line; do
            echo "  $line"
        done
    fi
else
    print_warning "npx not available, skipping connectivity test"
fi

###############################################################################
# 5. Migration Validation Script
###############################################################################
print_header "🔍 Running Migration Validation"

if [ -f "scripts/validate-migrations.ts" ]; then
    print_info "Running comprehensive validation script..."
    echo ""

    # Run validation script and capture exit code
    if npx tsx scripts/validate-migrations.ts; then
        print_success "Migration validation passed"
    else
        VALIDATION_EXIT_CODE=$?
        if [ $VALIDATION_EXIT_CODE -eq 1 ]; then
            print_warning "Migration validation completed with warnings"
        else
            print_error "Migration validation failed with errors"
        fi
    fi
else
    print_error "Validation script not found: scripts/validate-migrations.ts"
fi

###############################################################################
# 6. Backup Verification Reminder
###############################################################################
print_header "💾 Backup Verification Reminder"

print_warning "CRITICAL: Backup verification must be done manually"
echo ""
print_info "Before proceeding with migration, ensure:"
echo "  1. Firestore backup exists (created within last 24 hours)"
echo "  2. Firebase Storage backup exists (created within last 24 hours)"
echo "  3. Backup restore process has been tested"
echo ""
print_info "To create Firestore backup:"
echo "  gcloud firestore export gs://[BUCKET_NAME]/backups/\$(date +%Y%m%d-%H%M%S)"
echo ""
print_info "To backup Firebase Storage:"
echo "  gsutil -m cp -r gs://[SOURCE_BUCKET]/documents/* gs://[BACKUP_BUCKET]/backups/\$(date +%Y%m%d-%H%M%S)/"
echo ""
print_info "To verify backups:"
echo "  gcloud firestore operations list --filter='TYPE:EXPORT' --limit=5"
echo "  gsutil ls -lh gs://[BACKUP_BUCKET]/backups/"
echo ""

###############################################################################
# 7. Summary
###############################################################################
print_header "📊 Pre-Migration Checklist Summary"

echo "Checks passed: $CHECKS_PASSED"
echo "Warnings: $WARNINGS"
echo "Errors: $CHECKS_FAILED"
echo ""

# Determine exit code
if [ $CHECKS_FAILED -gt 0 ]; then
    print_error "CRITICAL: $CHECKS_FAILED check(s) failed"
    echo ""
    echo "Do NOT proceed with migration until all errors are resolved."
    echo ""
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    print_warning "WARNING: $WARNINGS warning(s) present"
    echo ""
    echo "Review warnings carefully before proceeding with migration."
    echo "Some warnings may be acceptable (e.g., default storage bucket)."
    echo ""
    exit 1
else
    print_success "All checks passed!"
    echo ""
    echo "Environment is ready for migration."
    echo ""
    print_info "Next steps:"
    echo "  1. Verify backups are created (see above)"
    echo "  2. Review docs/MIGRATION_EXECUTION_PLAN.md"
    echo "  3. Run dry-run: npx tsx scripts/migrate-super-admins.ts"
    echo "  4. Run dry-run: npx tsx scripts/migrate-document-paths.ts"
    echo "  5. When ready: Run with --apply flag"
    echo ""
    exit 0
fi
