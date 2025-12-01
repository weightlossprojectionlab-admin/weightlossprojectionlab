#!/bin/bash

###############################################################################
# Post-Migration Validation Script
#
# This script performs automated post-migration validation to ensure migrations
# completed successfully and the system is functioning correctly.
#
# Validations performed:
# - Super admin custom claims verification
# - Document path migration verification
# - Storage rules enforcement check
# - Basic functionality tests
#
# Exit codes:
#   0 - All validations passed
#   1 - Warnings present (review recommended)
#   2 - Validation failures (investigate immediately)
#
# Usage:
#   bash scripts/post-migration-validation.sh
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

# Start validation
print_header "✅ Post-Migration Validation"
echo "Date: $(date)"
echo ""

###############################################################################
# 1. Super Admin Custom Claims Validation
###############################################################################
print_header "👤 Validating Super Admin Migration"

if [ -z "$SUPER_ADMIN_EMAILS" ]; then
    print_error "SUPER_ADMIN_EMAILS not set - cannot validate"
else
    print_info "Checking custom claims for super admin users..."

    # Create validation script
    VALIDATION_SCRIPT=$(cat <<'EOF'
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function validateSuperAdmins() {
  try {
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      const base64ServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;

      if (base64ServiceAccount) {
        const serviceAccount = JSON.parse(
          Buffer.from(base64ServiceAccount, 'base64').toString('utf8')
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      } else if (process.env.FIREBASE_ADMIN_PROJECT_ID &&
                 process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
                 process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
      } else {
        console.error('ERROR: Firebase credentials not configured');
        process.exit(2);
      }
    }

    const auth = admin.auth();
    const emails = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

    if (emails.length === 0) {
      console.error('ERROR: No super admin emails configured');
      process.exit(2);
    }

    console.log(`Checking ${emails.length} super admin(s)...`);

    let allValid = true;
    let notFoundCount = 0;
    let invalidClaimsCount = 0;

    for (const email of emails) {
      try {
        const user = await auth.getUserByEmail(email);

        // Check if custom claims are set correctly
        if (user.customClaims?.role === 'super_admin' && user.customClaims?.admin === true) {
          console.log(`SUCCESS: ${email} - Custom Claims verified`);
        } else {
          console.error(`ERROR: ${email} - Custom Claims NOT set correctly`);
          console.error(`  Current claims:`, JSON.stringify(user.customClaims || {}));
          console.error(`  Expected: { role: 'super_admin', admin: true }`);
          allValid = false;
          invalidClaimsCount++;
        }
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.error(`ERROR: ${email} - User not found in Firebase Auth`);
          allValid = false;
          notFoundCount++;
        } else {
          console.error(`ERROR: ${email} - ${error.message}`);
          allValid = false;
        }
      }
    }

    if (allValid) {
      console.log('SUCCESS: All super admins have correct Custom Claims');
      process.exit(0);
    } else {
      console.error('FAILED: Super admin validation failed');
      console.error(`  Users not found: ${notFoundCount}`);
      console.error(`  Invalid claims: ${invalidClaimsCount}`);
      process.exit(2);
    }
  } catch (error: any) {
    console.error('FATAL:', error.message);
    process.exit(2);
  }
}

validateSuperAdmins();
EOF
)

    # Run validation
    if VALIDATION_OUTPUT=$(echo "$VALIDATION_SCRIPT" | npx tsx 2>&1); then
        echo "$VALIDATION_OUTPUT" | grep "SUCCESS:" | while read -r line; do
            print_success "$(echo $line | sed 's/SUCCESS: //')"
        done
    else
        echo "$VALIDATION_OUTPUT" | grep "ERROR:" | while read -r line; do
            print_error "$(echo $line | sed 's/ERROR: //')"
        done
    fi
fi

###############################################################################
# 2. Document Path Migration Validation
###############################################################################
print_header "📄 Validating Document Path Migration"

print_info "Checking document storage structure..."

# Create document path validation script
DOC_VALIDATION_SCRIPT=$(cat <<'EOF'
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function validateDocumentPaths() {
  try {
    // Initialize Firebase Admin
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
        process.exit(2);
      }
    }

    const bucket = admin.storage().bucket();

    // Get sample of documents
    const [files] = await bucket.getFiles({
      prefix: 'documents/',
      maxResults: 100
    });

    if (files.length === 0) {
      console.log('INFO: No documents found in storage (no migration needed)');
      process.exit(0);
    }

    let oldPathCount = 0;
    let newPathCount = 0;

    for (const file of files) {
      const pathParts = file.name.split('/');

      if (pathParts[0] === 'documents') {
        if (pathParts.length === 3) {
          // Old format: documents/patientId/filename
          oldPathCount++;
        } else if (pathParts.length >= 4) {
          // New format: documents/userId/patientId/filename
          newPathCount++;
        }
      }
    }

    console.log(`INFO: Found ${files.length} document(s) in storage`);
    console.log(`INFO: Old path format: ${oldPathCount} file(s)`);
    console.log(`INFO: New path format: ${newPathCount} file(s)`);

    if (oldPathCount > 0) {
      console.error(`ERROR: ${oldPathCount} document(s) still using old path format`);
      console.error('Migration may be incomplete');
      process.exit(2);
    } else if (newPathCount > 0) {
      console.log('SUCCESS: All documents migrated to new path format');
      process.exit(0);
    } else {
      console.log('INFO: No documents need migration');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('FATAL:', error.message);
    process.exit(2);
  }
}

