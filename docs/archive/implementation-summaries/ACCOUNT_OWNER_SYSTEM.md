# Account Owner / Super Admin System

## Overview

The Account Owner system provides a hierarchical role-based access control (RBAC) framework for family health management. It establishes clear authority levels and permissions for managing patient records and family members.

## Role Hierarchy

```
Account Owner (Level 4) - Primary account holder
    ├─ Co-Admin (Level 3) - Trusted elevated privileges
    ├─ Caregiver (Level 2) - Standard assigned permissions
    └─ Viewer (Level 1) - Read-only access
```

---

## Roles Defined

### 👑 Account Owner
**The primary account holder with ultimate authority**

**Capabilities:**
- ✅ Full access to all patients
- ✅ Manage all family members (add, edit, remove)
- ✅ Assign any role (Co-Admin, Caregiver, Viewer)
- ✅ Transfer ownership to another member
- ✅ Cannot be removed by anyone
- ✅ Bypasses all permission checks

**How to become Account Owner:**
- Automatically assigned to first user who creates patients
- Can be transferred by current Account Owner
- One per family account

**Badge:** Golden gradient with crown icon 👑

---

### 🔷 Co-Admin
**Trusted family member with elevated privileges**

**Capabilities:**
- ✅ Full access to all patients
- ✅ Invite and manage Caregivers and Viewers
- ✅ Assign Caregiver/Viewer roles
- ✅ Edit/remove Caregivers and Viewers
- ❌ Cannot edit Account Owner
- ❌ Cannot edit other Co-Admins
- ❌ Cannot transfer ownership

**Badge:** Purple

---

### 🔵 Caregiver
**Standard caregiver with assigned permissions**

**Capabilities:**
- ✅ Access assigned patients only
- ✅ Permissions based on granted access (13 permissions)
- ❌ Cannot invite others (unless granted `inviteOthers` permission)
- ❌ Cannot manage roles
- ❌ Cannot remove members

**Badge:** Blue

---

### ⚪ Viewer
**Read-only access to assigned patients**

**Capabilities:**
- ✅ View assigned patient records
- ✅ View medical information, appointments, vitals
- ❌ Cannot edit anything
- ❌ Cannot log vitals, schedule appointments
- ❌ Cannot invite or manage members

**Badge:** Gray

---

## Implementation Files

### Core System
- **`types/medical.ts`** - FamilyRole type, extended FamilyMember and FamilyInvitation
- **`types/index.ts`** - User preferences with Account Owner status
- **`lib/family-roles.ts`** - Complete role utility library (317 lines)
  - Role hierarchy and authority levels
  - Permission validation
  - Role capabilities
  - Helper functions

### RBAC Middleware
- **`lib/rbac-middleware.ts`** - Updated authorization
  - Account Owner/Co-Admin bypass permission checks
  - Family role included in authorization results
  - Backward compatible (defaults to 'caregiver')

### API Endpoints
- **`app/api/family/roles/assign/route.ts`** - Assign/change roles
- **`app/api/family/roles/transfer-ownership/route.ts`** - Transfer Account Owner
- **`app/api/family/hierarchy/route.ts`** - Get family structure

### React Hook
- **`hooks/useFamilyRoles.ts`** - Main role management hook
  - `assignRole(memberId, newRole)`
  - `transferOwnership(newOwnerId)`
  - `getFamilyHierarchy()`
  - Permission helpers

### UI Components
- **`components/family/AccountOwnerBadge.tsx`** - Role badges
- **`components/family/RoleSelector.tsx`** - Role dropdown
- **`components/family/TransferOwnershipModal.tsx`** - Ownership transfer
- **`components/family/FamilyMemberCard.tsx`** - Updated with roles
- **`components/family/InviteModal.tsx`** - Updated with role selection

### Pages
- **`app/family/manage-roles/page.tsx`** - Complete role management UI
- **`app/family/page.tsx`** - Updated with "Manage Roles" link

### Migration
- **`scripts/migrate-account-owners.ts`** - Auto-assign Account Owners

---

## API Reference

### POST /api/family/roles/assign

Assign or change a family member's role.

**Authorization:** Account Owner or Co-Admin

**Request:**
```json
{
  "familyMemberId": "fam_member_123",
  "newRole": "co_admin",
  "confirmed": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...FamilyMember },
  "message": "Role successfully changed to Co-Admin"
}
```

**Rules:**
- Account Owner can assign: co_admin, caregiver, viewer
- Co-Admin can assign: caregiver, viewer
- Cannot change Account Owner role (use transfer instead)
- Co-Admin role requires confirmation

---

### POST /api/family/roles/transfer-ownership

Transfer Account Owner status to another family member.

**Authorization:** Current Account Owner ONLY

**Request:**
```json
{
  "newOwnerFamilyMemberId": "fam_member_456",
  "confirmed": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account ownership transferred successfully",
  "data": {
    "previousOwnerId": "user_123",
    "newOwnerId": "user_456",
    "transferredAt": "2025-11-24T12:00:00.000Z"
  }
}
```

