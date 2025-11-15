/**
 * Family Member Permissions Management
 *
 * Permission presets, labels, and utility functions for family collaboration
 */

import type { FamilyMemberPermissions } from '@/types/medical'

// ==================== PERMISSION PRESETS ====================

export const PERMISSION_PRESETS: Record<string, FamilyMemberPermissions> = {
  FULL_ACCESS: {
    viewMedicalRecords: true,
    editMedications: true,
    scheduleAppointments: true,
    editAppointments: true,
    deleteAppointments: true,
    uploadDocuments: true,
    deleteDocuments: true,
    logVitals: true,
    viewVitals: true,
    chatAccess: true,
    inviteOthers: true,
    viewSensitiveInfo: true,
    editPatientProfile: true
  },
  VIEW_ONLY: {
    viewMedicalRecords: true,
    editMedications: false,
    scheduleAppointments: false,
    editAppointments: false,
    deleteAppointments: false,
    uploadDocuments: false,
    deleteDocuments: false,
    logVitals: false,
    viewVitals: true,
    chatAccess: true,
    inviteOthers: false,
    viewSensitiveInfo: false,
    editPatientProfile: false
  },
  LIMITED_EDIT: {
    viewMedicalRecords: true,
    editMedications: false,
    scheduleAppointments: true,
    editAppointments: true,
    deleteAppointments: false,
    uploadDocuments: true,
    deleteDocuments: false,
    logVitals: true,
    viewVitals: true,
    chatAccess: true,
    inviteOthers: false,
    viewSensitiveInfo: false,
    editPatientProfile: false
  },
  CAREGIVER: {
    viewMedicalRecords: true,
    editMedications: true,
    scheduleAppointments: true,
    editAppointments: true,
    deleteAppointments: true,
    uploadDocuments: true,
    deleteDocuments: true,
    logVitals: true,
    viewVitals: true,
    chatAccess: true,
    inviteOthers: false,
    viewSensitiveInfo: false, // No sensitive info access
    editPatientProfile: true
  }
}

// ==================== PERMISSION LABELS ====================

export const PERMISSION_LABELS: Record<keyof FamilyMemberPermissions, string> = {
  viewMedicalRecords: 'View Medical Records',
  editMedications: 'Edit Medications',
  scheduleAppointments: 'Schedule Appointments',
  editAppointments: 'Edit Appointments',
  deleteAppointments: 'Delete Appointments',
  uploadDocuments: 'Upload Documents',
  deleteDocuments: 'Delete Documents',
  logVitals: 'Log Vital Signs',
  viewVitals: 'View Vital Signs',
  chatAccess: 'Chat Access',
  inviteOthers: 'Invite Other Family Members',
  viewSensitiveInfo: 'View Sensitive Info (SSN, Insurance)',
  editPatientProfile: 'Edit Patient Profile'
}

// ==================== PERMISSION DESCRIPTIONS ====================

