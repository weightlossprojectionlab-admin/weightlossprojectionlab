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
    'Medical Records': [
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
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Quick Presets
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handlePreset('VIEW_ONLY')}
              className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              View Only
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LIMITED_EDIT')}
              className="px-3 py-2 text-sm bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              Limited Edit
            </button>
            <button
              type="button"
              onClick={() => handlePreset('CAREGIVER')}
              className="px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              Caregiver
            </button>
            <button
              type="button"
              onClick={() => handlePreset('FULL_ACCESS')}
              className="px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
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
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {groupName}
            </h4>
            <div className="space-y-2">
              {groupPermissions.map(key => (
                <label
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    permissions[key]
                      ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  } ${
                    readOnly ? 'cursor-default' : 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={() => handleToggle(key)}
                      disabled={readOnly}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {PERMISSION_LABELS[key]}
                      </p>
                      {key === 'viewSensitiveInfo' && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Includes SSN, full insurance details
                        </p>
                      )}
                    </div>
                  </div>
                  {permissions[key] && (
                    <span className="text-purple-600 dark:text-purple-400 text-sm">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Object.values(permissions).filter(Boolean).length}
          </span>{' '}
          of {Object.keys(permissions).length} permissions granted
        </p>
      </div>
    </div>
  )
}
