# Migration Procedures Guide

**Project**: Wellness Projection Lab
**Version**: 1.0.0
**Last Updated**: 2024-12-01
**Purpose**: Comprehensive guide for executing Sprint 1 security migrations safely

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Scripts](#migration-scripts)
4. [Execution Steps](#execution-steps)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Migration Validation](#post-migration-validation)
7. [Troubleshooting](#troubleshooting)
8. [Emergency Contacts](#emergency-contacts)

---

## Overview

This guide covers the execution of two critical security migrations:

1. **Super Admin Migration** (`scripts/migrate-super-admins.ts`)
   - Moves super admin emails from hardcoded arrays to Firebase Custom Claims
   - Enables dynamic super admin management via environment variables
   - Fixes typos in admin email addresses

2. **Document Path Migration** (`scripts/migrate-document-paths.ts`)
   - Moves Storage documents from `documents/{patientId}/` to `documents/{userId}/{patientId}/`
   - Prevents cross-user document access
   - Enforces user ownership at storage level

**Total Estimated Time**: 2-4 hours (including validation and monitoring)

**Risk Level**: MEDIUM
- Super Admin Migration: LOW (reversible, affects only admin access)
- Document Path Migration: MEDIUM (affects file storage, requires backup)

---

## Pre-Migration Checklist

### Environment Preparation

- [ ] **Staging Environment Tested**
  - All migrations tested in staging environment
  - Dry-run mode executed successfully
  - Rollback scripts tested and verified

- [ ] **Production Environment Setup**
  - `.env.local` or environment variables configured
  - `SUPER_ADMIN_EMAILS` set with correct email addresses
  - Firebase Admin credentials verified
  - `FIREBASE_STORAGE_BUCKET` configured (if not using default)

- [ ] **Backups Created**
  - Firestore backup created (within last 24 hours)
  - Storage bucket backup created (within last 24 hours)
  - Backup restore process tested
  - Backup locations documented

- [ ] **Team Notification**
  - Team notified of maintenance window
  - Expected downtime communicated (if any)
  - Rollback plan communicated
  - Support team on standby

- [ ] **Monitoring Setup**
  - Error logging enabled and accessible
  - Firebase Console access verified
  - Storage metrics baseline captured
  - Auth metrics baseline captured

### Validation Checks

Run the pre-flight validation script:

```bash
npx tsx scripts/validate-migrations.ts
```

**Required Result**: Exit code 0 (all checks passed)

If exit code is 1 (warnings), review warnings and ensure they are acceptable.
If exit code is 2 (errors), **DO NOT PROCEED** until all errors are resolved.

### Backup Commands

#### Firestore Backup

```bash
# Using gcloud CLI
gcloud firestore export gs://[BACKUP_BUCKET]/firestore-backup-$(date +%Y%m%d-%H%M%S)

# Verify backup
gsutil ls gs://[BACKUP_BUCKET]/firestore-backup-*
```

#### Storage Bucket Backup

```bash
# Using gsutil
gsutil -m cp -r gs://[SOURCE_BUCKET]/* gs://[BACKUP_BUCKET]/storage-backup-$(date +%Y%m%d-%H%M%S)/

# Verify backup
gsutil du -sh gs://[BACKUP_BUCKET]/storage-backup-*
```

---

## Migration Scripts

### Available Scripts

| Script | Purpose | Dry-Run Default | Abort Window |
|--------|---------|-----------------|--------------|
| `validate-migrations.ts` | Pre-flight validation | N/A | N/A |
| `migrate-super-admins.ts` | Super admin Custom Claims migration | Yes | 3 seconds |
| `migrate-document-paths.ts` | Storage path migration | Yes | 5 seconds |
| `rollback-super-admins.ts` | Rollback super admin migration | Yes | 3 seconds |
| `rollback-document-paths.ts` | Rollback document path migration | Yes | 5 seconds |

### Script Options

All migration and rollback scripts support:

- **Dry-Run Mode** (default): `npx tsx scripts/[script-name].ts`
  - Shows what would be changed
  - No actual modifications made
  - Safe to run multiple times

- **Live Mode**: `npx tsx scripts/[script-name].ts --apply`
  - Actually performs changes
  - Includes abort window (3-5 seconds)
  - Creates operation logs for audit trail

---

## Execution Steps

### Step 1: Pre-Flight Validation

**Time**: 5-10 minutes

```bash
# Run validation script
npx tsx scripts/validate-migrations.ts

# Expected output:
# ✅ Environment Configuration (4/4 checks passed)
# ✅ Firebase Connectivity (4/4 checks passed)
# ✅ Data Validation (5/5 checks passed)
# ⚠️  Backup Verification (0/2 checks passed)
#
# Exit code: 1 (warnings present)
```

**Action Items**:
- Verify all errors are resolved
- Review and accept warnings
- Create backups as needed
- Document validation results

---

### Step 2: Super Admin Migration

**Time**: 10-15 minutes

#### 2.1 Dry Run

```bash
npx tsx scripts/migrate-super-admins.ts
```

**Expected Output**:
```
🚀 Super Admin Custom Claims Migration
============================================================
Mode: DRY RUN

Super admin emails found: 2
  - perriceconsulting@gmail.com
  - weightlossprojectionlab@gmail.com

[DRY RUN] Would set super admin claims for perriceconsulting@gmail.com (uid: abc123)
  Current claims: {}
  New claims: { role: 'super_admin', admin: true }

✅ User weightlossprojectionlab@gmail.com already has super admin claims

============================================================
📊 Migration Summary
============================================================
Super admin emails: 2
Users updated: 1
Users already set: 1
Users not found: 0

💡 This was a DRY RUN. To apply changes, run:
   npx tsx scripts/migrate-super-admins.ts --apply

🔍 DRY RUN COMPLETE - No changes made
```

**Review**:
- [ ] All expected emails are listed
- [ ] Email addresses are spelled correctly
- [ ] No unexpected "users not found" warnings
- [ ] Users already set is expected count

#### 2.2 Live Execution

```bash
npx tsx scripts/migrate-super-admins.ts --apply
```

**Abort Window**: You have 3 seconds to press Ctrl+C to cancel.

**Expected Output**:
```
⚠️  WARNING: This will set custom claims for super admin users!
⚠️  Waiting 3 seconds before proceeding...

✅ Set super admin claims for perriceconsulting@gmail.com (uid: abc123)
✅ User weightlossprojectionlab@gmail.com already has super admin claims

============================================================
📊 Migration Summary
============================================================
Super admin emails: 2
Users updated: 1
Users already set: 1

✅ MIGRATION COMPLETE
```

#### 2.3 Verification

```bash
# Test super admin functionality
# 1. Log in as super admin user
# 2. Access admin-only routes
# 3. Verify Custom Claims in Firebase Console:
#    - Go to Authentication > Users
#    - Click on super admin user
#    - Check Custom Claims shows: { "role": "super_admin", "admin": true }
```

**Verification Checklist**:
- [ ] Super admin can access admin routes
- [ ] Custom Claims visible in Firebase Console
- [ ] No errors in application logs
- [ ] Regular users still have normal access

---

### Step 3: Document Path Migration

**Time**: 30-60 minutes (depends on number of documents)

#### 3.1 Dry Run

```bash
npx tsx scripts/migrate-document-paths.ts
```

**Expected Output**:
```
🚀 Document Path Migration
============================================================
Mode: DRY RUN
Bucket: weight-loss-project.appspot.com

🔍 Scanning Firebase Storage for documents...

Found 142 documents to migrate

Sample of files to migrate:
  1. documents/patient-abc123/medical-form.pdf
     → documents/user-xyz789/patient-abc123/medical-form.pdf
  2. documents/patient-def456/id-card.jpg
     → documents/user-xyz789/patient-def456/id-card.jpg
  ... and 140 more

Processing batch 1 of 15...
[DRY RUN] Would migrate:
  FROM: documents/patient-abc123/medical-form.pdf
  TO:   documents/user-xyz789/patient-abc123/medical-form.pdf
  Size: 245.32 KB

...

============================================================
📊 Migration Summary
============================================================
Files found: 142
Files migrated: 142
Files skipped: 0
Total size: 45.67 MB

💡 This was a DRY RUN. To apply changes, run:
   npx tsx scripts/migrate-document-paths.ts --apply

🔍 DRY RUN COMPLETE - No changes made
```

**Review**:
- [ ] Expected number of documents
- [ ] Sample paths look correct (userId matches patient owner)
- [ ] No critical errors or warnings
- [ ] Total file size is reasonable

#### 3.2 Live Execution

```bash
npx tsx scripts/migrate-document-paths.ts --apply
```

**Abort Window**: You have 5 seconds to press Ctrl+C to cancel.

**Expected Output**:
```
⚠️  WARNING: This will move files in Firebase Storage!
⚠️  Waiting 5 seconds before proceeding...

Processing batch 1 of 15...
📦 Migrating: documents/patient-abc123/medical-form.pdf
✅ Migrated: documents/patient-abc123/medical-form.pdf → documents/user-xyz789/patient-abc123/medical-form.pdf

...

📝 Operation log saved: migration-logs/document-paths-1733072400000.json

============================================================
📊 Migration Summary
============================================================
Files found: 142
Files migrated: 140
Files skipped: 2
Total size: 45.67 MB

✅ MIGRATION COMPLETE
```

**IMPORTANT**: Save the operation log file path. You'll need it for rollback if necessary.

#### 3.3 Verification

```bash
# Test document access
# 1. Log in as a user with patient documents
# 2. Navigate to patient document list
# 3. Verify all documents are visible
# 4. Download a sample document
# 5. Upload a new document (should use new path structure)
```

**Verification Checklist**:
- [ ] All documents visible in application
- [ ] Documents can be downloaded
- [ ] New uploads use new path structure
- [ ] No 403/404 errors in browser console
- [ ] Storage rules are enforcing user ownership

---

## Rollback Procedures

### When to Rollback

Rollback if:
- Migration causes application errors
- Users unable to access documents
- Data integrity issues detected
- Custom Claims not working correctly

### Super Admin Rollback

**Time**: 5-10 minutes

#### Dry Run

```bash
npx tsx scripts/rollback-super-admins.ts
```

#### Live Rollback

```bash
npx tsx scripts/rollback-super-admins.ts --apply
```

**Effect**:
- Removes `role: 'super_admin'` Custom Claims from all users
- Users revert to regular user access
- All custom claims removed (set to `null`)

**Post-Rollback**:
- Application will fall back to hardcoded super admin checks
- Super admins can still access admin features via hardcoded email list
- To re-migrate: Run `migrate-super-admins.ts --apply` again

---

### Document Path Rollback

**Time**: 30-60 minutes (depends on number of documents)

#### Using Migration Log (Recommended)

```bash
# Dry run with log
npx tsx scripts/rollback-document-paths.ts --log=migration-logs/document-paths-1733072400000.json

# Live rollback with log
npx tsx scripts/rollback-document-paths.ts --log=migration-logs/document-paths-1733072400000.json --apply
```

**Advantages**:
- Only rolls back successfully migrated files
- Uses exact paths from migration
- Faster than full bucket scan

#### Without Migration Log (Full Scan)

```bash
# Dry run (scans entire bucket)
npx tsx scripts/rollback-document-paths.ts

# Live rollback (scans entire bucket)
npx tsx scripts/rollback-document-paths.ts --apply
```

**Post-Rollback**:
- Documents back at old paths: `documents/{patientId}/`
- **CRITICAL**: Update Storage rules to allow old path structure
- Application may need code changes to use old paths
- Security: Cross-user document access vulnerability returns

**Storage Rules Rollback**:

```javascript
// In storage.rules - revert to old structure
match /documents/{patientId}/{documentId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.resource.size < 20 * 1024 * 1024;
  allow delete: if request.auth != null;
}
```

---

## Post-Migration Validation

### Immediate Checks (Within 1 Hour)

- [ ] **Application Functionality**
  - Users can log in successfully
  - Super admins can access admin routes
  - Regular users have expected access
  - Document uploads working
  - Document downloads working

- [ ] **Error Monitoring**
  - No spike in error logs
  - No 403 Forbidden errors
  - No 404 Not Found errors
  - No Firebase permission errors

- [ ] **Performance**
  - No significant slowdown in document access
  - Storage operations completing normally
  - Auth operations completing normally

### Extended Monitoring (24 Hours)

- [ ] **Security Regression Tests**
  - Run security test suite: `npm test`
  - Verify all tests pass
  - No new security vulnerabilities

- [ ] **User Feedback**
  - Monitor support tickets
  - Check for document access issues
  - Check for admin access issues

- [ ] **Data Integrity**
  - Random sample document verification
  - Check for missing documents
  - Verify metadata preserved

### Week-Long Monitoring

- [ ] **Trend Analysis**
  - Error rate trends normal
  - Performance metrics stable
  - No recurring issues

- [ ] **Backup Validation**
  - Post-migration backups created
  - Migration logs archived
  - Rollback procedures documented

---

## Troubleshooting

### Common Issues

#### Issue: "Firebase connection timeout"

**Symptoms**: Migration script hangs or times out during Firebase operations

**Solutions**:
1. Check network connectivity
2. Verify Firebase credentials are correct
3. Check Firebase service status: https://status.firebase.google.com
4. Retry with smaller batch size (edit script `batchSize` variable)
5. Check firewall rules allow Firebase connections

**Prevention**: Run validation script before migration

---

#### Issue: "User not found for email"

**Symptoms**: Migration shows "⚠️ User not found: [email]"

**Solutions**:
1. Verify email spelling in `SUPER_ADMIN_EMAILS`
2. Check user exists in Firebase Console > Authentication
3. Confirm email is lowercase (script normalizes to lowercase)
4. Check for extra spaces in environment variable

**Prevention**: Run dry-run mode first and review output

---

#### Issue: "Destination file already exists"

**Symptoms**: Document migration shows "⚠️ Destination already exists"

**Solutions**:
1. This is expected for already-migrated files (safe to skip)
2. Check if partial migration already occurred
3. Review migration log to see what was previously migrated
4. If rollback needed, use rollback script with log file

**Prevention**: Always run dry-run mode first

---

#### Issue: "Patient document not found"

**Symptoms**: Migration can't find patient document for userId lookup

**Solutions**:
1. Document belongs to deleted patient (orphaned file)
2. Patient data corrupted or missing `userId` field
3. Firestore permission issue

**Resolution**:
- Orphaned files are skipped (documented in migration summary)
- Manually investigate orphaned files
- Consider manual cleanup of orphaned documents

---

#### Issue: "Storage permission denied"

**Symptoms**: "Error: User does not have permission to access this bucket"

**Solutions**:
1. Verify Firebase Admin credentials have Storage access
2. Check service account IAM roles in Google Cloud Console
3. Ensure service account has "Storage Admin" or "Storage Object Admin" role
4. Verify `FIREBASE_STORAGE_BUCKET` is correct

**Prevention**: Run validation script before migration

---

#### Issue: "Custom Claims not working after migration"

**Symptoms**: Super admins can't access admin routes after migration

**Solutions**:
1. Users need to log out and log back in (token refresh)
2. Clear browser cookies/cache
3. Verify Custom Claims in Firebase Console
4. Check application code is checking `customClaims.role === 'super_admin'`
5. Check middleware is verifying tokens correctly

**Prevention**: Communicate to admins that logout/login is required

---

### Emergency Procedures

#### Complete Migration Failure

1. **STOP**: Do not proceed with any more operations
2. **ASSESS**: Check error logs to understand failure scope
3. **ROLLBACK**: Use rollback scripts immediately
4. **RESTORE**: If needed, restore from backups
5. **INVESTIGATE**: Analyze root cause before retry
6. **COMMUNICATE**: Update team on status

#### Data Loss Detected

1. **IMMEDIATE**: Stop all write operations if possible
2. **VERIFY**: Confirm data loss scope
3. **RESTORE**: Initiate backup restoration process
4. **DOCUMENT**: Log all actions taken
5. **ROOT CAUSE**: Investigate after restoration

#### Application Down

1. **CHECK**: Verify if migration-related
2. **ROLLBACK**: If migration-related, rollback immediately
3. **MONITOR**: Watch for service restoration
4. **INVESTIGATE**: Debug root cause
5. **COMMUNICATE**: Keep stakeholders updated

---

## Emergency Contacts

### Team Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Project Lead | TBD | TBD | 24/7 during migration |
| DevOps Lead | TBD | TBD | 24/7 during migration |
| Firebase Admin | TBD | TBD | On-call |
| Support Lead | TBD | TBD | Business hours |

### External Resources

- **Firebase Support**: https://firebase.google.com/support
- **Firebase Status**: https://status.firebase.google.com
- **Google Cloud Support**: https://cloud.google.com/support
- **Migration Documentation**: This document

---

## Appendix

### Environment Variables Reference

```bash
# Required for Super Admin Migration
SUPER_ADMIN_EMAILS=email1@example.com,email2@example.com

# Required for Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OR use base64 encoded service account (preferred)
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi...

# Optional - defaults to {projectId}.appspot.com
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com
```

### Migration Log File Locations

All migration and rollback operations create log files in:

```
migration-logs/
├── super-admin-{timestamp}.json
├── super-admin-rollback-{timestamp}.json
├── document-paths-{timestamp}.json
└── document-paths-rollback-{timestamp}.json
```

**Retention**: Keep logs for minimum 90 days after migration

### Success Criteria

Migration is considered successful when:

- ✅ All pre-migration validation checks pass
- ✅ Dry-run mode completes without critical errors
- ✅ Live migration completes with <5% error rate
- ✅ All post-migration validation checks pass
- ✅ No increase in error rates after 24 hours
- ✅ User feedback is neutral or positive
- ✅ Security regression tests pass
- ✅ Rollback capability verified and documented

---

**Document Version**: 1.0.0
**Last Reviewed**: 2024-12-01
**Next Review**: Before next major migration
**Maintained By**: DevOps Team
