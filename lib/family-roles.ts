/**
 * Family Roles Management
 *
 * Role hierarchy and permission system for family account management
 * Supports Account Owner (super admin), Co-Admins, Caregivers, and Viewers
 */

import type { FamilyRole, FamilyMember, FamilyMemberPermissions } from '@/types/medical'
import { PERMISSION_PRESETS } from './family-permissions'

// ==================== ROLE HIERARCHY ====================

/**
 * Role hierarchy from highest to lowest authority
 */
export const ROLE_HIERARCHY: FamilyRole[] = [
  'account_owner',
  'co_admin',
  'caregiver',
  'viewer'
]

/**
 * Get numeric level for role (higher = more authority)
 */
export function getRoleLevel(role: FamilyRole): number {
  return ROLE_HIERARCHY.length - ROLE_HIERARCHY.indexOf(role)
}

/**
 * Check if roleA has higher authority than roleB
 */
export function hasHigherAuthority(roleA: FamilyRole, roleB: FamilyRole): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB)
}

// ==================== ROLE DISPLAY ====================

export const ROLE_LABELS: Record<FamilyRole, string> = {
  account_owner: 'Account Owner',
  co_admin: 'Co-Admin',
  caregiver: 'Caregiver',
  viewer: 'Viewer'
}

export const ROLE_DESCRIPTIONS: Record<FamilyRole, string> = {
  account_owner: 'Primary account holder with full control over all family members and patients',
  co_admin: 'Trusted family member with elevated privileges to manage caregivers and viewers',
  caregiver: 'Standard access with assigned permissions to specific patients',
  viewer: 'Read-only access to assigned patients'
}

export const ROLE_BADGE_COLORS: Record<FamilyRole, string> = {
  account_owner: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
  co_admin: 'bg-purple-500 text-white',
  caregiver: 'bg-blue-500 text-white',
  viewer: 'bg-gray-500 text-white'
}

// ==================== ROLE PERMISSIONS ====================

/**
 * Default permissions for each role
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<FamilyRole, FamilyMemberPermissions> = {
  account_owner: PERMISSION_PRESETS.FULL_ACCESS,
  co_admin: PERMISSION_PRESETS.FULL_ACCESS,
  caregiver: PERMISSION_PRESETS.CAREGIVER,
  viewer: PERMISSION_PRESETS.VIEW_ONLY
}

/**
 * Role capabilities (what each role can do)
 */
export interface RoleCapabilities {
  canInviteMembers: boolean
  canManageRoles: boolean
  canRemoveMembers: boolean
  canTransferOwnership: boolean
  canEditAccountOwner: boolean
  canEditCoAdmins: boolean
  canEditCaregivers: boolean
  canEditViewers: boolean
  canAccessAllPatients: boolean
  canModifyPermissions: boolean
}

export const ROLE_CAPABILITIES: Record<FamilyRole, RoleCapabilities> = {
  account_owner: {
    canInviteMembers: true,
    canManageRoles: true,
    canRemoveMembers: true,
    canTransferOwnership: true,
    canEditAccountOwner: false, // Cannot edit themselves
    canEditCoAdmins: true,
    canEditCaregivers: true,
    canEditViewers: true,
    canAccessAllPatients: true,
    canModifyPermissions: true
  },
  co_admin: {
    canInviteMembers: true,
    canManageRoles: true, // Can assign caregiver/viewer roles only
    canRemoveMembers: true, // Except Account Owner and other Co-Admins
    canTransferOwnership: false,
    canEditAccountOwner: false,
    canEditCoAdmins: false,
    canEditCaregivers: true,
    canEditViewers: true,
    canAccessAllPatients: true,
    canModifyPermissions: true // For caregivers/viewers only
  },
  caregiver: {
    canInviteMembers: false, // Unless granted inviteOthers permission
    canManageRoles: false,
    canRemoveMembers: false,
    canTransferOwnership: false,
    canEditAccountOwner: false,
    canEditCoAdmins: false,
    canEditCaregivers: false,
    canEditViewers: false,
    canAccessAllPatients: false, // Only assigned patients
    canModifyPermissions: false
  },
  viewer: {
    canInviteMembers: false,
    canManageRoles: false,
    canRemoveMembers: false,
    canTransferOwnership: false,
    canEditAccountOwner: false,
    canEditCoAdmins: false,
    canEditCaregivers: false,
    canEditViewers: false,
    canAccessAllPatients: false, // Only assigned patients
    canModifyPermissions: false
  }
}

// ==================== ROLE VALIDATION ====================

/**
 * Check if a user can edit another family member based on roles
 */