export const PERMISSION_DESCRIPTIONS: Record<keyof FamilyMemberPermissions, string> = {
  viewMedicalRecords: 'Can view all medical records, including medications, appointments, and documents',
  editMedications: 'Can add, edit, and remove medications',
  scheduleAppointments: 'Can schedule new appointments',
  editAppointments: 'Can modify existing appointments',
  deleteAppointments: 'Can cancel and delete appointments',
  uploadDocuments: 'Can upload medical documents, test results, and images',
  deleteDocuments: 'Can delete medical documents',
  logVitals: 'Can record vital signs (blood pressure, weight, etc.)',
  viewVitals: 'Can view vital sign history and trends',
  chatAccess: 'Can participate in family chat about patient care',
  inviteOthers: 'Can invite additional family members to access this patient',
  viewSensitiveInfo: 'Can view SSN, full insurance member IDs, and other sensitive information',
  editPatientProfile: 'Can edit patient name, date of birth, and other profile information'
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if a family member has a specific permission
 */
export function hasPermission(
  permissions: FamilyMemberPermissions | undefined,
  permission: keyof FamilyMemberPermissions
): boolean {
  if (!permissions) return false
  return permissions[permission] === true
}

/**
 * Check if a family member has ALL of the specified permissions
 */
export function hasAllPermissions(
  permissions: FamilyMemberPermissions | undefined,
  requiredPermissions: (keyof FamilyMemberPermissions)[]
): boolean {
  if (!permissions) return false
  return requiredPermissions.every(permission => permissions[permission] === true)
}

/**
 * Check if a family member has ANY of the specified permissions
 */
export function hasAnyPermission(
  permissions: FamilyMemberPermissions | undefined,
  requiredPermissions: (keyof FamilyMemberPermissions)[]
): boolean {
  if (!permissions) return false
  return requiredPermissions.some(permission => permissions[permission] === true)
}

/**
 * Get count of granted permissions
 */
export function getGrantedPermissionsCount(permissions: FamilyMemberPermissions): number {
  return Object.values(permissions).filter(Boolean).length
}

/**
 * Get list of granted permission names
 */
export function getGrantedPermissionNames(permissions: FamilyMemberPermissions): string[] {
  return Object.entries(permissions)
    .filter(([_, granted]) => granted)
    .map(([key]) => PERMISSION_LABELS[key as keyof FamilyMemberPermissions])
}

/**
 * Get warnings for sensitive permissions
 */
export function getSensitivePermissionWarnings(
  permissions: Partial<FamilyMemberPermissions>
): string[] {
  const warnings: string[] = []

  if (permissions.viewSensitiveInfo) {
    warnings.push(
      'This person will be able to view SSN, full insurance details, and other sensitive information.'
    )
  }

  if (permissions.deleteDocuments) {
    warnings.push(
      'This person will be able to permanently delete medical documents. This action cannot be undone.'
    )
  }

  if (permissions.deleteAppointments) {
    warnings.push(
      'This person will be able to cancel appointments, which may result in no-show fees.'
    )
  }

  if (permissions.inviteOthers) {
    warnings.push(
      'This person will be able to invite additional family members to access this patient\'s records.'
    )
  }

  if (permissions.editPatientProfile) {
    warnings.push(
      'This person will be able to modify patient name, date of birth, and other core information.'
    )
  }

  return warnings
}

/**
 * Compare two permission sets and get the differences
 */
export function getPermissionDiff(
  oldPermissions: FamilyMemberPermissions,
  newPermissions: FamilyMemberPermissions
): {
  added: (keyof FamilyMemberPermissions)[]
  removed: (keyof FamilyMemberPermissions)[]
} {
  const added: (keyof FamilyMemberPermissions)[] = []
  const removed: (keyof FamilyMemberPermissions)[] = []

  for (const key in oldPermissions) {
    const permKey = key as keyof FamilyMemberPermissions
    if (!oldPermissions[permKey] && newPermissions[permKey]) {
      added.push(permKey)
    } else if (oldPermissions[permKey] && !newPermissions[permKey]) {
      removed.push(permKey)
    }
  }

  return { added, removed }
}

/**
 * Get permission level name based on granted permissions
 */
export function getPermissionLevelName(permissions: FamilyMemberPermissions): string {
  const grantedCount = getGrantedPermissionsCount(permissions)
  const totalCount = Object.keys(permissions).length

  if (grantedCount === totalCount) return 'Full Access'
  if (grantedCount === 0) return 'No Access'

  // Check if matches presets
  if (JSON.stringify(permissions) === JSON.stringify(PERMISSION_PRESETS.VIEW_ONLY)) {
    return 'View Only'
  }
  if (JSON.stringify(permissions) === JSON.stringify(PERMISSION_PRESETS.LIMITED_EDIT)) {
    return 'Limited Edit'
  }
  if (JSON.stringify(permissions) === JSON.stringify(PERMISSION_PRESETS.CAREGIVER)) {
    return 'Caregiver'
  }

  // Custom permissions
  if (grantedCount <= 3) return 'Minimal Access'
  if (grantedCount <= 7) return 'Limited Access'
  return 'Extended Access'
}

/**
 * Validate permissions object structure
 */
export function isValidPermissions(permissions: any): permissions is FamilyMemberPermissions {
  if (!permissions || typeof permissions !== 'object') return false

  const requiredKeys: (keyof FamilyMemberPermissions)[] = [
    'viewMedicalRecords',
    'editMedications',
    'scheduleAppointments',
    'editAppointments',
    'deleteAppointments',
    'uploadDocuments',
    'deleteDocuments',
    'logVitals',
    'viewVitals',
    'chatAccess',
    'inviteOthers',
    'viewSensitiveInfo',
    'editPatientProfile'
  ]

  return requiredKeys.every(
    key => key in permissions && typeof permissions[key] === 'boolean'
  )
}
