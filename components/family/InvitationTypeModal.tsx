/**
 * Invitation Type Modal
 *
 * Allows users to choose between:
 * 1. Adding a Family Member (billable seat, patient profile)
 * 2. Inviting an External Caregiver (access-only, not billable)
 */

'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'

interface InvitationTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectFamilyMember: () => void
  onSelectExternalCaregiver: () => void
  currentSeats: number
  maxSeats: number
  currentExternalCaregivers: number
  maxExternalCaregivers: number
}

export function InvitationTypeModal({
  isOpen,
  onClose,
  onSelectFamilyMember,
  onSelectExternalCaregiver,
  currentSeats,
  maxSeats,
  currentExternalCaregivers,
  maxExternalCaregivers,
}: InvitationTypeModalProps) {
  if (!isOpen) return null

  const canAddFamilyMember = currentSeats < maxSeats
  const canAddExternalCaregiver = currentExternalCaregivers < maxExternalCaregivers

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Add Someone</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose who you'd like to add to your account
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Family Member Option */}
            <button
              onClick={canAddFamilyMember ? onSelectFamilyMember : undefined}
              disabled={!canAddFamilyMember}
              className={`
                p-6 rounded-lg border-2 text-left transition-all
                ${
                  canAddFamilyMember
                    ? 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                    : 'border-border bg-muted/50 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
              <h3 className="text-lg font-bold text-foreground mb-2">Family Member</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a family member to your account. They'll get their own patient profile to track their health.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Get a patient profile</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Can be a caregiver (if age-appropriate)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Track their own health data</span>
                </div>
                <div className="flex items-center gap-2 text-warning-dark">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Counts as a billable seat</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Seats used:</span>
                  <span className={`text-sm font-medium ${currentSeats >= maxSeats ? 'text-error' : 'text-foreground'}`}>
                    {currentSeats} / {maxSeats}
                  </span>
                </div>
                {!canAddFamilyMember && (
                  <p className="text-xs text-error mt-2">
                    You've reached your seat limit. Upgrade your plan to add more family members.
                  </p>
                )}
              </div>
            </button>

            {/* External Caregiver Option */}
            <button
              onClick={canAddExternalCaregiver ? onSelectExternalCaregiver : undefined}
              disabled={!canAddExternalCaregiver}
              className={`
                p-6 rounded-lg border-2 text-left transition-all
                ${
                  canAddExternalCaregiver
                    ? 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                    : 'border-border bg-muted/50 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="text-4xl mb-3">🩺</div>
              <h3 className="text-lg font-bold text-foreground mb-2">External Caregiver</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Invite a professional caregiver (nurse, doctor, aide) to access patient records.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Access-only permissions</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Can view/manage assigned patients</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Optional access expiration</span>
                </div>
                <div className="flex items-center gap-2 text-success-dark">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Not billable (free)</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Caregivers:</span>
                  <span className={`text-sm font-medium ${currentExternalCaregivers >= maxExternalCaregivers ? 'text-error' : 'text-foreground'}`}>
                    {currentExternalCaregivers} / {maxExternalCaregivers}
                  </span>
                </div>
                {!canAddExternalCaregiver && (
                  <p className="text-xs text-error mt-2">
                    You've reached your external caregiver limit. Upgrade your plan to add more.
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">Not sure which to choose?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Choose <strong>Family Member</strong> for spouse, children, parents, siblings, grandparents, or pets</li>
              <li>• Choose <strong>External Caregiver</strong> for nurses, doctors, home health aides, or therapists</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