**Rules:**
- Irreversible operation
- Requires confirmation
- New owner must be accepted family member
- Strict rate limiting (10 req/min)

---

### GET /api/family/hierarchy

Get complete family role structure.

**Authorization:** Any authenticated family member

**Response:**
```json
{
  "success": true,
  "data": {
    "accountOwner": {
      "userId": "user_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "familyMembers": [...],
    "roleHierarchy": [...],
    "summary": {
      "totalMembers": 5,
      "accountOwners": 1,
      "coAdmins": 1,
      "caregivers": 2,
      "viewers": 1
    }
  }
}
```

---

## Usage Examples

### In a React Component

```tsx
import { useFamilyRoles } from '@/hooks/useFamilyRoles'
import { AccountOwnerBadge } from '@/components/family/AccountOwnerBadge'
import { RoleSelector } from '@/components/family/RoleSelector'

function FamilyManagement() {
  const {
    familyMembers,
    loading,
    assignRole,
    transferOwnership,
    canUserAssignRole
  } = useFamilyRoles()

  const handlePromoteToCoAdmin = async (memberId: string) => {
    await assignRole(memberId, 'co_admin')
    // Toast notification shown automatically
  }

  return (
    <div>
      {familyMembers.map(member => (
        <div key={member.id}>
          {member.name}
          <AccountOwnerBadge role={member.familyRole} />

          {canUserAssignRole(member.familyRole) && (
            <RoleSelector
              currentUserRole="account_owner"
              selectedRole={member.familyRole}
              onChange={(newRole) => assignRole(member.id, newRole)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Migration

### Running the Migration

```bash
# Dry run (recommended first)
npx tsx scripts/migrate-account-owners.ts --dry-run

# Live migration
npx tsx scripts/migrate-account-owners.ts

# Single user test
npx tsx scripts/migrate-account-owners.ts --dry-run --user-id=USER_ID
```

### What the Migration Does

1. **Identifies Account Owners:**
   - Finds all users who have created patients
   - Sets `isAccountOwner: true` in user preferences
   - Sets `accountOwnerSince` to earliest patient creation date

2. **Updates Family Members:**
   - Sets `familyRole: 'caregiver'` (default)
   - Sets `managedBy` to Account Owner's userId
   - Sets `canBeEditedBy: [ownerId]`
   - Sets role assignment timestamps

3. **Preserves Existing Data:**
   - Existing Account Owners unchanged
   - Existing family member roles preserved
   - Idempotent (safe to run multiple times)

---

## Security Features

### Authorization Checks
All endpoints verify:
1. User authentication (Firebase token)
2. Role authority (can edit target member?)
3. Permission to assign specific role
4. Proper role hierarchy

### Rate Limiting
- **assign**: 60 requests/minute
- **transfer-ownership**: 10 requests/minute (strict)
- **hierarchy**: 60 requests/minute

### Confirmation Requirements
Sensitive operations require explicit confirmation:
- Assigning Co-Admin role
- Transferring ownership (irreversible)

### Audit Logging
All role changes and ownership transfers create audit log entries with:
- Timestamp
- User IDs (who made the change, who was changed)
- Previous and new roles
- Additional metadata

---

## Database Schema

### User Document (`users/{userId}`)
```typescript
{
  preferences: {
    isAccountOwner: boolean,
    accountOwnerSince: string // ISO 8601
  }
}
```

### Family Member Document (`users/{ownerId}/familyMembers/{memberId}`)
```typescript
{
  familyRole: 'account_owner' | 'co_admin' | 'caregiver' | 'viewer',
  managedBy: string, // userId who manages this member
  canBeEditedBy: string[], // Array of userIds who can edit
  roleAssignedAt: string, // ISO 8601
  roleAssignedBy: string // userId who assigned the role
}
```

### Family Invitation Document (`familyInvitations/{inviteId}`)
```typescript
{
  familyRole: 'co_admin' | 'caregiver' | 'viewer', // Optional, defaults to 'caregiver'
  // ... other fields
}
```

---

## Troubleshooting

### Issue: User can't access /family/manage-roles page
**Solution:** Ensure user is authenticated and has family members or is Account Owner

### Issue: Role assignment fails
**Check:**
1. User has permission to assign that role
2. Target member can be edited by user
3. Confirmation provided for sensitive roles (co_admin)

### Issue: Ownership transfer fails
**Check:**
1. User is current Account Owner
2. New owner is an accepted family member
3. Confirmation flag is true
4. Not rate limited (10 req/min)

### Issue: Family member shows old role
**Solution:** Call `refetch()` from useFamilyRoles hook or refresh the page

---

## Future Enhancements

- [ ] Role change notifications (email/push)
- [ ] Temporary role elevation (time-limited Co-Admin)
- [ ] Role change history timeline
- [ ] Bulk role assignments
- [ ] Custom role creation
- [ ] Multi-owner support (joint accounts)

---

## Support

For issues or questions:
1. Check this documentation first
2. Review existing patterns in similar components
3. Check TypeScript types for available fields
4. Review audit logs for role change history

---

**Last Updated:** November 24, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
