/**
 * Family Invitation Modal
 *
 * Modal component for inviting family members to access patient records
 * Includes permission selection with presets and patient selection
 */

'use client'

import { useState } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { useInvitations } from '@/hooks/useInvitations'
import { PERMISSION_PRESETS, PERMISSION_LABELS, getSensitivePermissionWarnings } from '@/lib/family-permissions'
import type { FamilyMemberPermissions, PatientProfile } from '@/types/medical'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
}

type PermissionPreset = 'FULL_ACCESS' | 'VIEW_ONLY' | 'LIMITED_EDIT' | 'CAREGIVER' | 'CUSTOM'

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { patients } = usePatients()
  const { sendInvitation } = useInvitations(false)

  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [selectedPatients, setSelectedPatients] = useState<string[]>([])
  const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>('VIEW_ONLY')
  const [customPermissions, setCustomPermissions] = useState<FamilyMemberPermissions>(
    PERMISSION_PRESETS.VIEW_ONLY
  )
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handlePresetChange = (preset: PermissionPreset) => {
    setPermissionPreset(preset)
    if (preset !== 'CUSTOM') {
      setCustomPermissions(PERMISSION_PRESETS[preset])
    }
  }

  const handlePermissionToggle = (key: keyof FamilyMemberPermissions) => {
    setPermissionPreset('CUSTOM')
    setCustomPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const togglePatient = (patientId: string) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedPatients.length === 0) {
      return
    }

    setLoading(true)
    try {
      await sendInvitation({
        recipientEmail,
        recipientPhone: recipientPhone || undefined,
        patientsShared: selectedPatients,
        permissions: customPermissions,
        message: message || undefined
      })

      // Reset form
      setRecipientEmail('')
      setRecipientPhone('')
      setSelectedPatients([])
      setPermissionPreset('VIEW_ONLY')
      setCustomPermissions(PERMISSION_PRESETS.VIEW_ONLY)
      setMessage('')
      onClose()
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false)
    }
  }

  const activePermissions = permissionPreset === 'CUSTOM' ? customPermissions : PERMISSION_PRESETS[permissionPreset]
  const warnings = getSensitivePermissionWarnings(activePermissions)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invite Family Member
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                placeholder="family.member@example.com"
              />
            </div>

            {/* Phone (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Family Members to Share *
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {patients.map(patient => (
                  <label
                    key={patient.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(patient.id)}
                      onChange={() => togglePatient(patient.id)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">
                      {patient.name} ({patient.relationship})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Permission Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permission Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handlePresetChange('VIEW_ONLY')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'VIEW_ONLY'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  View Only
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('LIMITED_EDIT')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'LIMITED_EDIT'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  Limited Edit
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('CAREGIVER')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'CAREGIVER'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  Caregiver
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('FULL_ACCESS')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'FULL_ACCESS'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  Full Access
                </button>
              </div>
            </div>

            {/* Custom Permissions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Detailed Permissions
                </label>
                {permissionPreset === 'CUSTOM' && (
                  <span className="text-xs text-purple-600 dark:text-purple-400">Custom</span>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={activePermissions[key as keyof FamilyMemberPermissions]}
                      onChange={() => handlePermissionToggle(key as keyof FamilyMemberPermissions)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                  ⚠️ Security Warning
                </p>
                <ul className="space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-yellow-700 dark:text-yellow-400">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Personal Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                placeholder="Add a personal note to your invitation..."
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || selectedPatients.length === 0}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
