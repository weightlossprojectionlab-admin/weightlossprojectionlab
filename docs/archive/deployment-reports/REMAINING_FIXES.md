# Remaining TypeScript Errors to Fix

## Summary
Total errors initially: 79
Fixed so far: 29
Remaining: ~50

## Critical Remaining Errors by Category:

### 1. app/patients/[patientId]/page.tsx (Line 2109)
- **Error**: Appointment creation missing required fields (userId, patientName, providerName, updatedAt)
- **Fix**: Add missing fields when calling createAppointment()

### 2. app/patients/page.tsx (Line 284)
- **Error**: VitalSignInput unit type mismatch (string vs VitalUnit)
- **Fix**: Cast unit to VitalUnit type or update transformWizardDataToVitals

### 3. app/providers/[id]/edit/page.tsx (3 errors)
- **Error**: Provider.title, Provider.facility, Provider.specialty properties don't exist
- **Fix**: Add these properties to Provider interface or use type assertions

### 4. lib files (40+ errors):
- lib/health-outcomes.ts: Missing 'mood' in VitalType maps (multiple occurrences)
- lib/onboarding-router.ts: Undefined User and canAccessFeature
- lib/plan-recommender.ts: Delete operator on required property
- lib/product-lookup-server.ts: Too many arguments to findProductByNDC
- lib/shopping-operations.ts: discardedBy property doesn't exist
- lib/subscription-enforcement.ts: Missing single_plus in UPGRADE_PATHS and PLAN_NAMES
- lib/vital-reminder-logic.ts: Null check and frequency comparison issues
- lib/ocr-client.ts: Error type mismatch in logger.error
- lib/medication-parser.ts, lib/ocr-gemini-client.ts: getIdToken on never type

## Recommended Approach:

1. Run `npx tsc --noEmit > errors.txt 2>&1` to get current error list
2. Fix errors in priority order:
   - Critical type definition errors (Provider, VitalUnit, etc.)
   - Missing properties in lib files
   - Type assertions where needed
3. Re-run build after each batch of fixes
4. Continue until build succeeds

## Files Modified Successfully:
- C:/Users/percy/WPL/weightlossprojectlab/types/caregiver-profile.ts
- C:/Users/percy/WPL/weightlossprojectlab/app/patients/[patientId]/page.tsx
- C:/Users/percy/WPL/weightlossprojectlab/app/patients/page.tsx
- C:/Users/percy/WPL/weightlossprojectlab/app/progress/page.tsx
- C:/Users/percy/WPL/weightlossprojectlab/components/charts/*.tsx (5 files)
- C:/Users/percy/WPL/weightlossprojectlab/components/appointments/RecommendationModal.tsx
- C:/Users/percy/WPL/weightlossprojectlab/components/family/CaregiverProfileForm.tsx
- C:/Users/percy/WPL/weightlossprojectlab/lib/vital-schedule-service.ts
- C:/Users/percy/WPL/weightlossprojectlab/lib/illness-detection-engine.ts
- C:/Users/percy/WPL/weightlossprojectlab/lib/nutrition-vitals-correlation.ts
- C:/Users/percy/WPL/weightlossprojectlab/lib/ocr-client.ts
- C:/Users/percy/WPL/weightlossprojectlab/lib/ocr-gemini-client.ts
- C:/Users/percy/WPL/weightlossprojectlab/lib/medication-parser.ts
