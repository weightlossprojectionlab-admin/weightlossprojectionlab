# Production Migration Execution Plan

**Date**: 2025-12-01
**Migrations**: 2 (Super Admin Custom Claims, Document Storage Paths)
**Estimated Duration**: 45-60 minutes
**Maintenance Window Required**: Recommended (optional for Migration 1, strongly recommended for Migration 2)

## Overview

This document provides a detailed, step-by-step execution plan for running two critical database migrations during production deployment:

1. **Super Admin Custom Claims Migration** - Moves hardcoded super admin emails to Firebase Custom Claims
2. **Document Storage Path Migration** - Migrates documents to user-scoped paths for security

## Pre-Migration Phase (15 minutes)

### 1. Backups

**CRITICAL**: Do not proceed without backups

- [ ] Firestore database backup created
- [ ] Firebase Storage backup created
- [ ] Backup timestamps recorded
- [ ] Backup verification completed

**Firestore Backup Command**:
```bash
# Replace [BUCKET_NAME] with your backup bucket
gcloud firestore export gs://[BUCKET_NAME]/backups/$(date +%Y%m%d-%H%M%S)
```

**Storage Backup Command**:
```bash
# Replace [SOURCE_BUCKET] and [BACKUP_BUCKET] with your bucket names
gsutil -m cp -r gs://[SOURCE_BUCKET]/documents/* gs://[BACKUP_BUCKET]/backups/$(date +%Y%m%d-%H%M%S)/
```

**Backup Verification**:
```bash
# List recent backups
gcloud firestore operations list --filter='TYPE:EXPORT' --limit=5

# Verify storage backup
gsutil ls -lh gs://[BACKUP_BUCKET]/backups/
```

### 2. Pre-Migration Validation

Run comprehensive validation script:

```bash
# Run pre-migration checklist
bash scripts/pre-migration-checklist.sh

# Expected output: All checks pass
# If warnings appear, review carefully before proceeding
```

**Manual Validation**:
- [ ] Review script output for any warnings
- [ ] Verify all super admin emails are correct
- [ ] Confirm storage bucket name is correct
- [ ] Check Firebase quota limits

### 3. Environment Verification

- [ ] `SUPER_ADMIN_EMAILS` environment variable set and verified
- [ ] Firebase Admin SDK credentials configured
- [ ] Storage bucket access verified
- [ ] Network connectivity to Firebase confirmed
- [ ] Production environment variables loaded

**Environment Check**:
```bash
# Verify environment variables
echo "Super Admin Emails: $SUPER_ADMIN_EMAILS"
echo "Project ID: $FIREBASE_ADMIN_PROJECT_ID"
echo "Storage Bucket: $FIREBASE_STORAGE_BUCKET"
```

### 4. Team Coordination

- [ ] Migration team assembled (minimum 2 people)
- [ ] Communication channels open (Slack/Teams/etc.)
- [ ] Rollback procedure reviewed by team
- [ ] Abort criteria established and agreed upon
- [ ] On-call engineer notified
- [ ] Monitoring dashboard open and ready

**Abort Criteria** (stop immediately if):
- More than 10% of operations fail
- Firebase services become unavailable
- User-reported access issues spike
- Critical errors in logs
- Backup verification fails

---

## Migration 1: Super Admin Custom Claims (15 minutes)

### Overview

- **Script**: `scripts/migrate-super-admins.ts`
- **Purpose**: Move hardcoded super admin emails to Firebase Custom Claims
- **Risk Level**: MEDIUM (affects admin authentication)
- **Reversible**: Yes (rollback script available)
- **Impact**: Super admins only (minimal user impact)

### Pre-Execution Checks

- [ ] Dry-run executed and reviewed
- [ ] All super admin emails validated
- [ ] No typos in email addresses
- [ ] All emails exist in Firebase Auth
- [ ] Current super admin access documented

### Execution Steps

