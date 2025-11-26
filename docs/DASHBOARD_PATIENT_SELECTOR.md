# Dashboard Patient Selector

## Overview

The dashboard now includes a patient selector that allows users to see which family member they're viewing data for. The selector defaults to the primary account holder (the "Self" patient).

## Current Behavior

### Patient Selector
- **Location**: Top of dashboard, below the header
- **Default Selection**: "Self" patient (primary account holder)
- **Functionality**: Dropdown to switch between family members

### Data Display
Currently, the dashboard shows **combined/aggregated data** for the account owner (not yet patient-specific). This is an intentional transitional state.

### Migration Notice
When a user selects a family member other than "Self", a yellow banner appears explaining:
> "Dashboard currently shows combined data for all family members. To log health data for [Name], visit their profile page."

This guides users to the patient-specific logging pages while the dashboard migration is completed.

## User Experience

### Scenario 1: Single User (Self Only)
```
User logs in → Dashboard loads
├─ Patient Selector shows: "Me (self)"
├─ Dashboard shows their personal data
└─ All logging happens on their patient profile page
```

### Scenario 2: Parent with Children
```
Parent logs in → Dashboard loads
├─ Patient Selector defaults to: "Parent Name (self)"
├─ Parent can switch to: "Child Name (child)"
├─ Yellow banner appears: "To log health data for Child Name, visit their profile page"
└─ Parent clicks profile link → Goes to /patients/[childId]
```

### Scenario 3: Pet Owner
```
Owner logs in → Dashboard loads
├─ Patient Selector shows: "Owner Name (self)"
├─ Can switch to: "Pet Name (pet • dog)"
├─ Banner guides to pet's profile for logging
└─ Pet weight/meals tracked separately
```

## Technical Implementation

### Component: PatientSelector
**Location**: `components/patients/PatientSelector.tsx`

**Features**:
- Fetches all family members (patients) for the user
- Auto-selects "Self" patient on first load
- Falls back to first patient if no "Self" exists
- Dropdown with patient name, relationship, and type (pet species)
- Visual indicator showing selected patient

**Props**:
```typescript
interface PatientSelectorProps {
  selectedPatientId: string | null
  onPatientChange: (patientId: string, patient: PatientProfile) => void
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

### Dashboard Integration
**File**: `app/dashboard/page.tsx`

**State**:
```typescript
const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null)
```

**Data Fetching**:
```typescript
// Dashboard now queries patient-specific data
const { userProfile, todayMeals, allMeals, weightData, stepsData } = useDashboardData(selectedPatientId)
```

**Rendering**:
- Patient selector renders after PageHeader
- Dashboard shows data for selected patient only (no more combined data)

## Default Behavior

The patient selector uses a **3-tier priority system** for selecting the default patient:

1. **Priority 1: Primary Patient Preference** - Uses `userProfile.preferences.primaryPatientId` if set
2. **Priority 2: Self Patient** - Falls back to patient with `relationship === 'self'`
3. **Priority 3: First Patient** - If neither exists, selects first patient in list

This solves the edge case where someone creates an account to track someone else (e.g., parent for child, caregiver for elderly relative).

### Setting Primary Patient

Users can designate any family member as their primary patient through the patient detail page:
- Navigate to patient detail page (`/patients/[patientId]`)
- Click "Set as Primary Patient" button
- That patient will now be shown by default in the dashboard
- A star icon indicates which patient is currently set as primary

## Implementation Complete ✅

### Phase 1: Patient Selector (Completed)
- ✅ Patient selector added with 3-tier priority system
- ✅ Primary patient preference added to user profile
- ✅ "Set as Primary" button on patient detail page

### Phase 2: Patient-Specific Dashboard (Completed)
- ✅ Updated `useDashboardData` to accept `patientId` parameter
- ✅ Updated `useMealLogsRealtime` to query patient subcollection
- ✅ Weight logs query from patient subcollection
- ✅ Step logs query from patient subcollection
- ✅ Meal logs query from patient subcollection
- ✅ Dashboard shows only selected patient's data
- ✅ Removed "combined data" migration notice

### Files Updated
- `hooks/useDashboardData.ts` - Added patientId parameter, queries patient subcollections
- `hooks/useMealLogs.ts` - Added patientId parameter for patient-specific queries
- `app/dashboard/page.tsx` - Passes selectedPatientId to data hooks
- `components/patients/PatientSelector.tsx` - Respects primaryPatientId preference
- `app/patients/[patientId]/page.tsx` - Added "Set as Primary" button
- `types/index.ts` - Added `primaryPatientId` to UserPreferences

## User Guidance

### For Users
1. **Default view**: Your personal dashboard (Self)
2. **Switch members**: Use dropdown to view other family members
3. **Log data**: Click patient's name → Go to their profile → Use logging tabs
4. **View trends**: Charts on patient profile pages show individual data

### For Developers
The dashboard is now fully patient-aware. All data (weight, meals, steps) is queried from patient-specific subcollections based on the selected patient ID.

## Benefits

### Current Benefits
✅ **User Awareness** - Users know whose data they're viewing
✅ **Navigation** - Easy access to family member profiles
✅ **Consistency** - Same selector pattern across app
✅ **Smart Defaults** - Respects primary patient preference or falls back to self
✅ **True Multi-User** - Each person's dashboard separate and patient-specific
✅ **Privacy** - Dashboard only shows selected patient's data
✅ **Comparison** - Switch between family members easily
✅ **Non-Self Accounts** - Handles caregivers tracking others (parent for child, etc.)

## Related Documentation
- [Patient Logs Migration](./PATIENT_LOGS_MIGRATION.md) - Backend architecture
- [UI Migration Complete](./UI_MIGRATION_COMPLETE.md) - Logging forms implementation

---

**Status**: ✅ COMPLETE - Patient selector with primary preference + patient-specific dashboard data
**Date**: November 21, 2025
