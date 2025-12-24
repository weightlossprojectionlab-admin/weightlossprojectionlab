/**
 * Household Permissions Types
 *
 * Defines role-based access control (RBAC) for household management.
 * Different households can have different caregivers with different permission levels.
 */

export type HouseholdRole =
  | 'owner'              // Created the household, full control
  | 'primary_caregiver'  // Main caregiver, can manage duties and members
  | 'caregiver'          // Can manage duties, limited member management
  | 'viewer'             // Read-only access

export interface HouseholdPermissions {
  // Duty Management
  canCreateDuties: boolean
  canAssignDuties: boolean
  canCompleteDuties: boolean
  canEditDuties: boolean
  canDeleteDuties: boolean

  // Household Management
  canEditHousehold: boolean
  canDeleteHousehold: boolean

  // Member Management
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canEditMemberRoles: boolean

  // Shopping & Inventory Management
  canClearShoppingList: boolean
  canClearInventory: boolean

  // Access Control
  canViewAllDuties: boolean
  canViewHouseholdMembers: boolean
  canViewStats: boolean
}

export interface HouseholdMember {
  userId: string
  name: string
  email: string
  role: HouseholdRole
  permissions: HouseholdPermissions
  addedAt: string
  addedBy: string // userId who added this member
  isActive: boolean
}

/**
 * Permission presets for each role
 */
export const ROLE_PERMISSIONS: Record<HouseholdRole, HouseholdPermissions> = {
  owner: {
    canCreateDuties: true,
    canAssignDuties: true,
    canCompleteDuties: true,
    canEditDuties: true,
    canDeleteDuties: true,
    canEditHousehold: true,
    canDeleteHousehold: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditMemberRoles: true,
    canClearShoppingList: true,
    canClearInventory: true,
    canViewAllDuties: true,
    canViewHouseholdMembers: true,
    canViewStats: true,
  },

  primary_caregiver: {
    canCreateDuties: true,
    canAssignDuties: true,
    canCompleteDuties: true,
    canEditDuties: true,
    canDeleteDuties: true,
    canEditHousehold: true,
    canDeleteHousehold: false, // Only owner can delete
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditMemberRoles: false, // Only owner can change roles
    canClearShoppingList: true,
    canClearInventory: true,
    canViewAllDuties: true,
    canViewHouseholdMembers: true,
    canViewStats: true,
  },

  caregiver: {
    canCreateDuties: true,
    canAssignDuties: true,
    canCompleteDuties: true,
    canEditDuties: true,
    canDeleteDuties: false, // Can't delete, only complete
    canEditHousehold: false,
    canDeleteHousehold: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditMemberRoles: false,
    canClearShoppingList: false, // Cannot bulk clear
    canClearInventory: false, // Cannot bulk clear
    canViewAllDuties: true,
    canViewHouseholdMembers: true,
    canViewStats: true,
  },

  viewer: {
    canCreateDuties: false,
    canAssignDuties: false,
    canCompleteDuties: false, // Can only view
    canEditDuties: false,
    canDeleteDuties: false,
    canEditHousehold: false,
    canDeleteHousehold: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditMemberRoles: false,
    canClearShoppingList: false, // Cannot bulk clear
    canClearInventory: false, // Cannot bulk clear
    canViewAllDuties: true,
    canViewHouseholdMembers: true,
    canViewStats: true,
  },
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: HouseholdRole): HouseholdPermissions {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if a user has a specific permission in a household
 */
export function hasPermission(
  userRole: HouseholdRole | undefined,
  permission: keyof HouseholdPermissions
): boolean {
  if (!userRole) return false
  const permissions = ROLE_PERMISSIONS[userRole]
  return permissions[permission]
}

/**
 * Get user's role in a household
 */
export function getUserRoleInHousehold(
  householdId: string,
  userId: string,
  households: Array<{ id: string; primaryCaregiverId: string; additionalCaregiverIds?: string[]; createdBy: string }>
): HouseholdRole | null {
  const household = households.find(h => h.id === householdId)
  if (!household) return null

  // Owner: Created the household
  if (household.createdBy === userId) {
    return 'owner'
  }

  // Primary Caregiver
  if (household.primaryCaregiverId === userId) {
    return 'primary_caregiver'
  }

  // Additional Caregiver
  if (household.additionalCaregiverIds?.includes(userId)) {
    return 'caregiver'
  }

  // Default: no access (should not happen if user has access to household)
  return null
}

/**
 * Permission check result with contextual message
 */
export interface PermissionCheckResult {
  allowed: boolean
  message?: string
  requiredRole?: HouseholdRole
}

/**
 * Check permission with helpful error message
 */
export function checkPermission(
  userRole: HouseholdRole | null,
  permission: keyof HouseholdPermissions,
  actionName: string
): PermissionCheckResult {
  if (!userRole) {
    return {
      allowed: false,
      message: `You don't have access to this household`,
    }
  }

  const hasAccess = hasPermission(userRole, permission)

  if (!hasAccess) {
    // Find minimum required role
    let requiredRole: HouseholdRole = 'owner'
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (perms[permission]) {
        requiredRole = role as HouseholdRole
        break
      }
    }

    return {
      allowed: false,
      message: `You need ${requiredRole} permission to ${actionName}`,
      requiredRole,
    }
  }

  return { allowed: true }
}
