# Household Duties Migration - Execution Guide

## Overview
This guide provides step-by-step instructions for executing the migration from patient-scoped to household-scoped duties in production.

---

## Prerequisites

### 1. Environment Setup
Ensure you have Firebase Admin credentials configured:

```bash
# Option 1: Service Account Key (Recommended for local execution)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

# Option 2: Application Default Credentials (for Cloud environments)
gcloud auth application-default login
```

### 2. Verify Access
Test Firebase Admin access:

```bash
npx tsx scripts/test-firebase-admin.ts
```

---

## Pre-Migration Checklist

### ✅ Code Deployment
- [ ] All Phase 1-4 code changes deployed to production
- [ ] New API endpoints verified working
- [ ] UI components tested with household-scoped data

### ✅ Database State
- [ ] Backup created of entire Firestore database
- [ ] No active duty creation/updates during migration window
- [ ] All users notified of maintenance window

### ✅ Migration Preparation
- [ ] Migration script tested in development/staging environment
- [ ] Rollback procedure documented and tested
- [ ] Monitoring alerts configured

---

## Migration Steps

### Step 1: Schedule Maintenance Window

**Recommended Time**: Off-peak hours (e.g., 2:00 AM - 4:00 AM local time)

**User Communication** (24 hours before):
```
Subject: Scheduled Maintenance - Multi-Household Management Update

Hello,

We're improving our household duties feature to support multi-household management!
This will allow you to manage duties across multiple residences (your home,
parent's home, etc.).

Maintenance Window: [Date] at [Time] (approximately 30 minutes)
During this time, the household duties feature will be temporarily unavailable.

No action required from you - your existing duties will be automatically updated.

Thank you for your patience!
```

### Step 2: Create Full Backup

```bash
# Backup entire Firestore database
npm run backup:firestore

# Verify backup file created
ls -lh backups/
```

### Step 3: Run Migration (Dry-Run)

```bash
# Execute dry-run to preview changes
npm run migrate:duties

# Expected output:
# ========================================
# Household Duties Migration Script
# Patient-scoped → Household-scoped
# ========================================
# Mode: DRY RUN (no changes)
# ========================================
#
# Found X duties to process
#
# [DRY RUN] Would migrate duty abc123 to household xyz789
# ✓ Created household "John's Household" for patient John
# ...
#
# ========================================
# Migration Summary
# ========================================
# Total duties: X
# Migrated: X
# Skipped: 0
# Errors: 0
# Log file: backups/migration-log-[timestamp].json
# ========================================
```

### Step 4: Review Migration Logs

```bash
# Check migration log for any issues
cat backups/migration-log-[timestamp].json | jq '.stats'

# Expected output:
# {
#   "total": X,
#   "migrated": X,
#   "skipped": 0,
#   "errors": 0
# }
```

**Review Checklist**:
- [ ] No errors in migration log
- [ ] All duties accounted for (total = migrated + skipped)
- [ ] Households created for patients without existing households
- [ ] Migration log file saved securely

### Step 5: Execute Live Migration

**⚠️ CRITICAL: Only proceed if dry-run completed successfully with 0 errors**

```bash
# Execute actual migration
npm run migrate:duties:live

# Expected output similar to dry-run but with actual database updates
```

**Monitor Progress**:
- Watch console output for any errors
- Check migration log file being generated
- Monitor Firebase Console for any anomalies

### Step 6: Post-Migration Validation

```bash
# Run validation checks
npm run validate:migration

# Manual spot checks:
# 1. Select 10-20 random duties
# 2. Verify each has:
#    - householdId field (required)
#    - forPatientId field (optional, should match old patientId)
#    - No orphaned patientId field
```

**Validation Checklist**:
- [ ] All duties have `householdId`
- [ ] Duties with patient context have `forPatientId`
- [ ] Old `patientId` field removed from migrated duties
- [ ] Stats calculation works correctly
- [ ] UI displays duties correctly

### Step 7: Test Core Workflows

**Critical User Flows to Test**:

1. **View Duties for Household**
   ```
   ✓ Navigate to Family Dashboard → Duties tab
   ✓ Select a household
   ✓ Verify duties appear
   ✓ Check stats are accurate
   ```

2. **Create New Duty**
   ```
   ✓ Click "Add Duty"
   ✓ Select household
   ✓ Optionally select patient
   ✓ Assign to caregiver
   ✓ Save
   ✓ Verify appears in duty list
   ```

3. **Complete Duty**
   ```
   ✓ Mark duty as complete
   ✓ Verify stats update
   ✓ Check if recurring duty rescheduled
   ```

4. **Multi-Household Switching**
   ```
   ✓ User with 2+ households
   ✓ Switch between households
   ✓ Verify correct duties shown
   ```

### Step 8: Monitor for 24 Hours

**Monitoring Checklist**:
- [ ] Error logs (no household-related errors)
- [ ] API latency (should remain < 200ms p95)
- [ ] User feedback/support tickets
- [ ] Database query performance

