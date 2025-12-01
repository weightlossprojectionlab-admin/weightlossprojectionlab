/**
 * Admin Permissions & Role-Based Access Control (RBAC)
 *
 * Role hierarchy:
 * - admin: Full access to all admin functions
 * - moderator: Content moderation (recipes, T&S cases)
 * - support: User support (view profiles, help with issues)
 *
 * Super Admins (configured via environment variable):
 * - Set SUPER_ADMIN_EMAILS in .env.local (comma-separated list)
 * Super admins have full access that cannot be revoked.
 */

export type AdminRole = 'admin' | 'moderator' | 'support'

// Super admin emails from environment variable (comma-separated)
export const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

// Log warning if no super admin emails are configured
if (SUPER_ADMIN_EMAILS.length === 0 && typeof window === 'undefined') {
  console.warn('⚠️  No super admin emails configured. Set SUPER_ADMIN_EMAILS in .env.local')
}

export const isSuperAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}

// Export a function variant for use in scripts
export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}

export interface AdminPermissions {
  // User Management
  canViewUsers: boolean
  canEditUsers: boolean
  canSuspendUsers: boolean
  canDeleteUsers: boolean
  canExportUserData: boolean

  // Recipe Moderation
  canModerateRecipes: boolean
  canFeatureRecipes: boolean
  canDeleteRecipes: boolean

  // Trust & Safety
  canViewCases: boolean
  canResolveCases: boolean
  canEscalateCases: boolean

  // AI Decisions
  canReviewAIDecisions: boolean
  canReverseAIDecisions: boolean

  // Coaching
  canApproveCoaches: boolean
  canManagePayouts: boolean
  canManageStrikes: boolean

  // Perks
  canManagePerks: boolean
  canManagePartners: boolean

  // Analytics
  canViewAnalytics: boolean
  canExportReports: boolean

  // System
  canManageAdmins: boolean
  canManageSettings: boolean
}

export function getPermissions(role: AdminRole | null): AdminPermissions {
  if (!role) {
    return getAllPermissions(false)
  }

  switch (role) {
    case 'admin':
      return getAllPermissions(true) // Full access

    case 'moderator':
      return {
        ...getAllPermissions(false),
        canViewUsers: true,
        canModerateRecipes: true,
        canFeatureRecipes: true,
        canViewCases: true,
        canResolveCases: true,
        canEscalateCases: true,
        canViewAnalytics: true,
      }

    case 'support':
      return {
        ...getAllPermissions(false),
        canViewUsers: true,
        canExportUserData: true,
        canViewCases: true,
        canViewAnalytics: true,
      }

    default:
      return getAllPermissions(false)
  }
}

function getAllPermissions(value: boolean): AdminPermissions {
  return {
    canViewUsers: value,
    canEditUsers: value,
    canSuspendUsers: value,
    canDeleteUsers: value,
    canExportUserData: value,
    canModerateRecipes: value,
    canFeatureRecipes: value,
    canDeleteRecipes: value,
    canViewCases: value,
    canResolveCases: value,
    canEscalateCases: value,
    canReviewAIDecisions: value,
    canReverseAIDecisions: value,
    canApproveCoaches: value,
    canManagePayouts: value,
    canManageStrikes: value,
    canManagePerks: value,
    canManagePartners: value,
    canViewAnalytics: value,
    canExportReports: value,
    canManageAdmins: value,
    canManageSettings: value,
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: AdminRole | null,
  permission: keyof AdminPermissions
): boolean {
  const permissions = getPermissions(role)
  return permissions[permission]
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: AdminRole | null): string {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'moderator':
      return 'Moderator'
    case 'support':
      return 'Support Agent'
    default:
      return 'User'
  }
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: AdminRole | null): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-500 text-white'
    case 'moderator':
      return 'bg-secondary-light0 text-white'
    case 'support':
      return 'bg-success-light0 text-white'
    default:
      return 'bg-background0 text-white'
  }
}
