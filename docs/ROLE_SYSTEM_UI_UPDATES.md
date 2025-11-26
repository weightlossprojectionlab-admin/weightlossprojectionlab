# Role System UI Integration - Component Updates

This document describes the UI updates made to integrate the Family Role system into existing components.

## Summary

Updated three core components to integrate the role-based access control system:
1. FamilyMemberCard.tsx - Display role badges and visual distinctions
2. InviteModal.tsx - Add role selection during invitation
3. PatientCard.tsx - Show role information in caregiver access badge

## New Components Created

### 1. components/family/AccountOwnerBadge.tsx
Purpose: Display a badge indicating a family member role with special styling for Account Owner.

Features:
- Color-coded badges for each role (gold for Account Owner, purple for Co-Admin, blue for Caregiver, gray for Viewer)
- Special icon for Account Owner (verification checkmark)
- Reusable across the application

### 2. components/family/RoleSelector.tsx
Purpose: Dropdown selector for assigning family member roles during invitation.

Features:
- Only shows roles that the current user can assign (based on their role)
- Displays role descriptions to help users understand each role
- Shows warnings for sensitive roles (e.g., Co-Admin)
- Returns null if user cannot assign roles

## Updated Components

### 1. components/family/FamilyMemberCard.tsx

Changes:
- Added AccountOwnerBadge component import
- Shows role badge below member name
- Gold border for Account Owner cards
- Shows "Managed by" info for non-Account Owners

### 2. components/family/InviteModal.tsx

Changes:
- Added RoleSelector component
- New prop: currentUserRole
- Role selection only shown to admins
- Role selection automatically updates permission presets
- Sends familyRole field with invitation

### 3. components/patients/PatientCard.tsx

Changes:
- Shows role in caregiver access badge
- Badge now displays: "Caregiver Access (Role Name)"

## Integration Points

Parent components using these updated components should:

1. Pass currentUserRole to InviteModal
2. Ensure family members have familyRole field
3. Include role in patient metadata for caregiver access

## Testing Checklist

- Account Owner badge displays with gold gradient
- Co-Admin badge displays with purple background
- Caregiver badge displays with blue background
- Viewer badge displays with gray background
- Account Owner cards have gold border
- Non-Account Owner cards show "Managed by" information
- Role selector appears only for admins in InviteModal
- Role selector shows correct assignable roles based on user role
- Selecting a role updates permissions automatically
- Role warnings display for Co-Admin selection
- Invitation includes familyRole field
- Patient cards show caregiver role in access badge
- Role labels display correctly in all components

## Related Files

- lib/family-roles.ts - Core role logic and utilities
- types/medical.ts - TypeScript type definitions
- lib/family-permissions.ts - Permission presets and labels
