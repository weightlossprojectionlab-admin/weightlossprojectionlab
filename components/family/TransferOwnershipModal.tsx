/**
 * Transfer Ownership Modal Component
 *
 * Modal for transferring Account Owner role to another family member
 * - Shows current Account Owner
 * - Select new Account Owner from eligible family members
 * - Warning message about irreversibility
 * - Requires typing "TRANSFER" to confirm
 * - Calls transferOwnership() function
 */

'use client'

import { useState, useEffect } from 'react'
import type { FamilyMember } from '@/types/medical'
import { ROLE_LABELS } from '@/lib/family-roles'
import toast from 'react-hot-toast'

interface TransferOwnershipModalProps {
  isOpen: boolean
  onClose: () => void
  currentOwner: FamilyMember
  familyMembers: FamilyMember[]
  onTransfer: (newOwnerId: string) => Promise<void>
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  currentOwner,
  familyMembers,
  onTransfer
}: TransferOwnershipModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [confirmationText, setConfirmationText] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMemberId('')
      setConfirmationText('')
      setLoading(false)
      setStep('select')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filter eligible members (accepted family members, excluding current owner)
  const eligibleMembers = familyMembers.filter(
    (member) =>
      member.status === 'accepted' &&
      member.id !== currentOwner.id &&
      member.familyRole !== 'account_owner'
  )

  const selectedMember = eligibleMembers.find((m) => m.id === selectedMemberId)
  const isConfirmationValid = confirmationText.toUpperCase() === 'TRANSFER'

  const handleNext = () => {
    if (!selectedMemberId) {
      toast.error('Please select a family member')
      return
    }
    setStep('confirm')
  }

  const handleBack = () => {
    setStep('select')
    setConfirmationText('')
  }

  const handleTransfer = async () => {
    if (!isConfirmationValid) {
      toast.error('Please type TRANSFER to confirm')
      return
    }

    setLoading(true)
    try {
      await onTransfer(selectedMemberId)
      toast.success('Ownership transferred successfully')
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer ownership')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Transfer Account Ownership
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className={`flex-1 h-2 rounded-full ${
                step === 'select' ? 'bg-primary' : 'bg-primary'
              }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${
                step === 'confirm' ? 'bg-primary' : 'bg-muted'
              }`}
            />
          </div>

          {/* Current Owner Info */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              {currentOwner.photo ? (
                <img
                  src={currentOwner.photo}
                  alt={currentOwner.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {currentOwner.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {currentOwner.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full">
                    Current Owner
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{currentOwner.email}</p>
              </div>
            </div>
          </div>

          {/* Step 1: Select New Owner */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select New Account Owner
                </label>

                {eligibleMembers.length === 0 ? (
                  <div className="bg-error-light border-2 border-error rounded-lg p-4">
                    <p className="text-sm text-error-dark">
                      No eligible family members found. You need at least one accepted family member to transfer ownership.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {eligibleMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          selectedMemberId === member.id
                            ? 'border-primary bg-primary-light'
                            : 'border-border hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {member.name}
                              </span>
                              {member.familyRole && (
                                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                                  {ROLE_LABELS[member.familyRole]}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          {selectedMemberId === member.id && (
                            <span className="text-primary text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="bg-warning-light border-2 border-warning rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-warning-dark text-lg flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-warning-dark dark:text-yellow-300 mb-1">
                      Important Information
                    </p>
                    <ul className="text-xs text-warning-dark dark:text-yellow-200 space-y-1">
                      <li>• The new owner will have full control over the family account</li>
                      <li>• You will become a Co-Admin with elevated privileges</li>
                      <li>• This action cannot be easily reversed</li>
                      <li>• Only transfer ownership to someone you fully trust</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedMemberId || eligibleMembers.length === 0}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirm Transfer */}
          {step === 'confirm' && selectedMember && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-background rounded-lg border-2 border-border p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  You are about to transfer ownership to:
                </p>
                <div className="flex items-center gap-3">
                  {selectedMember.photo ? (
                    <img
                      src={selectedMember.photo}
                      alt={selectedMember.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                      <span className="text-primary font-semibold text-lg">
                        {selectedMember.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  </div>
                </div>
              </div>

              {/* Critical Warning */}
              <div className="bg-error-light border-2 border-error rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-error-dark text-xl flex-shrink-0">🚨</span>
                  <div>
                    <p className="text-sm font-bold text-error-dark mb-2">
                      This Action Cannot Be Undone!
                    </p>
                    <ul className="text-xs text-error-dark space-y-1">
                      <li>• {selectedMember.name} will become the new Account Owner</li>
                      <li>• You will no longer have full ownership privileges</li>
                      <li>• Only the new owner can transfer ownership back to you</li>
                      <li>• All patient data and settings will remain under their control</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Confirmation Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type <span className="font-bold text-error">TRANSFER</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-error focus:ring-2 focus:ring-red-500/20 font-mono"
                  placeholder="Type TRANSFER"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={!isConfirmationValid || loading}
                  className="flex-1 px-4 py-3 bg-error text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Transferring...' : 'Transfer Ownership'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
