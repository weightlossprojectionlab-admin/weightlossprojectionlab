# Medication Data Migration - Architecture Restructure

**Date:** November 23, 2025
**Status:** ✅ Complete

## Overview

This migration moves medications from user-level storage to patient-scoped storage, aligning with the existing data architecture where all health data is patient-specific.

## Problem Statement

### Before Migration

**Data Location:** `users/{userId}/profile.medications[]`

**Issues:**
1. **Architectural Inconsistency** - All other health data (weight, meals, steps, vitals) stored under `patients/{patientId}/`, but medications stored at user level
2. **RBAC Limitations** - Family members with patient access couldn't manage medications granularly
3. **Fragile Filtering** - Relied on string matching `patientName` field instead of proper `patientId` relationships
4. **Navigation Confusion** - Medications and Medical Info were standalone pages, disconnected from patient profiles

### After Migration

**Data Location:** `patients/{patientId}/medications/{medicationId}`

**Benefits:**
1. **Consistent Architecture** - Matches weight-logs, meal-logs, step-logs, vitals pattern
2. **Proper RBAC** - Medication access controlled by patient-level permissions
3. **Type-Safe Relationships** - Direct `patientId` foreign key
4. **Better UX** - Medications managed within patient profile tabs

## Data Model Changes

### New Schema

```typescript
interface PatientMedication {
  id: string
  patientId: string  // ← NEW: Direct FK to patient
  userId: string     // Owner of the patient record

  // Drug Information
  name: string
  brandName?: string
  strength: string
  dosageForm: string

  // Prescription Details
  frequency?: string
  prescribedFor?: string
  rxNumber?: string
  quantity?: string
  refills?: string
  fillDate?: string
  expirationDate?: string

  // Clinical Data
  rxcui?: string
  ndc?: string
  drugClass?: string
  warnings?: string[]

  // Pharmacy Info
  pharmacyName?: string
  pharmacyPhone?: string

  // Metadata
  addedAt: string     // ← NEW: When added to system
  addedBy: string     // ← NEW: Who added it
  scannedAt?: string  // If scanned from label
  lastModified: string
  notes?: string
}
```

### Old Schema (Removed)

```typescript
// users/{userId}/profile.medications[]
interface OldMedication {
  name: string
  // ... other fields ...
  patientName?: string  // ← REMOVED: String matching is fragile
  scannedAt: string
}
```

## Migration Steps

### 1. Schema Definition

**File:** `types/medical.ts`

Added `PatientMedication` interface matching the pattern of other patient-scoped data types.

### 2. API Routes

Created RESTful endpoints following existing patterns:

**Files:**
- `app/api/patients/[patientId]/medications/route.ts` - GET (list), POST (create)
- `app/api/patients/[patientId]/medications/[medicationId]/route.ts` - PATCH (update), DELETE (delete)

**Authorization:**
- Checks `editMedications` permission via `authorizePatientAccess()`
- Enforces patient ownership via `userId` check

### 3. Client Operations

**File:** `lib/medical-operations.ts`

Added `medicationOperations` with methods:
- `addMedication(patientId, data)`
- `getMedications(patientId)`
- `updateMedication(patientId, medicationId, updates)`
- `deleteMedication(patientId, medicationId)`

### 4. UI Components

**New Components:**
- `components/patients/MedicationForm.tsx` - Add/edit medications with scanner integration
- `components/patients/MedicationList.tsx` - Display patient medications

**Updated:**
- `app/patients/[patientId]/page.tsx` - Added "Medications" tab alongside Vitals, Weight, Meals, Steps

### 5. Navigation Updates

**File:** `components/ui/AppMenu.tsx`

**Before:**
```typescript
{
  title: 'Health',
  items: [
    { name: 'Family Members', href: '/patients' },
    { name: 'Medical Info', href: '/medical' },      // ← REMOVED
    { name: 'Medications', href: '/medications' },   // ← REMOVED
  ]
}
```

**After:**
```typescript
{
  title: 'Health',
  items: [
    { name: 'Family Health', href: '/patients' },  // All health in one place
  ]
}
```

### 6. Firestore Rules

**File:** `firestore.rules`

Added rules under `patients/{patientId}/medications/{medicationId}`:

```javascript
match /medications/{medicationId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) &&
                  request.resource.data.patientId == patientId &&
                  request.resource.data.userId == userId;
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

### 7. Data Migration Script

**File:** `scripts/migrate-medications-to-patients.ts`

**Strategy:**
1. Find all users with `profile.medications[]`
2. Get their patient records
3. For each medication:
   - Match to patient by `patientName` (if provided)
   - Default to first patient (primary patient)
   - Create medication document under `patients/{patientId}/medications/`
4. Clear `profile.medications[]` from user document

**Usage:**
```bash
# Dry run (no changes)
npx tsx scripts/migrate-medications-to-patients.ts --dry-run

# Execute migration
npx tsx scripts/migrate-medications-to-patients.ts
```

## Testing Checklist

- [ ] Run migration script in dry-run mode
- [ ] Execute actual migration
- [ ] Verify medications appear in patient detail pages
- [ ] Test adding new medications via scanner
- [ ] Test adding new medications manually
- [ ] Test editing medications
- [ ] Test deleting medications
- [ ] Verify RBAC: family members with `editMedications` permission can manage
- [ ] Verify RBAC: family members without permission cannot edit
- [ ] Confirm old `/medications` page redirects or shows deprecation notice
- [ ] Confirm old `/medical` page redirects or shows deprecation notice

## Rollback Plan

If issues arise, rollback steps:

1. **Revert Firestore Rules**
   ```bash
   git checkout HEAD~1 firestore.rules
   firebase deploy --only firestore:rules
   ```

2. **Restore User-Level Medications**
   - Run reverse migration script (TBD)
   - Copy medications from patient records back to user profiles

3. **Revert Code Changes**
   ```bash
   git revert <commit-hash>
   ```

## Future Enhancements

1. **Medication Reminders** - Schedule notifications for medication times
2. **Refill Tracking** - Alert when medications are running low
3. **Drug Interactions** - Check for interactions between patient medications
4. **Export to PDF** - Generate medication list for doctor visits
5. **Photo Upload** - Allow uploading medication bottle photos

## Related Documentation

- [Patient Data Architecture](./PATIENT_LOGS_MIGRATION.md)
- [RBAC Implementation](./RBAC_SYSTEM.md)
- [Medical Records PRD](../MEDICAL_RECORDS_PRD.json)

---

## Summary

This migration brings medications into alignment with the rest of the health data architecture. Users can now manage medications for each family member directly within their patient profile, with proper permissions and a more intuitive workflow.

**Key Win:** Medications are no longer orphaned at the top level—they're where they belong, inside the patient profiles alongside weight, meals, vitals, and steps.
