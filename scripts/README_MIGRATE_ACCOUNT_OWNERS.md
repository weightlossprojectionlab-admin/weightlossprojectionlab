# Account Owner Migration Script

## Overview

This migration script transforms existing users into Account Owners and properly configures their family members with appropriate roles and permissions.

## What It Does

1. **Identifies Account Owners**: Finds all users who have created patients (they become Account Owners)
2. **Sets Account Owner Status**: Updates user preferences with:
   - `isAccountOwner: true`
   - `accountOwnerSince: [earliest patient creation date]`
3. **Configures Family Members**: For each family member in the Account Owner's patients:
   - Sets `familyRole: 'caregiver'` (if not already set)
   - Sets `managedBy: [Account Owner's userId]`
   - Sets `canBeEditedBy: [Account Owner's userId]`
   - Sets `roleAssignedAt` and `roleAssignedBy` timestamps

## Prerequisites

- Firebase Admin SDK credentials configured in `.env.local`
- Either:
  - `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` (base64-encoded service account JSON)
  - Or all three: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`

## Usage

### Dry Run (Recommended First Step)

Preview changes without modifying the database:

```bash
npx tsx scripts/migrate-account-owners.ts --dry-run
```

### Live Migration

Execute the migration:

```bash
npx tsx scripts/migrate-account-owners.ts
```

### Migrate Single User

Test with a specific user:

```bash
# Dry run for single user
npx tsx scripts/migrate-account-owners.ts --dry-run --user-id=USER_ID_HERE

# Live migration for single user
npx tsx scripts/migrate-account-owners.ts --user-id=USER_ID_HERE
```

## Output

The script provides detailed console output including:

- Progress for each user and their family members
- Summary statistics:
  - Users processed
  - New Account Owners created
  - Existing Account Owners (already migrated)
  - Users without patients (skipped)
  - Family members updated
  - Family members with existing roles (preserved)
- Error messages (if any)
- Audit log location in Firestore

## Audit Logging

After a successful live migration, an audit log is saved to Firestore:

- Collection: `admin/migrations/audit_logs/[document_id]`
- Contains:
  - Migration timestamp
  - Summary statistics
  - Detailed entries for each change made
  - All actions taken (CREATE_ACCOUNT_OWNER, UPDATE_FAMILY_MEMBER, etc.)

## Edge Cases Handled

### Users Without Patients
- **Action**: Skipped (they are not Account Owners)
- **Logged**: Counted in `usersWithoutPatients`

### Existing Account Owners
- **Action**: Preserved (no changes made)
- **Logged**: Counted in `existingAccountOwners`

### Family Members With Existing Roles
- **Action**: Preserved (no overwrites)
- **Logged**: Counted in `familyMembersWithRoles`

### Missing Timestamps
- **Action**: Uses current timestamp or earliest available patient creation date
- **Logged**: Documented in audit log

### Multiple Patients Per User
- **Action**: Processes all family members across all patients
- **Uses**: Earliest patient creation date for `accountOwnerSince`

## Safety Features

1. **Dry Run Mode**: Test without making changes
2. **Idempotent**: Safe to run multiple times (preserves existing data)
3. **Audit Trail**: All changes logged to Firestore
4. **Error Handling**: Continues on individual failures, reports all errors at end
5. **Preservation**: Never overwrites existing roles or permissions

## Example Output

```
🚀 Starting Account Owner migration...
Mode: DRY RUN
============================================================
Target: All users
Found 150 users to process

📦 Processing user: abc123xyz
✓ User abc123xyz is already an Account Owner
  ✓ Family member def456 already has role configured
  [DRY RUN] Would update family member ghi789 (patient: patient1): {
    familyRole: 'caregiver',
    managedBy: 'abc123xyz',
    canBeEditedBy: ['abc123xyz'],
    roleAssignedAt: '2025-11-24T10:30:00.000Z',
    roleAssignedBy: 'abc123xyz'
  }
  Processed 1 family members
✅ User abc123xyz migration complete

============================================================
📊 Migration Summary
============================================================
Users processed: 150
New Account Owners: 120
Existing Account Owners: 25
Users without patients (skipped): 5
Family members updated: 87
Family members with existing roles: 43

🔍 DRY RUN COMPLETE - No changes made

✨ Script finished
```

## Troubleshooting

### Script Fails to Start
- Verify Firebase Admin credentials in `.env.local`
- Check that `dotenv` and `firebase-admin` packages are installed

### "User document not found" Warnings
- Normal for users in authentication but not yet onboarded
- These users are safely skipped

### "Failed to get earliest patient" Warnings
- Falls back to current timestamp
- Migration continues normally

### Family Members Not Updated
- Check that family members exist in subcollection: `users/{uid}/patients/{patientId}/familyMembers/{memberId}`
- Verify family member documents are not corrupted

## Rollback

If you need to rollback changes:

1. Use the audit log from Firestore to identify affected users
2. Create a rollback script based on the audit entries
3. Or manually update specific users via Firebase Console

## Integration with Existing System

This migration script is designed to work with:

- **Family Roles System** (`lib/family-roles.ts`)
- **Family Permissions** (`lib/family-permissions.ts`)
- **RBAC Middleware** (`lib/rbac-middleware.ts`)
- **Medical Records System** (`types/medical.ts`)

After running this migration, all users with patients will be properly configured as Account Owners with full family management capabilities.
