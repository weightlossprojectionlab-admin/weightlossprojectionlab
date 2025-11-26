# Patient-Specific Logs Migration

## Overview

This document describes the migration from user-level health tracking to patient-specific health tracking. This change enables proper multi-family member support where each person can have their own health restrictions, conditions, and tracking data.

## Architecture Change

### Before (User-Level)
```
users/
  {userId}/
    weightLogs/     ❌ Generic for user
    mealLogs/       ❌ Generic for user
    stepLogs/       ❌ Generic for user
```

### After (Patient-Specific)
```
users/
  {userId}/
    patients/
      {patientId}/
        weightLogs/  ✅ Specific to family member
        mealLogs/    ✅ Specific to family member
        stepLogs/    ✅ Specific to family member
        vitals/      ✅ Already patient-specific
```

## Benefits

1. **Multi-Person Tracking**: Each family member has their own logs
2. **Personalized Restrictions**: Meal logging respects individual dietary restrictions
3. **Contextual Reminders**: Weight check-ins show which family member needs to log
4. **Proper Data Architecture**: Consistent with existing medical records system

## Implementation Status

### ✅ Phase 1: Data Model Updates (COMPLETED)

- [x] Added `WeightLog`, `MealLog`, `StepLog` types to `types/medical.ts`
- [x] Updated Firestore security rules for patient subcollections
  - `users/{userId}/patients/{patientId}/weightLogs`
  - `users/{userId}/patients/{patientId}/mealLogs`
  - `users/{userId}/patients/{patientId}/stepLogs`
- [x] Added Firestore composite indexes for efficient queries
- [x] Deployed rules to Firebase

### ✅ Phase 2: API Migration (COMPLETED)

- [x] Created `/api/patients/[patientId]/weight-logs` endpoint (GET, POST)
- [x] Created `/api/patients/[patientId]/meal-logs` endpoint (GET, POST)
- [x] Created `/api/patients/[patientId]/step-logs` endpoint (GET, POST)
- [x] Added operations to `lib/medical-operations.ts`:
  - `weightLogOperations.logWeight()` / `getWeightLogs()`
  - `mealLogOperations.logMeal()` / `getMealLogs()`
  - `stepLogOperations.logSteps()` / `getStepLogs()`

### ✅ Phase 3: Navigation Updates (COMPLETED)

- [x] Updated `components/ui/BottomNav.tsx` to link to `/patients` instead of `/log-meal`
- [x] Removed "Log Meal" and "Log Steps" from `components/ui/AppMenu.tsx`
- [x] Removed "Health Vitals" link (duplicate system was deleted earlier)

### ✅ Phase 4: Data Migration Script (COMPLETED)

- [x] Created `scripts/migrate-logs-to-patients.ts`
  - Migrates weight logs from user-level to patient subcollections
  - Migrates meal logs from user-level to patient subcollections
  - Migrates step logs from user-level to patient subcollections
  - Creates "Self" patient profile if user doesn't have one
  - Supports dry-run mode and per-user migration

### 📝 Phase 5: Future UI Work (TODO)

The following components still need patient-specific updates:

#### Old Generic Pages (To Be Replaced)
- [ ] `app/log-meal/page.tsx` - Replace with patient selector → logging
- [ ] `app/log-weight/page.tsx` - Replace with patient selector → logging
- [ ] `app/log-steps/page.tsx` - Replace with patient selector → logging

#### Updated Patient Detail Page
- [ ] Add weight logging UI to `/patients/[patientId]` page
- [ ] Add meal logging UI to `/patients/[patientId]` page
- [ ] Add step logging UI to `/patients/[patientId]` page
- [ ] Add WeightReminderModal with patient name (component already updated)

#### Progress/Dashboard Pages
- [ ] Update `/dashboard` to show data from "Self" patient by default
- [ ] Update `/progress` page to allow switching between family members
- [ ] Update charts to query patient-specific logs

## Migration Guide

### Step 1: Backup Data (IMPORTANT)

```bash
# Export current data before migration
firebase firestore:export gs://your-bucket/backups/pre-migration-$(date +%Y%m%d)
```

### Step 2: Run Migration Script (Dry Run First)

```bash
# Install dependencies
npm install

# Test migration without making changes
npx ts-node scripts/migrate-logs-to-patients.ts --dry-run

# Migrate specific user for testing
npx ts-node scripts/migrate-logs-to-patients.ts --dry-run --user-id=USER_ID

# Run actual migration
npx ts-node scripts/migrate-logs-to-patients.ts
```

### Step 3: Verify Migration

