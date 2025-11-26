/**
 * Permissions Matrix
 *
 * Interactive permission editor with visual matrix display
 * Shows all permissions with toggle switches
 */

'use client'

import type { FamilyMemberPermissions } from '@/types/medical'
import { PERMISSION_LABELS, PERMISSION_PRESETS } from '@/lib/family-permissions'

interface PermissionsMatrixProps {
  permissions: FamilyMemberPermissions
  onChange: (permissions: FamilyMemberPermissions) => void
  readOnly?: boolean
}

export function PermissionsMatrix({
  permissions,
  onChange,
  readOnly = false
}: PermissionsMatrixProps) {
  const handleToggle = (key: keyof FamilyMemberPermissions) => {
    if (readOnly) return
    onChange({
      ...permissions,
      [key]: !permissions[key]
    })
  }

  const handlePreset = (preset: keyof typeof PERMISSION_PRESETS) => {
    if (readOnly) return
    onChange(PERMISSION_PRESETS[preset])
  }

  // Group permissions by category
  const permissionGroups = {
    'Medical Info': [
      'viewMedicalRecords',
      'logVitals',
      'viewVitals',
      'editMedications'
    ] as const,
    'Appointments': [
      'scheduleAppointments',
      'editAppointments',
      'deleteAppointments'
    ] as const,
    'Documents': [
      'uploadDocuments',
      'deleteDocuments'
    ] as const,
    'Profile & Settings': [
      'editPatientProfile',
      'viewSensitiveInfo'
    ] as const,
    'Collaboration': [
      'chatAccess',
      'inviteOthers'
    ] as const
  }

  return (
    <div className="space-y-6">
      {/* Preset Buttons */}
      {!readOnly && (
        <div>
          <p className="text-sm font-medium text-foreground mb-3">
            Quick Presets
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handlePreset('VIEW_ONLY')}
              className="px-3 py-2 text-sm bg-secondary-light text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              View Only
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LIMITED_EDIT')}
              className="px-3 py-2 text-sm bg-warning-light text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              Limited Edit
            </button>
            <button
              type="button"
              onClick={() => handlePreset('CAREGIVER')}
              className="px-3 py-2 text-sm bg-success-light dark:bg-green-900/20 text-success-dark dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              Caregiver
            </button>
            <button
              type="button"
              onClick={() => handlePreset('FULL_ACCESS')}
              className="px-3 py-2 text-sm bg-primary-light text-primary-dark rounded-lg hover:bg-primary-light dark:hover:bg-purple-900/30 transition-colors"
            >
              Full Access
            </button>
          </div>
        </div>
      )}

      {/* Permission Groups */}
      <div className="space-y-4">
        {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
          <div key={groupName}>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              {groupName}
            </h4>
            <div className="space-y-2">
              {groupPermissions.map(key => (
                <label
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    permissions[key]
                      ? 'border-primary-light bg-primary-light'
                      : 'border-border bg-card'
                  } ${
                    readOnly ? 'cursor-default' : 'cursor-pointer hover:border-border dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={() => handleToggle(key)}
                      disabled={readOnly}
                      className="w-5 h-5 text-primary rounded focus:ring-purple-500 disabled:opacity-50"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {PERMISSION_LABELS[key]}
                      </p>
                      {key === 'viewSensitiveInfo' && (
                        <p className="text-xs text-error">
                          Includes SSN, full insurance details
                        </p>
                      )}
                    </div>
                  </div>
                  {permissions[key] && (
                    <span className="text-primary dark:text-purple-400 text-sm">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-background rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {Object.values(permissions).filter(Boolean).length}
          </span>{' '}
          of {Object.keys(permissions).length} permissions granted
        </p>
      </div>
    </div>
  )
}
