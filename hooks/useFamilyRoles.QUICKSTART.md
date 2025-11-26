# useFamilyRoles Hook - Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Import the Hook

```tsx
import { useFamilyRoles } from '@/hooks/useFamilyRoles'
```

### 2. Use in Your Component

```tsx
function MyComponent() {
  const {
    familyMembers,      // All family members
    loading,            // Loading state
    error,              // Error message
    assignRole,         // Assign role function
    transferOwnership,  // Transfer ownership function
    getFamilyHierarchy  // Get sorted members
  } = useFamilyRoles()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {familyMembers.map(member => (
        <div key={member.id}>
          {member.name} - {member.familyRole}
        </div>
      ))}
    </div>
  )
}
```

### 3. Common Operations

#### Assign a Role
```tsx
// Promote member to Co-Admin
await assignRole(memberId, 'co_admin')
// Success toast shown automatically ✅
```

#### Transfer Ownership
```tsx
// Transfer to another Co-Admin
await transferOwnership(coAdminUserId)
// Special toast with crown emoji 👑
```

#### Get Sorted Hierarchy
```tsx
const hierarchy = getFamilyHierarchy()
// Returns: [Account Owner, Co-Admins..., Caregivers..., Viewers...]
```

## 📁 Files You Need

| File | Purpose |
|------|---------|
| `hooks/useFamilyRoles.ts` | Main hook (import this) |
| `hooks/useFamilyRoles.README.md` | Full documentation |
| `hooks/useFamilyRoles.example.tsx` | Working examples |
| `hooks/useFamilyRoles.types.ts` | Type definitions |

## 🔑 Key Features

- ✅ Automatic permission validation
- ✅ Optimistic UI updates
- ✅ Toast notifications (success/error)
- ✅ TypeScript type safety
- ✅ Error handling with rollback
- ✅ Integration with existing hooks

## 🎯 Common Use Cases

### 1. Show Role Badge
```tsx
import { getRoleLabel, getRoleBadgeColor } from '@/lib/family-roles'

<span className={getRoleBadgeColor(member.familyRole)}>
  {getRoleLabel(member.familyRole)}
</span>
```

### 2. Check Permissions
```tsx
const canEdit = canUserEditMember(member)
if (canEdit) {
  // Show edit button
}
```

### 3. Admin-Only Features
```tsx
import { useIsAdmin } from './useFamilyRoles'

const isAdmin = useIsAdmin(familyMembers, user.uid)
if (isAdmin) {
  // Show admin controls
}
```

## 🏗️ Role Hierarchy

```
Account Owner (Highest Authority)
    ├── Can assign: Co-Admin, Caregiver, Viewer
    ├── Can transfer ownership
    └── Cannot be edited

Co-Admin
    ├── Can assign: Caregiver, Viewer
    └── Can manage lower roles

Caregiver
    └── Standard access, cannot assign roles

Viewer (Lowest Authority)
    └── Read-only access
```

## ⚠️ Important Rules

1. **Only Account Owner** can assign Co-Admin role
2. **Only Account Owner** can transfer ownership
3. **New owner must be a Co-Admin** (promote them first)
4. **Cannot edit Account Owner** (except by transferring ownership)
5. **Previous owner becomes Co-Admin** after transfer

## 🔌 Backend Requirements

The hook expects these API endpoints:

```
GET    /family-members                 - Get all members
PATCH  /family-members/:id/role        - Assign role
POST   /family-members/transfer-ownership - Transfer ownership
```

See `useFamilyRoles.README.md` for detailed API specs.

## 🧪 Quick Test

```tsx
function TestComponent() {
  const { assignRole, familyMembers } = useFamilyRoles()

  const testAssignRole = async () => {
    const member = familyMembers[1] // Second member
    if (member) {
      await assignRole(member.id, 'co_admin')
      // Should see success toast
    }
  }

  return <button onClick={testAssignRole}>Test Assign Role</button>
}
```

## 📚 Next Steps

1. **Read Full Docs**: `useFamilyRoles.README.md`
2. **See Examples**: `useFamilyRoles.example.tsx`
3. **Check Types**: `useFamilyRoles.types.ts`
4. **Implement Backend**: See API requirements in README

## 💡 Pro Tips

1. **Use Optimistic Updates**: The hook handles it automatically
2. **Let Toasts Handle Feedback**: Don't add extra success messages
3. **Check Permissions First**: Use `canUserAssignRole()` before showing UI
4. **Sort with getFamilyHierarchy()**: Always show Account Owner first
5. **Combine with useFamilyMembers**: For patient-specific operations

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Permission denied" error | Check user's role with `getCurrentUserRole()` |
| Role not updating | Check if backend API is implemented |
| No toast notifications | Ensure react-hot-toast is installed |
| TypeScript errors | Import types from `@/types/medical` |

## 📞 Need Help?

- Full documentation: `useFamilyRoles.README.md`
- Working examples: `useFamilyRoles.example.tsx`
- Type definitions: `useFamilyRoles.types.ts`
- Implementation summary: `useFamilyRoles.SUMMARY.md`

---

**Ready to go!** Import the hook and start managing family roles. 🎉