After migration, check:
1. Each user has a "Self" patient profile
2. Weight/meal/step logs are in patient subcollections
3. Old data is still accessible (for rollback)

### Step 4: Update Frontend Components

Update UI components to use new patient-specific APIs:

```typescript
// OLD (user-level)
import { getWeightLogs } from '@/lib/api/weight-logs'
const logs = await getWeightLogs()

// NEW (patient-specific)
import { medicalOperations } from '@/lib/medical-operations'
const logs = await medicalOperations.weightLogs.getWeightLogs(patientId)
```

### Step 5: Cleanup Old APIs (After UI Migration)

Once all UI components use new APIs:

1. **Mark old endpoints as deprecated:**
   ```typescript
   // app/api/weight-logs/route.ts
   console.warn('DEPRECATED: Use /api/patients/[patientId]/weight-logs instead')
   ```

2. **Add migration period (2-4 weeks)**
   - Keep old endpoints working
   - Log usage to track remaining consumers
   - Show deprecation warnings

3. **Remove old endpoints:**
   - Delete `app/api/weight-logs/`
   - Delete `app/api/meal-logs/` (if exists)
   - Delete `app/api/step-logs/`
   - Remove `lib/api/weight-logs.ts`

4. **Archive old data:**
   ```bash
   # Move old collections to archive
   # (Keep for historical reference)
   firebase firestore:export gs://your-bucket/archives/old-logs-$(date +%Y%m%d)
   ```

## API Examples

### Logging Weight (Patient-Specific)

```typescript
import { medicalOperations } from '@/lib/medical-operations'

// Log weight for a specific patient
await medicalOperations.weightLogs.logWeight(patientId, {
  weight: 180,
  unit: 'lbs',
  loggedAt: new Date().toISOString(),
  notes: 'Morning weight',
  source: 'manual'
})

// Get weight logs for a patient
const logs = await medicalOperations.weightLogs.getWeightLogs(patientId, {
  limit: 30,
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})
```

### Logging Meals (Patient-Specific)

```typescript
import { medicalOperations } from '@/lib/medical-operations'

// Log meal for a specific patient
await medicalOperations.mealLogs.logMeal(patientId, {
  mealType: 'breakfast',
  foodItems: ['Oatmeal', 'Banana', 'Coffee'],
  calories: 350,
  protein: 12,
  carbs: 65,
  fat: 8,
  loggedAt: new Date().toISOString(),
  tags: ['healthy', 'homemade']
})

// Get meal logs for a patient
const logs = await medicalOperations.mealLogs.getMealLogs(patientId, {
  limit: 30,
  mealType: 'breakfast' // Optional filter
})
```

### Logging Steps (Patient-Specific)

```typescript
import { medicalOperations } from '@/lib/medical-operations'

// Log steps for a specific patient
await medicalOperations.stepLogs.logSteps(patientId, {
  steps: 10000,
  date: '2025-01-15',
  distance: 8.5, // km
  calories: 450,
  activeMinutes: 120,
  source: 'fitbit'
})

// Get step logs for a patient
const logs = await medicalOperations.stepLogs.getStepLogs(patientId, {
  limit: 30,
  source: 'fitbit' // Optional filter
})
```

## Rollback Plan

If migration issues occur:

1. **Stop using new APIs** - Revert frontend to old endpoints
2. **Restore from backup** - Use Firebase export from Step 1
3. **Keep migration script** - Fix issues and retry later

## Timeline

- **✅ Backend Infrastructure** - Completed (Phases 1-4)
- **📝 UI Migration** - To be scheduled based on priority
- **📝 Deprecation Period** - 2-4 weeks after UI complete
- **📝 Cleanup** - After deprecation period ends

## Support

For questions or issues during migration:
1. Check Firestore security rules are deployed
2. Verify indexes are created (may take 5-10 minutes)
3. Test with single user first before batch migration
4. Keep backups for at least 30 days

## Related Files

### Backend
- `types/medical.ts` - Type definitions
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Database indexes
- `lib/medical-operations.ts` - Client-side operations
- `app/api/patients/[patientId]/weight-logs/route.ts` - Weight API
- `app/api/patients/[patientId]/meal-logs/route.ts` - Meal API
- `app/api/patients/[patientId]/step-logs/route.ts` - Step API

### Scripts
- `scripts/migrate-logs-to-patients.ts` - Data migration script

### Frontend (Future Work)
- `app/patients/[patientId]/page.tsx` - Patient detail page
- `components/ui/WeightReminderModal.tsx` - Weight reminder (updated with patientName)
- `app/dashboard/page.tsx` - Dashboard (needs update)
- `app/progress/page.tsx` - Progress tracking (needs update)