#### Step 1: Dry Run (5 minutes)

```bash
# Run dry-run (safe, no changes)
npx tsx scripts/migrate-super-admins.ts

# Review output carefully
```

**Expected Dry-Run Output**:
```
🚀 Super Admin Custom Claims Migration
============================================================
Mode: DRY RUN

Super admin emails found: 2
  - admin1@example.com
  - admin2@example.com

[DRY RUN] Would set super admin claims for admin1@example.com (uid: abc123)
  Current claims: {}
  New claims: { role: 'super_admin', admin: true }

[DRY RUN] Would set super admin claims for admin2@example.com (uid: def456)
  Current claims: {}
  New claims: { role: 'super_admin', admin: true }

============================================================
📊 Migration Summary
============================================================
Super admin emails: 2
Users updated: 2
Users already set: 0
Users not found: 0

🔍 DRY RUN COMPLETE - No changes made

💡 This was a DRY RUN. To apply changes, run:
   npx tsx scripts/migrate-super-admins.ts --apply
```

#### Step 2: Review & Approve (2 minutes)

**Verification Checklist**:
- [ ] Output reviewed by migration lead
- [ ] Email addresses are correct (no typos)
- [ ] User count matches expectations
- [ ] No errors in output
- [ ] All UIDs are valid
- [ ] Team approval obtained (verbal confirmation)

**If Issues Found**:
- Stop and investigate
- Correct environment variables if needed
- Re-run dry-run after fixes
- Do not proceed until clean run

#### Step 3: Live Execution (5 minutes)

```bash
# Execute migration (LIVE MODE)
npx tsx scripts/migrate-super-admins.ts --apply

# Script will show warning:
# ⚠️  WARNING: This will set custom claims for super admin users!
# ⚠️  Waiting 3 seconds before proceeding...
```

**During Execution**:
- Watch console output for errors
- Monitor Firebase console
- Keep rollback command ready
- Document start time

**Expected Live Output**:
```
🚀 Super Admin Custom Claims Migration
============================================================
Mode: APPLY

Super admin emails found: 2
  - admin1@example.com
  - admin2@example.com

⚠️  WARNING: This will set custom claims for super admin users!
⚠️  Waiting 3 seconds before proceeding...

✅ Set super admin claims for admin1@example.com (uid: abc123)
✅ Set super admin claims for admin2@example.com (uid: def456)

============================================================
📊 Migration Summary
============================================================
Super admin emails: 2
Users updated: 2
Users already set: 0
Users not found: 0

✅ MIGRATION COMPLETE

✨ Script finished
```

#### Step 4: Verification (3 minutes)

**Automated Verification**:
```bash
# Run post-migration validation
bash scripts/post-migration-validation.sh
```

**Manual Verification**:
- [ ] Login as each super admin user
- [ ] Verify admin panel is accessible
- [ ] Test admin API endpoints
- [ ] Check Firebase console shows custom claims
- [ ] Review application logs for errors

**Firebase Console Check**:
1. Go to Firebase Console > Authentication > Users
2. Click on each super admin user
3. Verify Custom Claims show: `{ "role": "super_admin", "admin": true }`

### Success Criteria

- [ ] All super admin users have Custom Claims set
- [ ] Super admin authentication works for all users
- [ ] Admin panel accessible to all super admins
- [ ] No errors in application logs
- [ ] No user-reported access issues

### Rollback Procedure (If Issues Occur)

```bash
# Rollback immediately if issues detected
npx tsx scripts/rollback-super-admins.ts --apply

# Verify rollback successful
npx tsx scripts/rollback-super-admins.ts  # Dry run to verify state
```

**Post-Rollback Actions**:
1. Verify super admins can still access admin functions
2. Document what went wrong
3. Fix issues before retry
4. Schedule new migration time

---

## Migration 2: Document Storage Paths (30 minutes)

### Overview

