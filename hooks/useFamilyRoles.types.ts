/**
 * Type Definitions for useFamilyRoles Hook
 *
 * This file provides explicit type definitions for better IDE support
 * All types are re-exported from the main types/medical.ts file
 */

import type { FamilyMember, FamilyRole, FamilyMemberPermissions } from '@/types/medical'

// ==================== HOOK OPTIONS ====================

/**
 * Options for configuring the useFamilyRoles hook
 */
export interface UseFamilyRolesOptions {
  /**
   * Whether to automatically fetch family members on mount
   * @default true
   */
  autoFetch?: boolean
}

// ==================== HOOK RETURN TYPE ====================

/**
 * Return type for the useFamilyRoles hook
 */
export interface UseFamilyRolesReturn {
  // ==================== STATE ====================

  /**
   * Array of all family members in the account
   */
  familyMembers: FamilyMember[]

  /**
   * Loading state - true while fetching data
   */
  loading: boolean

  /**
   * Error message if any operation failed
   */
  error: string | null

  // ==================== ACTIONS ====================

  /**
   * Manually refetch family members from the server
   */
  refetch: () => Promise<void>

  /**
   * Assign a new role to a family member
   * @param memberId - The ID of the family member
   * @param newRole - The new role to assign
   * @returns Promise resolving to the updated FamilyMember
   * @throws Error if user lacks permission or role is invalid
   */
  assignRole: (memberId: string, newRole: FamilyRole) => Promise<FamilyMember>

  /**
   * Transfer Account Owner status to another family member (must be Co-Admin)
   * @param newOwnerId - The user ID of the new account owner
   * @returns Promise resolving when transfer is complete
   * @throws Error if new owner is not a Co-Admin or user lacks permission
   */
  transferOwnership: (newOwnerId: string) => Promise<void>

  // ==================== HELPERS ====================

  /**
   * Get family members sorted by role authority (Account Owner first)
   * @returns Array of FamilyMembers sorted by hierarchy
   */
  getFamilyHierarchy: () => FamilyMember[]

  /**
   * Check if current user can assign a specific role
   * @param targetRole - The role to check
   * @param currentUserRole - Current user's role (optional, auto-detected)
   * @returns true if user can assign the role
   */
  canUserAssignRole: (targetRole: FamilyRole, currentUserRole?: FamilyRole) => boolean

  /**
   * Check if current user can edit a specific family member
   * @param targetMember - The family member to check
   * @param currentUserRole - Current user's role (optional, auto-detected)
   * @returns true if user can edit the member
   */
  canUserEditMember: (targetMember: FamilyMember, currentUserRole?: FamilyRole) => boolean
}

// ==================== OWNERSHIP TRANSFER ====================

/**
 * Response type for ownership transfer operation
 */
export interface OwnershipTransferResult {
  /**
   * The previous account owner (now demoted to Co-Admin)
   */
  oldOwner: FamilyMember

  /**
   * The new account owner (promoted from Co-Admin)
   */
  newOwner: FamilyMember
}

// ==================== ROLE ASSIGNMENT ====================

/**
 * Role assignment validation result
 */
export interface RoleAssignmentValidation {
  /**
   * Whether the assignment is valid
   */
  valid: boolean

  /**
   * Error message if validation failed
   */
  error?: string
}

// ==================== RE-EXPORTS FROM TYPES/MEDICAL ====================

/**
 * Re-export FamilyRole for convenience
 */
export type { FamilyRole }

/**
 * Re-export FamilyMember for convenience
 */
export type { FamilyMember }

/**
 * Re-export FamilyMemberPermissions for convenience
 */
export type { FamilyMemberPermissions }

// ==================== ROLE HIERARCHY ====================

/**
 * Role authority levels (higher number = more authority)
 */
export const ROLE_AUTHORITY: Record<FamilyRole, number> = {
  account_owner: 4,
  co_admin: 3,
  caregiver: 2,
  viewer: 1
}

/**
 * Roles that can be assigned by Account Owner
 */
export type AssignableByOwner = 'co_admin' | 'caregiver' | 'viewer'

/**
 * Roles that can be assigned by Co-Admin
 */
export type AssignableByCoAdmin = 'caregiver' | 'viewer'

// ==================== HELPER FUNCTION TYPES ====================

/**
 * Function to get current user's role from family members list
 */
export type GetCurrentUserRole = (
  familyMembers: FamilyMember[],
  currentUserId: string
) => FamilyRole | null

/**
 * Function to check if user has admin privileges
 */
export type UseIsAdmin = (
  familyMembers: FamilyMember[],
  currentUserId: string
) => boolean

/**
 * Function to check if user is account owner
 */
export type UseIsAccountOwner = (
  familyMembers: FamilyMember[],
  currentUserId: string
) => boolean

// ==================== ERROR TYPES ====================

/**
 * Possible error codes for role operations
 */
export enum RoleOperationError {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_ROLE = 'INVALID_ROLE',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  OWNER_NOT_FOUND = 'OWNER_NOT_FOUND',
  NOT_CO_ADMIN = 'NOT_CO_ADMIN',
  CANNOT_EDIT_SELF = 'CANNOT_EDIT_SELF',
  CANNOT_DEMOTE_OWNER = 'CANNOT_DEMOTE_OWNER',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Detailed error type for role operations
 */
export interface RoleOperationErrorDetail {
  code: RoleOperationError
  message: string
  details?: unknown
}

// ==================== API TYPES ====================

/**
 * API request body for role assignment
 */
export interface AssignRoleRequest {
  familyRole: FamilyRole
}

/**
 * API request body for ownership transfer
 */
export interface TransferOwnershipRequest {
  newOwnerId: string
}

/**
 * API response for role assignment
 */
export interface AssignRoleResponse {
  success: boolean
  data: FamilyMember
  error?: string
}

/**
 * API response for ownership transfer
 */
export interface TransferOwnershipResponse {
  success: boolean
  data: OwnershipTransferResult
  error?: string
}

/**
 * API response for family hierarchy
 */
export interface FamilyHierarchyResponse {
  success: boolean
  data: FamilyMember[]
  error?: string
}

// ==================== UTILITY TYPES ====================

/**
 * Extract only the role-related fields from FamilyMember
 */
export type FamilyMemberRoleInfo = Pick<
  FamilyMember,
  'id' | 'userId' | 'name' | 'email' | 'familyRole' | 'roleAssignedAt' | 'roleAssignedBy'
>

/**
 * Partial update for family member role
 */
export type FamilyMemberRoleUpdate = {
  familyRole: FamilyRole
  roleAssignedAt?: string
  roleAssignedBy?: string
}

/**
 * Role change history entry
 */
export interface RoleChangeHistoryEntry {
  memberId: string
  memberName: string
  previousRole: FamilyRole
  newRole: FamilyRole
  changedBy: string
  changedAt: string
}
