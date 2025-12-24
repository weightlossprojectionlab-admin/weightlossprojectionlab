# Fix: Caregiver logVitals Permission Default

## Executive Summary

**CRITICAL BUG FIXED**: Caregivers were unable to log vitals by default due to incorrect permission defaults across multiple layers of the application. This violated the core principle that family caregivers should have `logVitals: true` by default for basic caregiving functionality.

## Root Cause Analysis

### Primary Issues Identified

1. **Zod Schema Defaults (CRITICAL)**
   - File: `lib/validations/medical.ts` line 482
   - All permissions defaulted to `false` except `viewPatientProfile`
   - This schema is used as the base for permission validation
   - Impact: Any permission object instantiated without explicit values inherited `logVitals: false`

2. **InviteModal Initial State Mismatch (CRITICAL)**
   - File: `components/family/InviteModal.tsx` lines 43-47
   - Role defaulted to `'caregiver'`
   - BUT permissions defaulted to `PERMISSION_PRESETS.VIEW_ONLY` (which has `logVitals: false`)
   - Impact: All new invitations sent before user changed preset had wrong permissions

3. **InviteModal Missing familyRole Field (CRITICAL)**
   - File: `components/family/InviteModal.tsx` line 116
   - `sendInvitation()` did not include `familyRole` in submission
   - Impact: API couldn't properly default permissions based on role

4. **EditMemberModal DEFAULT_PERMISSIONS (HIGH)**
   - File: `components/family/EditMemberModal.tsx` lines 36-52
   - All permissions defaulted to `false` when adding patient access
   - Impact: When editing member's patient access, permissions reset to all false

### What Was Already Correct

- `lib/family-permissions.ts` - `PERMISSION_PRESETS.CAREGIVER` had `logVitals: true` ✓
- `lib/family-roles.ts` - `ROLE_DEFAULT_PERMISSIONS` mapped correctly ✓
- `app/api/family/roles/assign/route.ts` - Used `getDefaultPermissionsForRole()` ✓
- `components/family/ExternalCaregiverInvitationFlow.tsx` - External caregivers had `logVitals: true` ✓

## Files Modified

### 1. lib/validations/medical.ts

**Changed:** Lines 471-496
**Reason:** Schema defaults were blocking correct permissions from being applied

**Before:**
```typescript
export const familyMemberPermissionsSchema = z.object({
  viewPatientProfile: z.boolean().default(true),
  viewMedicalRecords: z.boolean().default(false),
  // ... all others false
  logVitals: z.boolean().default(false), // ❌ WRONG
  viewVitals: z.boolean().default(false),
  // ...
})
```

**After:**
```typescript
/**
 * IMPORTANT: Schema defaults should match role-based presets from lib/family-permissions.ts
 * Default to "Viewer" role permissions (read-only) for safety.
 * Actual permissions will be set based on FamilyRole when invitation is created.
 *
 * DO NOT use these defaults directly - always use getDefaultPermissionsForRole() from lib/family-roles.ts
 */
export const familyMemberPermissionsSchema = z.object({
  viewPatientProfile: z.boolean().default(true), // VIEW_ONLY preset
  viewMedicalRecords: z.boolean().default(true), // VIEW_ONLY preset
  // ...
  logVitals: z.boolean().default(false), // VIEW_ONLY preset (read-only by default)
  viewVitals: z.boolean().default(true), // VIEW_ONLY preset
  chatAccess: z.boolean().default(true), // VIEW_ONLY preset
  // ...
})
```

**Note:** Schema still defaults to VIEW_ONLY (safe default), but now matches the VIEW_ONLY preset consistently. The key is that application code should use `getDefaultPermissionsForRole()` rather than relying on schema defaults.

---

### 2. components/family/EditMemberModal.tsx

**Changed:** Lines 36-58
**Reason:** When adding patient access to existing members, permissions were all false

**Before:**
```typescript
const DEFAULT_PERMISSIONS: FamilyMemberPermissions = {
  viewPatientProfile: false,
  viewMedicalRecords: false,
  // ... all false
  logVitals: false, // ❌ WRONG
  viewVitals: false,
  // ...
}
```

**After:**
```typescript
/**
 * Default permissions when adding patient access to a family member
 * Uses CAREGIVER preset as sensible default for family caregiving use cases
 *
 * IMPORTANT: Caregivers need logVitals: true by default for basic caregiving functions
 */
const DEFAULT_PERMISSIONS: FamilyMemberPermissions = {
  viewPatientProfile: true,
  viewMedicalRecords: true,
  editMedications: true,
  // ...
  logVitals: true, // ✅ CRITICAL: Caregivers must be able to log vitals by default
  viewVitals: true,
  chatAccess: true,
  // ...
}
```

---

### 3. components/family/InviteModal.tsx

**Changed:** Lines 43-49, 116-122, 125-132
**Reason:** Initial state mismatch and missing familyRole field

**Changes:**
1. Fixed initial state to default to CAREGIVER (not VIEW_ONLY)
2. Added `familyRole: selectedRole` to invitation submission
3. Fixed reset state to use CAREGIVER preset

**Before:**
```typescript
const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>('VIEW_ONLY')
const [customPermissions, setCustomPermissions] = useState<FamilyMemberPermissions>(
  PERMISSION_PRESETS.VIEW_ONLY // ❌ MISMATCH with selectedRole default
)
const [selectedRole, setSelectedRole] = useState<FamilyRole>('caregiver')

// Later in submission:
await sendInvitation({
  recipientEmail,
  patientsShared: selectedPatients,
  permissions: customPermissions, // ❌ No familyRole sent
  ...(message && { message })
})
```