export function canEditMember(
  editorRole: FamilyRole,
  targetRole: FamilyRole
): boolean {
  const capabilities = ROLE_CAPABILITIES[editorRole]

  switch (targetRole) {
    case 'account_owner':
      return capabilities.canEditAccountOwner
    case 'co_admin':
      return capabilities.canEditCoAdmins
    case 'caregiver':
      return capabilities.canEditCaregivers
    case 'viewer':
      return capabilities.canEditViewers
    default:
      return false
  }
}

/**
 * Check if a user can assign a specific role
 */
export function canAssignRole(
  assignerRole: FamilyRole,
  roleToAssign: FamilyRole
): boolean {
  // Account Owner can assign any role except Account Owner
  if (assignerRole === 'account_owner') {
    return roleToAssign !== 'account_owner'
  }

  // Co-Admin can only assign caregiver or viewer
  if (assignerRole === 'co_admin') {
    return roleToAssign === 'caregiver' || roleToAssign === 'viewer'
  }

  // Others cannot assign roles
  return false
}

/**
 * Check if a user can remove another family member
 */
export function canRemoveMember(
  removerRole: FamilyRole,
  targetRole: FamilyRole
): boolean {
  const capabilities = ROLE_CAPABILITIES[removerRole]

  if (!capabilities.canRemoveMembers) {
    return false
  }

  // Can only remove members with lower or equal authority
  // But cannot remove Account Owner
  if (targetRole === 'account_owner') {
    return false
  }

  return hasHigherAuthority(removerRole, targetRole) || removerRole === targetRole
}

/**
 * Get list of roles that a user can assign
 */
export function getAssignableRoles(assignerRole: FamilyRole): FamilyRole[] {
  if (assignerRole === 'account_owner') {
    return ['co_admin', 'caregiver', 'viewer']
  }

  if (assignerRole === 'co_admin') {
    return ['caregiver', 'viewer']
  }

  return []
}

// ==================== ROLE UTILITIES ====================

/**
 * Get role display label
 */
export function getRoleLabel(role: FamilyRole): string {
  return ROLE_LABELS[role]
}

/**
 * Get role description
 */
export function getRoleDescription(role: FamilyRole): string {
  return ROLE_DESCRIPTIONS[role]
}

/**
 * Get role badge color classes
 */
export function getRoleBadgeColor(role: FamilyRole): string {
  return ROLE_BADGE_COLORS[role]
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissionsForRole(role: FamilyRole): FamilyMemberPermissions {
  return { ...ROLE_DEFAULT_PERMISSIONS[role] }
}

/**
 * Check if role requires special confirmation
 */
export function requiresConfirmation(role: FamilyRole): boolean {
  return role === 'co_admin'
}

/**
 * Get warning message for assigning a role
 */
export function getRoleAssignmentWarning(role: FamilyRole): string | null {
  switch (role) {
    case 'account_owner':
      return 'Account Owner has full control over the family account and cannot be removed by anyone.'
    case 'co_admin':
      return 'Co-Admins have elevated privileges and can manage other family members. Only assign this role to trusted individuals.'
    case 'caregiver':
      return null
    case 'viewer':
      return null
    default:
      return null
  }
}

/**
 * Validate role assignment
 */
export function validateRoleAssignment(
  assignerRole: FamilyRole,
  targetCurrentRole: FamilyRole,
  newRole: FamilyRole
): { valid: boolean; error?: string } {
  // Cannot change Account Owner role (use transfer ownership instead)
  if (targetCurrentRole === 'account_owner') {
    return {
      valid: false,
      error: 'Cannot change Account Owner role. Use transfer ownership instead.'
    }
  }

  // Check if assigner can assign this role
  if (!canAssignRole(assignerRole, newRole)) {
    return {
      valid: false,
      error: `You don't have permission to assign the ${getRoleLabel(newRole)} role.`
    }
  }

  // Check if assigner can edit the target member
  if (!canEditMember(assignerRole, targetCurrentRole)) {
    return {
      valid: false,
      error: `You don't have permission to edit members with ${getRoleLabel(targetCurrentRole)} role.`
    }
  }

  return { valid: true }
}

/**
 * Get family member's capabilities based on their role
 */
export function getMemberCapabilities(member: FamilyMember): RoleCapabilities {
  return ROLE_CAPABILITIES[member.familyRole || 'caregiver']
}

/**
 * Check if user is Account Owner
 */
export function isAccountOwner(userRole?: FamilyRole | null): boolean {
  return userRole === 'account_owner'
}

/**
 * Check if user has admin privileges (Account Owner or Co-Admin)
 */
export function hasAdminPrivileges(userRole?: FamilyRole | null): boolean {
  return userRole === 'account_owner' || userRole === 'co_admin'
}
