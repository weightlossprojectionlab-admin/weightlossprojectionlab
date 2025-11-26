# useFamilyRoles Hook

React hook for managing family member roles and hierarchy in the Weight Loss Project Lab application.

## Overview

The `useFamilyRoles` hook provides a comprehensive interface for managing family member roles, including role assignment, ownership transfer, and family hierarchy visualization. It follows the established patterns from other hooks in the codebase like `useInvitations` and `useFamilyMembers`.

## Features

- **Role Assignment**: Assign roles to family members with permission validation
- **Ownership Transfer**: Transfer Account Owner status with confirmation
- **Family Hierarchy**: Get sorted list of family members by authority level
- **Permission Checking**: Built-in helpers to validate user permissions
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on error
- **Toast Notifications**: Success/error messages for all operations
- **Type Safety**: Full TypeScript support with proper type definitions

## Installation

The hook is already integrated with the existing medical operations and API client. No additional setup required.

## Basic Usage

```tsx
import { useFamilyRoles } from '@/hooks/useFamilyRoles'

function FamilyManagement() {
  const {
    familyMembers,
    loading,
    error,
    assignRole,
    transferOwnership,
    getFamilyHierarchy
  } = useFamilyRoles()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  const hierarchy = getFamilyHierarchy()

  return (
    <div>
      {hierarchy.map(member => (
        <div key={member.id}>
          {member.name} - {member.familyRole}
        </div>
      ))}
    </div>
  )
}
```

## API Reference

### Hook Options

```typescript
interface UseFamilyRolesOptions {
  autoFetch?: boolean  // Default: true - Auto-fetch family members on mount
}
```

### Return Values

```typescript
interface UseFamilyRolesReturn {
  // State
  familyMembers: FamilyMember[]  // All family members
  loading: boolean               // Loading state
  error: string | null           // Error message if any

  // Actions
  refetch: () => Promise<void>
  assignRole: (memberId: string, newRole: FamilyRole) => Promise<FamilyMember>
  transferOwnership: (newOwnerId: string) => Promise<void>

  // Helpers
  getFamilyHierarchy: () => FamilyMember[]
  canUserAssignRole: (targetRole: FamilyRole, currentUserRole?: FamilyRole) => boolean
  canUserEditMember: (targetMember: FamilyMember, currentUserRole?: FamilyRole) => boolean
}
```

## Methods

### assignRole(memberId, newRole)

Assigns a new role to a family member.

**Parameters:**
- `memberId` (string): The ID of the family member
- `newRole` (FamilyRole): The new role to assign ('co_admin', 'caregiver', or 'viewer')

**Returns:** Promise<FamilyMember>

**Example:**
```tsx
const handlePromote = async (memberId: string) => {
  try {
    await assignRole(memberId, 'co_admin')
    // Success toast shown automatically
  } catch (error) {
    // Error toast shown automatically
    console.error(error)
  }
}
```

**Features:**
- Validates permissions before assignment
- Prevents assigning Account Owner role
- Shows success/error toast notifications
- Optimistic updates with automatic rollback

### transferOwnership(newOwnerId)

Transfers Account Owner status to another family member (must be a Co-Admin).

**Parameters:**
- `newOwnerId` (string): The user ID of the new account owner

**Returns:** Promise<void>

**Example:**
```tsx
const handleTransfer = async () => {
  if (!confirm('Are you sure? This cannot be undone.')) return

  try {
    await transferOwnership(coAdminUserId)
    // You are now demoted to Co-Admin
  } catch (error) {
    console.error(error)
  }
}
```

**Features:**
- Only Account Owner can transfer ownership
- New owner must be a Co-Admin
- Previous owner becomes Co-Admin
- Shows special success notification with crown emoji

### getFamilyHierarchy()

Returns family members sorted by role authority (Account Owner first, then Co-Admins, Caregivers, Viewers).

**Returns:** FamilyMember[]

**Example:**
```tsx
const hierarchy = getFamilyHierarchy()
// Always sorted: Account Owner → Co-Admin → Caregiver → Viewer
```

### canUserAssignRole(targetRole, currentUserRole?)

Checks if the current user can assign a specific role.

**Parameters:**
- `targetRole` (FamilyRole): The role to check
- `currentUserRole` (FamilyRole, optional): Current user's role (auto-detected if not provided)

**Returns:** boolean

**Example:**
```tsx
const canPromoteToAdmin = canUserAssignRole('co_admin')
// Account Owner: true, Co-Admin: false, Others: false
```

### canUserEditMember(targetMember, currentUserRole?)

Checks if the current user can edit a specific family member.

**Parameters:**
- `targetMember` (FamilyMember): The member to check
- `currentUserRole` (FamilyRole, optional): Current user's role (auto-detected if not provided)

**Returns:** boolean

**Example:**
```tsx
const canEdit = canUserEditMember(member)
// Returns true if user has permission to edit this member
```

## Helper Functions

### getCurrentUserRole(familyMembers, currentUserId)

Gets the current user's role from the family members list.

```tsx
import { getCurrentUserRole } from '@/hooks/useFamilyRoles'

const { familyMembers } = useFamilyRoles()
const { user } = useAuth()

const myRole = getCurrentUserRole(familyMembers, user.uid)
// Returns: 'account_owner' | 'co_admin' | 'caregiver' | 'viewer' | null
```