- **Script**: `scripts/migrate-document-paths.ts`
- **Purpose**: Move documents to user-scoped paths (prevents cross-user access)
- **Risk Level**: HIGH (data migration, potential data loss if failed)
- **Reversible**: Yes (rollback script available)
- **Impact**: All users with documents (high impact)

### Pre-Execution Checks

- [ ] Dry-run executed and reviewed
- [ ] Storage backup created and verified
- [ ] Storage rules updated and deployed
- [ ] File count matches expectations
- [ ] Storage quota sufficient for migration

### Execution Steps

#### Step 1: Deploy Storage Rules (5 minutes)

**IMPORTANT**: Deploy new storage rules FIRST (before moving files)

```bash
# Deploy new storage rules
firebase deploy --only storage

# Verify rules deployed successfully
firebase storage:rules get
```

**Verify Rules Output**:
- Check that user-scoped rules are present
- Confirm rules require authentication
- Verify userId checking is enforced

**Expected Rules Structure**:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{patientId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### Step 2: Dry Run (10 minutes)

```bash
# Run dry-run (safe, no changes)
npx tsx scripts/migrate-document-paths.ts

# This will scan all documents and show migration plan
# May take several minutes depending on file count
```

**Expected Dry-Run Output**:
```
🚀 Document Path Migration
============================================================
Mode: DRY RUN
Bucket: your-project.appspot.com

🔍 Scanning Firebase Storage for documents...

Found 150 documents to migrate

Sample of files to migrate:
  1. documents/patient-abc123/report-2024-01.pdf
     → documents/user-xyz789/patient-abc123/report-2024-01.pdf
  2. documents/patient-abc123/lab-results.pdf
     → documents/user-xyz789/patient-abc123/lab-results.pdf
  ... and 148 more

Processing batch 1 of 15...
[DRY RUN] Would migrate:
  FROM: documents/patient-abc123/report-2024-01.pdf
  TO:   documents/user-xyz789/patient-abc123/report-2024-01.pdf
  Size: 2.45 MB

[... continues for all files ...]

============================================================
📊 Migration Summary
============================================================
Files found: 150
Files migrated: 150
Files skipped: 0
Total size: 250.75 MB

🔍 DRY RUN COMPLETE - No changes made

💡 This was a DRY RUN. To apply changes, run:
   npx tsx scripts/migrate-document-paths.ts --apply
```

#### Step 3: Review & Approve (5 minutes)

**Critical Review Checklist**:
- [ ] Output reviewed by migration lead
- [ ] File count is reasonable and expected
- [ ] Sample paths look correct (userId/patientId structure)
- [ ] No missing users or patients in paths
- [ ] Total storage size is as expected
- [ ] Storage bucket has sufficient space (+20% buffer)
- [ ] No errors or warnings in dry-run output
- [ ] Team approval obtained (documented)

**Red Flags** (stop if any occur):
- Large number of "user not found" warnings
- Unexpected file count (too many or too few)
- Errors accessing storage bucket
- Insufficient storage space
- Paths don't look correct

#### Step 4: Live Execution (15 minutes)

```bash
# Execute migration (LIVE MODE)
npx tsx scripts/migrate-document-paths.ts --apply

# Script will show warning:
# ⚠️  WARNING: This will move files in Firebase Storage!
# ⚠️  Waiting 5 seconds before proceeding...
```

**During Execution**:
- Monitor console output continuously
- Watch for error messages
- Track progress (batch completion)
- Keep rollback command ready
- Monitor Firebase Storage quota/usage
- Document any errors immediately

**Expected Live Output**:
```
🚀 Document Path Migration
============================================================
Mode: APPLY
Bucket: your-project.appspot.com

🔍 Scanning Firebase Storage for documents...

Found 150 documents to migrate

Sample of files to migrate:
  1. documents/patient-abc123/report-2024-01.pdf
     → documents/user-xyz789/patient-abc123/report-2024-01.pdf
  ... and 148 more

⚠️  WARNING: This will move files in Firebase Storage!
⚠️  Waiting 5 seconds before proceeding...

Processing batch 1 of 15...
📦 Migrating: documents/patient-abc123/report-2024-01.pdf
✅ Migrated: documents/patient-abc123/report-2024-01.pdf → documents/user-xyz789/patient-abc123/report-2024-01.pdf

📦 Migrating: documents/patient-abc123/lab-results.pdf
✅ Migrated: documents/patient-abc123/lab-results.pdf → documents/user-xyz789/patient-abc123/lab-results.pdf

[... continues for all batches ...]

Processing batch 15 of 15...
[... final batch ...]

📝 Operation log saved: migration-logs/document-paths-1733097600000.json

============================================================
📊 Migration Summary
============================================================
Files found: 150
Files migrated: 150
Files skipped: 0
Total size: 250.75 MB

✅ MIGRATION COMPLETE

✨ Script finished
```

#### Step 5: Post-Migration Verification (5 minutes)

**Automated Verification**:
```bash
# Run post-migration validation
bash scripts/post-migration-validation.sh
```

**Expected Validation Output**:
```
✅ Post-Migration Validation
============================

👤 Validating super admin migration...
✅ admin1@example.com - Custom Claims set
✅ admin2@example.com - Custom Claims set
✅ All super admins migrated successfully

📄 Validating document path migration...
⚠️  Manual verification required: Check document access in app

✅ Post-migration validation complete
```

**Manual Verification** (CRITICAL):

1. **Test Document Upload** (as regular user):
   - [ ] Login as a regular user
   - [ ] Upload a new document
   - [ ] Verify document goes to correct path: `documents/{userId}/{patientId}/{filename}`
   - [ ] Verify document is accessible after upload

2. **Test Document Access** (as regular user):
   - [ ] View existing documents
   - [ ] Download a document
   - [ ] Verify all documents are accessible
   - [ ] Check no broken links or missing files

3. **Test Cross-User Security** (CRITICAL):
   - [ ] Login as User A
   - [ ] Note a document path from User A
   - [ ] Login as User B
   - [ ] Attempt to access User A's document (should be DENIED)
   - [ ] Verify 403 Forbidden error

4. **Firebase Console Check**:
   - [ ] Open Firebase Console > Storage
   - [ ] Navigate to documents folder
   - [ ] Verify new structure: documents/{userId}/{patientId}/
   - [ ] Verify old structure documents are gone
   - [ ] Spot-check a few files are in correct locations

### Success Criteria

- [ ] All documents migrated to new paths
- [ ] All documents accessible by owners
- [ ] Cross-user access properly blocked
- [ ] No files lost or corrupted
- [ ] Storage rules enforced correctly
- [ ] New uploads go to correct paths
- [ ] No user-reported access issues

### Rollback Procedure (If Issues Occur)

**CRITICAL**: Only rollback if serious issues detected

```bash
# Rollback immediately if critical issues
npx tsx scripts/rollback-document-paths.ts --apply

# Use migration log for accurate rollback (recommended)
npx tsx scripts/rollback-document-paths.ts --log=migration-logs/document-paths-[TIMESTAMP].json --apply
```

**Post-Rollback Actions**:
1. Verify all documents accessible at old paths
2. Deploy old storage rules (if needed)
3. Test user access to documents
4. Document what went wrong
5. Fix issues before retry
6. Schedule new migration time

---

## Post-Migration Phase (15 minutes)

### Immediate Validation

#### 1. Run Security Regression Tests

```bash
# Run all security tests
npm test -- __tests__/security/

# Expected: All tests pass
```

#### 2. Verify Super Admin Functionality

- [ ] Admin login works for all super admins
- [ ] Admin panel is accessible
- [ ] Admin API endpoints respond correctly
- [ ] Custom claims are being checked correctly
- [ ] No degradation in admin functionality

#### 3. Verify Document Access

- [ ] Users can view their documents
- [ ] Users can upload new documents
- [ ] Cross-user access is blocked
- [ ] Storage rules are enforced
- [ ] No broken document links

### Monitoring (First 15 minutes)

**Log Monitoring**:
```bash
# Monitor application logs
# (adjust command based on your logging setup)
tail -f logs/production.log | grep -i error
```

**Check for**:
- [ ] No increase in error rates
- [ ] No authentication errors
- [ ] No storage access errors
- [ ] No "permission denied" errors from legitimate users
- [ ] User activity appears normal

**Firebase Console Monitoring**:
- [ ] Check Firebase Console > Usage
- [ ] Monitor Authentication activity
- [ ] Monitor Storage usage and requests
- [ ] Watch for quota warnings

**Application Monitoring**:
- [ ] Check user session activity
- [ ] Monitor API response times
- [ ] Watch for error spikes in monitoring dashboard
- [ ] Review any user-reported issues

### Documentation

- [ ] Record migration completion time
- [ ] Save all migration logs to secure location
- [ ] Document any issues encountered and resolutions
- [ ] Update production deployment status
- [ ] Create migration summary report
- [ ] Archive backup location and timestamps

**Migration Log Locations**:
- Super Admin Migration: `migration-logs/super-admin-[timestamp].json`
- Document Path Migration: `migration-logs/document-paths-[timestamp].json`
- Validation logs: Saved in execution terminal output

---

## Rollback Decision Matrix

| Scenario | Severity | Action | Rationale |
|----------|----------|--------|-----------|
| Migration script throws errors | HIGH | Abort, investigate, retry | Data integrity at risk |
| Some users not migrated | MEDIUM | Continue, fix manually after | Partial success acceptable |
| Cannot verify success | HIGH | Rollback immediately | Unknown state is risky |
| User access broken (multiple reports) | CRITICAL | Rollback immediately | User impact unacceptable |
| Storage rules not working | CRITICAL | Rollback immediately | Security breach risk |
| Minor issues in logs (< 5 errors) | LOW | Continue, monitor | Acceptable error rate |
| Single user cannot access files | MEDIUM | Continue, fix for that user | Isolated issue |
| Cross-user access still possible | CRITICAL | Rollback immediately | Security vulnerability |
| 10%+ of files failed to migrate | HIGH | Rollback, investigate | Too many failures |
| Storage quota exceeded | HIGH | Abort, increase quota | Cannot complete migration |

---

## Estimated Timeline

| Phase | Duration | Clock Time (Example) |
|-------|----------|---------------------|
| Pre-Migration Setup | 15 min | 2:00 AM - 2:15 AM |
| Super Admin Migration | 15 min | 2:15 AM - 2:30 AM |
| Document Path Migration | 30 min | 2:30 AM - 3:00 AM |
| Post-Migration Validation | 15 min | 3:00 AM - 3:15 AM |
| Monitoring & Documentation | 15 min | 3:15 AM - 3:30 AM |
| **Total** | **90 min** | **2:00 AM - 3:30 AM** |

**Buffer Time**: Additional 30 minutes allocated for:
- Unexpected issues
- Extended validation
- Rollback if needed (15 minutes per migration)

---

## Emergency Contacts

**Migration Lead**: __________________ (Phone: ______________)

**Database Admin**: __________________ (Phone: ______________)

**Firebase Admin**: __________________ (Phone: ______________)

**On-Call Engineer**: __________________ (Phone: ______________)

**Backup Contact**: __________________ (Phone: ______________)

---

## Communication Plan

### Before Migration

- [ ] Send "Migration Starting" notification to team
- [ ] Post maintenance notice (if applicable)
- [ ] Confirm all team members are available

### During Migration

- [ ] Post progress updates every 15 minutes
- [ ] Report any issues immediately
- [ ] Keep communication channel active

### After Migration

- [ ] Send "Migration Complete" notification
- [ ] Post summary of results
- [ ] Schedule follow-up meeting

**Communication Channels**:
- Primary: [Slack channel / Teams channel]
- Backup: [Email list]
- Emergency: [Phone numbers]

---

## Migration Sign-Off

**Migration Plan Reviewed By**:
- Name: __________________ Date: ________ Time: ________
- Name: __________________ Date: ________ Time: ________

**Pre-Migration Checks Complete**:
- Verified By: __________________ Date: ________ Time: ________
- Backups Verified: __________________ Date: ________ Time: ________

**Migration 1 (Super Admin) Complete**:
- Executed By: __________________ Date: ________ Time: ________
- Verified By: __________________ Date: ________ Time: ________

**Migration 2 (Document Paths) Complete**:
- Executed By: __________________ Date: ________ Time: ________
- Verified By: __________________ Date: ________ Time: ________

**Post-Migration Validation Complete**:
- Verified By: __________________ Date: ________ Time: ________
- Tests Passed: __________________ Date: ________ Time: ________

**Final Sign-Off** (All migrations successful and verified):
- Approved By: __________________ Date: ________ Time: ________
- Role: Migration Lead / Technical Lead

---

## Appendix A: Script Reference

### Migration Scripts

- `scripts/migrate-super-admins.ts` - Super admin custom claims migration
- `scripts/migrate-document-paths.ts` - Document path migration
- `scripts/rollback-super-admins.ts` - Rollback super admin migration
- `scripts/rollback-document-paths.ts` - Rollback document path migration
- `scripts/validate-migrations.ts` - Pre-flight validation

### Validation Scripts

- `scripts/pre-migration-checklist.sh` - Pre-migration checks
- `scripts/post-migration-validation.sh` - Post-migration validation

### Documentation

- `docs/MIGRATION_EXECUTION_PLAN.md` - This document
- `docs/MIGRATION_TIMELINE.md` - Recommended schedule
- `migration-logs/` - Migration operation logs (auto-generated)

---

## Appendix B: Troubleshooting Guide

### Issue: Super admin cannot login after migration

**Symptoms**: Super admin gets "access denied" error

**Solution**:
1. Check custom claims in Firebase Console
2. Verify claims are set correctly: `{ role: 'super_admin', admin: true }`
3. Have user logout and login again (force token refresh)
4. Check application code is reading custom claims correctly

### Issue: User cannot access documents after migration

**Symptoms**: User gets 403 Forbidden when accessing documents

**Solution**:
1. Check document path in Storage console
2. Verify path follows pattern: `documents/{userId}/{patientId}/{filename}`
3. Verify storage rules are deployed correctly
4. Check user is authenticated
5. Verify userId matches between Auth and document path

### Issue: Migration script times out

**Symptoms**: Script hangs or times out

**Solution**:
1. Check network connectivity to Firebase
2. Verify Firebase quota limits not exceeded
3. Run script with smaller batch size
4. Check Firebase service status

### Issue: Some documents not migrated

**Symptoms**: Dry run shows fewer files than expected

**Solution**:
1. Check for orphaned documents (patient deleted but files remain)
2. Verify patient documents have userId field in Firestore
3. Manually migrate remaining documents
4. Document orphaned files for cleanup

---

## Appendix C: Post-Migration Cleanup

### 7 Days After Migration

- [ ] Review migration logs for any anomalies
- [ ] Confirm no user-reported issues
- [ ] Verify all monitoring metrics are normal
- [ ] Archive migration logs to long-term storage

### 30 Days After Migration

- [ ] Delete old backup (if no issues)
- [ ] Remove rollback scripts from production (keep in repo)
- [ ] Document lessons learned
- [ ] Update runbooks with any new procedures

---

**Document Version**: 1.0
**Last Updated**: 2025-12-01
**Next Review Date**: Before Migration Execution