**After:**
```typescript
// CRITICAL: Default to CAREGIVER role and permissions (not VIEW_ONLY)
// Most family invitations are for caregivers who need logVitals permission
const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>('CAREGIVER')
const [customPermissions, setCustomPermissions] = useState<FamilyMemberPermissions>(
  PERMISSION_PRESETS.CAREGIVER // ✅ MATCHES selectedRole default
)
const [selectedRole, setSelectedRole] = useState<FamilyRole>('caregiver')

// Later in submission:
await sendInvitation({
  recipientEmail,
  patientsShared: selectedPatients,
  permissions: customPermissions,
  familyRole: selectedRole, // ✅ CRITICAL: Include role so permissions match on acceptance
  ...(message && { message })
})
```

---

### 4. types/medical.ts

**Changed:** Line 634
**Reason:** TypeScript interface needed to reflect familyRole field

**Before:**
```typescript
export interface FamilyInvitationForm {
  recipientEmail: string
  recipientPhone?: string
  patientsShared: string[]
  permissions: Partial<FamilyMemberPermissions>
  message?: string
}
```

**After:**
```typescript
export interface FamilyInvitationForm {
  recipientEmail: string
  recipientPhone?: string
  patientsShared: string[]
  permissions: Partial<FamilyMemberPermissions>
  familyRole?: FamilyRole // Role to assign (defaults to 'caregiver' if not provided)
  message?: string
}
```

---

### 5. scripts/fix-caregiver-logvitals-permissions.ts (NEW FILE)

**Purpose:** Migration script to fix existing caregivers who were created with `logVitals: false`

**Features:**
- Queries all account owners
- For each account, finds family members with `familyRole === 'caregiver'`
- Updates `permissions.logVitals = true` for caregivers who don't have it
- Updates both account-level and patient-level family member records
- Supports `--dry-run` mode for safe testing
- Comprehensive error handling and statistics reporting

**Usage:**
```bash
# Dry run (no changes)
npx tsx scripts/fix-caregiver-logvitals-permissions.ts --dry-run

# Live run (applies changes)
npx tsx scripts/fix-caregiver-logvitals-permissions.ts
```

**Output Example:**
```
📂 Checking account: abc123...
  ❌ Barbara Rice (barbara@example.com) has logVitals: false
  ✅ Updated account-level record for Barbara Rice
    ✅ Updated patient-level record for patient xyz789
    ✅ Updated patient-level record for patient def456

================================================
📊 MIGRATION SUMMARY
================================================
Account Owners Checked:      5
Caregivers Found:            12
Already Fixed:               7
Updated:                     5
Patient Records Updated:     10
Errors:                      0

✅ MIGRATION COMPLETE
```

## Verification Steps

### For New Invitations

1. Go to Family Management → Invite Member
2. Verify initial state shows "Caregiver" role selected
3. Verify permissions shown include "Log Vital Signs" checked
4. Send invitation
5. Have recipient accept invitation
6. Verify recipient can log vitals without manual permission grant

### For Existing Caregivers

1. Run migration script in dry-run mode:
   ```bash
   npx tsx scripts/fix-caregiver-logvitals-permissions.ts --dry-run
   ```
2. Review output to see which caregivers would be updated
3. Run migration script live:
   ```bash
   npx tsx scripts/fix-caregiver-logvitals-permissions.ts
   ```
4. Verify updated caregivers can now log vitals

### For Edited Members

1. Go to Family Management → Edit Member
2. Add new patient access to a caregiver
3. Verify default permissions include "Log Vitals" checked
4. Save changes
5. Verify member can log vitals for newly added patient

## Impact Assessment

### Users Affected
- All new caregiver invitations (going forward)
- All existing caregivers with `familyRole === 'caregiver'` (needs migration)
- All caregivers being edited to add new patient access

### Severity
- **CRITICAL** - This blocks core caregiving functionality
- Family members cannot perform basic vital logging without manual intervention

### Rollout Plan

1. **Immediate** - Deploy code fixes to production
2. **Phase 1** - Run migration script on production database
3. **Phase 2** - Monitor for any reports of missing permissions
4. **Phase 3** - Consider adding permission audit logging for future debugging

## Testing Checklist

- [x] Zod schema defaults updated and documented
- [x] EditMemberModal DEFAULT_PERMISSIONS updated
- [x] InviteModal initial state fixed
- [x] InviteModal includes familyRole in submission
- [x] TypeScript interfaces updated
- [x] Migration script created and tested
- [ ] Migration script run on production
- [ ] Verify new invitations have correct permissions
- [ ] Verify existing caregivers updated successfully
- [ ] Verify edited members have correct permissions
- [ ] Monitor error logs for permission-related issues

## Related Documentation

- `lib/family-permissions.ts` - Permission presets and utilities
- `lib/family-roles.ts` - Role-based permission management
- `MEDICAL_RECORDS_PRD.json` - Original requirements specification
- `docs/ACCOUNT_OWNER_SYSTEM.md` - Family role hierarchy documentation

## Contact

For questions or issues related to this fix, contact the development team or reference:
- GitHub Issue: [Link to issue if exists]
- Related PRs: [Link to PRs]
- Slack Channel: #engineering

---

**Last Updated:** 2024-12-19
**Author:** Claude (AI Assistant via Technical Resolution Orchestrator)
**Status:** ✅ Complete - Ready for Production Deployment