### useIsAdmin(familyMembers, currentUserId)

Checks if current user has admin privileges (Account Owner or Co-Admin).

```tsx
import { useIsAdmin } from '@/hooks/useFamilyRoles'

const isAdmin = useIsAdmin(familyMembers, user.uid)
if (isAdmin) {
  // Show admin UI
}
```

### useIsAccountOwner(familyMembers, currentUserId)

Checks if current user is the Account Owner.

```tsx
import { useIsAccountOwner } from '@/hooks/useFamilyRoles'

const isOwner = useIsAccountOwner(familyMembers, user.uid)
if (isOwner) {
  // Show ownership transfer button
}
```

## Family Role Hierarchy

The hook respects the following role hierarchy:

1. **Account Owner** (Highest Authority)
   - Full control over all family members
   - Can assign any role except Account Owner
   - Can transfer ownership to Co-Admins
   - Cannot be edited by anyone

2. **Co-Admin**
   - Elevated privileges
   - Can manage Caregivers and Viewers
   - Can assign Caregiver/Viewer roles
   - Cannot edit Account Owner or other Co-Admins

3. **Caregiver**
   - Standard access with assigned permissions
   - Cannot manage roles
   - Access limited to assigned patients

4. **Viewer**
   - Read-only access
   - Cannot edit or manage anything
   - Can only view assigned patient data

## Role Assignment Rules

- **Account Owner** can assign: Co-Admin, Caregiver, Viewer
- **Co-Admin** can assign: Caregiver, Viewer
- **Caregiver** cannot assign roles
- **Viewer** cannot assign roles

## Integration with Other Hooks

The hook integrates seamlessly with other family management hooks:

```tsx
import { useFamilyRoles } from '@/hooks/useFamilyRoles'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import { useInvitations } from '@/hooks/useInvitations'

function FamilyDashboard({ patientId }: { patientId: string }) {
  // Global family roles
  const { familyMembers: allMembers, assignRole } = useFamilyRoles()

  // Patient-specific members
  const { familyMembers: patientMembers } = useFamilyMembers({ patientId })

  // Invitations
  const { sentInvitations, sendInvitation } = useInvitations()

  // Your component logic...
}
```

## Error Handling

The hook automatically handles errors and shows toast notifications:

```tsx
try {
  await assignRole(memberId, 'co_admin')
  // Success: Shows "Role updated to Co-Admin for John Doe"
} catch (error) {
  // Error: Shows error message toast
  // State is automatically reverted
}
```

## API Endpoints Used

The hook communicates with these backend endpoints:

- `GET /family-members` - Get all family members
- `PATCH /family-members/:id/role` - Assign role
- `POST /family-members/transfer-ownership` - Transfer ownership

## Backend Requirements

The following API endpoints must be implemented:

### GET /family-members
Returns all family members across all patients for the current user's account.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "member_123",
      "userId": "user_abc",
      "email": "john@example.com",
      "name": "John Doe",
      "familyRole": "co_admin",
      "permissions": { ... },
      "patientsAccess": ["patient_1", "patient_2"]
    }
  ]
}
```

### PATCH /family-members/:memberId/role
Assigns a new role to a family member.

**Request Body:**
```json
{
  "familyRole": "co_admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "member_123",
    "familyRole": "co_admin",
    "roleAssignedAt": "2024-01-15T10:30:00Z",
    "roleAssignedBy": "user_abc"
  }
}
```

### POST /family-members/transfer-ownership
Transfers Account Owner status to another family member.

**Request Body:**
```json
{
  "newOwnerId": "user_xyz"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "oldOwner": { "id": "member_123", "familyRole": "co_admin" },
    "newOwner": { "id": "member_456", "familyRole": "account_owner" }
  }
}
```

## TypeScript Types

All types are imported from `@/types/medical`:

```typescript
type FamilyRole = 'account_owner' | 'co_admin' | 'caregiver' | 'viewer'

interface FamilyMember {
  id: string
  userId: string
  email: string
  name: string
  photo?: string
  familyRole: FamilyRole
  permissions: FamilyMemberPermissions
  patientsAccess: string[]
  roleAssignedAt?: string
  roleAssignedBy?: string
  // ... other fields
}
```

## Testing

Example test cases:

```tsx
import { renderHook, act } from '@testing-library/react'
import { useFamilyRoles } from './useFamilyRoles'

describe('useFamilyRoles', () => {
  it('should fetch family members on mount', async () => {
    const { result } = renderHook(() => useFamilyRoles())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.familyMembers).toHaveLength(3)
    })
  })

  it('should assign role successfully', async () => {
    const { result } = renderHook(() => useFamilyRoles())

    await act(async () => {
      await result.current.assignRole('member_123', 'co_admin')
    })

    const member = result.current.familyMembers.find(m => m.id === 'member_123')
    expect(member?.familyRole).toBe('co_admin')
  })
})
```

## See Also

- [useFamilyMembers](./useFamilyMembers.ts) - Manage patient-specific family members
- [useInvitations](./useInvitations.ts) - Send and manage family invitations
- [lib/family-roles.ts](../lib/family-roles.ts) - Role hierarchy and validation utilities
- [types/medical.ts](../types/medical.ts) - TypeScript type definitions