**Metrics to Track**:
```javascript
// Expected metrics
{
  "migration_success_rate": "100%",
  "api_error_rate": "< 0.1%",
  "api_p95_latency": "< 200ms",
  "user_adoption": {
    "household_creation_rate": "track over 7 days",
    "multi_household_users": "track over 7 days"
  }
}
```

---

## Rollback Procedure

**If Issues Detected**: Execute rollback immediately

### Rollback Steps

```bash
# 1. Identify migration log file
ls -lh backups/migration-log-*.json

# 2. Execute rollback
npm run migrate:duties:rollback backups/migration-log-[timestamp].json

# 3. Verify rollback
npm run validate:rollback

# 4. Notify users
# Post incident communication about temporary revert
```

### Post-Rollback Actions
1. Identify root cause of migration issue
2. Fix migration script or data issues
3. Test fix in staging environment
4. Schedule new migration attempt

---

## Common Issues & Solutions

### Issue 1: Duties Without Households
**Symptom**: Migration log shows duties skipped due to missing patient

**Solution**:
```bash
# Update migration script to handle orphaned duties
# Option 1: Create default household
# Option 2: Skip and notify admin
```

### Issue 2: Duplicate Households Created
**Symptom**: Same patient in multiple households

**Solution**:
```bash
# Migration script already handles this - uses first household found
# If duplicates exist, manual cleanup required
```

### Issue 3: Permission Errors Post-Migration
**Symptom**: Users can't access duties after migration

**Solution**:
```bash
# Verify household membership data
# Check household.memberIds includes patient
# Verify user role in household (createdBy, primaryCaregiverId, additionalCaregiverIds)
```

### Issue 4: Stats Calculation Errors
**Symptom**: Dashboard stats show incorrect counts

**Solution**:
```bash
# Recalculate stats for all households
npm run recalculate:household-stats
```

---

## Success Criteria

Migration is considered successful when:

✅ **Data Integrity**
- 100% of duties migrated (zero data loss)
- All duties have valid `householdId`
- No orphaned duties

✅ **Functionality**
- Users can view duties by household
- Users can create new duties
- Stats calculate correctly
- Multi-household users can switch between households

✅ **Performance**
- API latency within SLA (< 200ms p95)
- No increase in error rate
- Query performance acceptable

✅ **User Experience**
- No user-reported issues in first 24 hours
- Household creation workflow works smoothly
- Upgrade prompts display correctly for limit-reached scenarios

---

## Post-Migration Cleanup

**After 7 Days** (if migration successful):

1. **Remove Old Schema Support**
   ```bash
   # Remove any backward-compatibility code
   # Remove old patientId query support from APIs
   ```

2. **Archive Migration Logs**
   ```bash
   mv backups/migration-log-*.json archives/
   ```

3. **Update Documentation**
   - Mark migration as complete in MIGRATION_PLAN.md
   - Update API documentation
   - Update user guide

---

## Contact & Support

**During Migration**:
- Technical Lead: On-call during maintenance window
- Database Admin: Available for rollback if needed
- Support Team: Monitor support tickets

**Post-Migration**:
- Monitor Slack channel: #household-migration
- Escalation path: tech-lead → engineering-manager
- User support: support@yourdomain.com

---

## Appendix A: Migration Log Format

```json
{
  "migratedAt": "2025-01-15T02:00:00.000Z",
  "dryRun": false,
  "stats": {
    "total": 150,
    "migrated": 150,
    "skipped": 0,
    "errors": 0
  },
  "logs": [
    {
      "timestamp": "2025-01-15T02:00:05.123Z",
      "dutyId": "duty_abc123",
      "oldData": {
        "id": "duty_abc123",
        "patientId": "patient_xyz789",
        "name": "Clean kitchen",
        ...
      },
      "newData": {
        "id": "duty_abc123",
        "householdId": "household_def456",
        "forPatientId": "patient_xyz789",
        "name": "Clean kitchen",
        "migratedAt": "2025-01-15T02:00:05.123Z",
        "migratedFrom": "patient-scoped",
        ...
      },
      "householdCreated": true,
      "householdId": "household_def456"
    }
  ]
}
```

---

## Appendix B: Validation Queries

### Check All Duties Have Household IDs
```javascript
// Firestore query
db.collection('household_duties')
  .where('householdId', '==', null)
  .get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log('✓ All duties have householdId')
    } else {
      console.error(`✗ ${snapshot.size} duties missing householdId`)
    }
  })
```

### Verify Migrated Flag
```javascript
// Count migrated duties
db.collection('household_duties')
  .where('migratedFrom', '==', 'patient-scoped')
  .get()
  .then(snapshot => {
    console.log(`Migrated duties: ${snapshot.size}`)
  })
```

### Check Household Membership
```javascript
// Verify all forPatientIds are in household.memberIds
// Run manual spot checks on random duties
```

---

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-01-15
- **Migration Plan**: See MIGRATION_PLAN.md
- **Author**: Migration Team
