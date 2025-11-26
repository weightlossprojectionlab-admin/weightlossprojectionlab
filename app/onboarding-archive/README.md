# Old Onboarding System (Archived)

This directory contains the previous onboarding system (6-step flow) that was replaced by the new UNIFIED PRD v3.0 onboarding system.

## Why Archived?

The old onboarding system (`/onboarding`) has been replaced with `/onboarding-v2` which implements the UNIFIED PRD's 7-question adaptive onboarding flow.

### Old System (6 steps)
- Step 1: About You (name, DOB, gender, height)
- Step 2: Goals (target weight, calorie goal)
- Step 3: Health Conditions (multi-select)
- Step 4: Detailed Health Questionnaire
- Step 5: AI Health Profile Generation
- Step 6: Lifestyle Factors

**Issues:**
- Long, linear flow (8-12 minutes to complete)
- No user mode differentiation (Single/Household/Caregiver)
- No adaptive UI
- Completion rate: ~65%

### New System (7 questions)
Location: `/onboarding-v2`

- Adaptive based on role selection
- Determines user mode automatically
- Dynamic UI configuration
- Multi-select support
- Conditional visibility
- Target completion time: <3 minutes
- Target completion rate: >85%

## Migration

For users who completed the old onboarding:
- They have `profile.onboardingCompleted = true` in Firestore
- They should NOT be forced to re-onboard
- A migration script can infer their user mode from existing data
- See `/scripts/migrate-to-unified-prd.ts` for migration logic

## Reference

The old onboarding code is preserved here for reference and potential data migration needs.

**Do not use this code in production.**