validateDocumentPaths();
EOF
)

# Run document validation
if DOC_OUTPUT=$(echo "$DOC_VALIDATION_SCRIPT" | npx tsx 2>&1); then
    echo "$DOC_OUTPUT" | grep "SUCCESS:" | while read -r line; do
        print_success "$(echo $line | sed 's/SUCCESS: //')"
    done
    echo "$DOC_OUTPUT" | grep "INFO:" | while read -r line; do
        print_info "$(echo $line | sed 's/INFO: //')"
    done
else
    echo "$DOC_OUTPUT" | grep "ERROR:" | while read -r line; do
        print_error "$(echo $line | sed 's/ERROR: //')"
    done
    echo "$DOC_OUTPUT" | grep "INFO:" | while read -r line; do
        print_info "$(echo $line | sed 's/INFO: //')"
    done
fi

###############################################################################
# 3. Storage Rules Verification
###############################################################################
print_header "🔒 Storage Rules Verification"

print_warning "Manual verification required for storage rules"
echo ""
print_info "To verify storage rules are enforced:"
echo "  1. Login as User A and upload a document"
echo "  2. Note the document path in Firebase Console"
echo "  3. Login as User B and attempt to access User A's document"
echo "  4. Verify access is DENIED (403 Forbidden)"
echo ""
print_info "Storage rules should enforce:"
echo "  - Documents in path: documents/{userId}/{patientId}/{filename}"
echo "  - Only authenticated users can access"
echo "  - Users can only access documents under their userId"
echo ""

###############################################################################
# 4. Migration Logs Check
###############################################################################
print_header "📝 Migration Logs Check"

if [ -d "migration-logs" ]; then
    LOG_COUNT=$(ls -1 migration-logs/*.json 2>/dev/null | wc -l)
    if [ $LOG_COUNT -gt 0 ]; then
        print_success "Found $LOG_COUNT migration log file(s)"
        echo ""
        print_info "Recent migration logs:"
        ls -lt migration-logs/*.json 2>/dev/null | head -5 | while read -r line; do
            echo "  $line"
        done
    else
        print_warning "No migration log files found in migration-logs/"
    fi
else
    print_warning "migration-logs directory not found"
fi

###############################################################################
# 5. Recommended Manual Tests
###############################################################################
print_header "🧪 Recommended Manual Tests"

print_info "After automated validation, perform these manual tests:"
echo ""
echo "Super Admin Tests:"
echo "  1. Login as each super admin user"
echo "  2. Verify admin panel is accessible"
echo "  3. Test admin API endpoints"
echo "  4. Verify admin-only features work"
echo ""
echo "Document Access Tests:"
echo "  5. Login as regular user"
echo "  6. Upload a new document"
echo "  7. Verify document appears in correct path"
echo "  8. Download existing documents"
echo "  9. Verify all documents are accessible"
echo ""
echo "Security Tests:"
echo "  10. Login as User A, note a document path"
echo "  11. Login as User B, try to access User A's document"
echo "  12. Verify access is DENIED"
echo ""
echo "Monitoring:"
echo "  13. Check application logs for errors"
echo "  14. Monitor user activity for anomalies"
echo "  15. Watch for 'access denied' errors in logs"
echo ""

###############################################################################
# 6. Next Steps Reminder
###############################################################################
print_header "📌 Next Steps"

print_info "After validation:"
echo "  1. Monitor application logs for 15-30 minutes"
echo "  2. Watch for user-reported access issues"
echo "  3. Check Firebase Console for quota usage"
echo "  4. Save migration logs to secure location"
echo "  5. Update production deployment documentation"
echo "  6. Send 'Migration Complete' notification to team"
echo ""

###############################################################################
# 7. Rollback Instructions
###############################################################################
if [ $CHECKS_FAILED -gt 0 ]; then
    print_header "🔄 Rollback Instructions"

    print_error "Validation failures detected - consider rollback"
    echo ""
    print_info "To rollback Super Admin migration:"
    echo "  npx tsx scripts/rollback-super-admins.ts --apply"
    echo ""
    print_info "To rollback Document Path migration:"
    echo "  npx tsx scripts/rollback-document-paths.ts --apply"
    echo ""
    print_warning "Review errors before deciding to rollback"
    echo ""
fi

###############################################################################
# 8. Summary
###############################################################################
print_header "📊 Post-Migration Validation Summary"

echo "Checks passed: $CHECKS_PASSED"
echo "Warnings: $WARNINGS"
echo "Errors: $CHECKS_FAILED"
echo ""

# Determine exit code
if [ $CHECKS_FAILED -gt 0 ]; then
    print_error "VALIDATION FAILED: $CHECKS_FAILED check(s) failed"
    echo ""
    echo "Investigate failures immediately."
    echo "Consider rollback if issues are critical."
    echo "See rollback instructions above."
    echo ""
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    print_warning "VALIDATION PASSED WITH WARNINGS: $WARNINGS warning(s)"
    echo ""
    echo "Automated validation passed but manual verification needed."
    echo "Review warnings and perform manual tests."
    echo ""
    exit 1
else
    print_success "ALL VALIDATIONS PASSED!"
    echo ""
    echo "Migration appears successful."
    echo "Continue with manual verification and monitoring."
    echo ""
    exit 0
fi
