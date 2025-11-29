/**
 * Family Member Invitation Flow
 *
 * Multi-step flow for adding a family member:
 * 1. Basic info (name, DOB, gender, relationship)
 * 2. Age-based caregiver trust confirmation (if 13-17)
 * 3. Set caregiver permissions (if eligible)
 * 4. Send invitation (if they have email) or create profile
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { calculateAge, checkCaregiverEligibility, getTrustPromptMessage, getPermissionLevelDescription } from '@/lib/caregiver-eligibility'
import toast from 'react-hot-toast'

interface FamilyMemberInvitationFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: FamilyMemberFormData) => Promise<void>
  currentSeats: number
  maxSeats: number
}

export interface FamilyMemberFormData {
  name: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | ''
  relationship: 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'pet' | ''
  type: 'human' | 'pet'
  species?: string
  breed?: string
  email?: string
  caregiverEnabled: boolean
  caregiverTrusted: boolean
  caregiverPermissionLevel: 'none' | 'view_only' | 'limited' | 'full'
}

type Step = 'basic_info' | 'trust_confirmation' | 'permissions' | 'email'

export function FamilyMemberInvitationFlow({
  isOpen,
  onClose,
  onComplete,
  currentSeats,
  maxSeats,
}: FamilyMemberInvitationFlowProps) {
  const [step, setStep] = useState<Step>('basic_info')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<FamilyMemberFormData>({
    name: '',
    dateOfBirth: '',
    gender: '',
    relationship: '',
    type: 'human',
    email: '',
    caregiverEnabled: false,
    caregiverTrusted: false,
    caregiverPermissionLevel: 'none',
  })

  if (!isOpen) return null

  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 0
  const eligibility = formData.dateOfBirth && formData.type === 'human'
    ? checkCaregiverEligibility(formData.dateOfBirth, formData.caregiverTrusted)
    : { eligible: false, requiresTrust: false, recommendedPermission: 'none' as const }

  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.dateOfBirth || !formData.relationship) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.type === 'human' && !formData.gender) {
      toast.error('Please select a gender')
      return
    }

    if (formData.type === 'pet' && !formData.species) {
      toast.error('Please enter the species')
      return
    }

    // Check if age-appropriate for trust confirmation
    if (formData.type === 'human' && eligibility.requiresTrust && !eligibility.eligible) {
      // Minor who needs trust approval
      setStep('trust_confirmation')
    } else if (formData.type === 'human' && eligibility.eligible) {
      // Adult or trusted minor - go to permissions
      setFormData(prev => ({
        ...prev,
        caregiverEnabled: true,
        caregiverPermissionLevel: eligibility.recommendedPermission
      }))
      setStep('permissions')
    } else {
      // Pet or child too young - skip to email
      setStep('email')
    }
  }

  const handleTrustConfirmation = (trusted: boolean) => {
    setFormData(prev => ({
      ...prev,
      caregiverTrusted: trusted,
      caregiverEnabled: trusted,
      caregiverPermissionLevel: trusted ? 'limited' : 'none'
    }))

    if (trusted) {
      setStep('permissions')
    } else {
      setStep('email')
    }
  }

  const handlePermissionsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('email')
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onComplete(formData)
      toast.success(`${formData.name} added successfully!`)
      onClose()
      // Reset form
      setFormData({
        name: '',
        dateOfBirth: '',
        gender: '',
        relationship: '',
        type: 'human',
        email: '',
        caregiverEnabled: false,
        caregiverTrusted: false,
        caregiverPermissionLevel: 'none',
      })
      setStep('basic_info')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add family member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === 'trust_confirmation') setStep('basic_info')
    else if (step === 'permissions') setStep(eligibility.requiresTrust ? 'trust_confirmation' : 'basic_info')
    else if (step === 'email') {
      if (formData.caregiverEnabled) setStep('permissions')
      else if (eligibility.requiresTrust) setStep('trust_confirmation')
      else setStep('basic_info')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {step !== 'basic_info' && (
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">Add Family Member</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Seats: {currentSeats + 1} / {maxSeats}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step === 'basic_info' ? '1' : step === 'trust_confirmation' ? '2' : step === 'permissions' ? '3' : '4'}</span>
            <span className="capitalize">{step.replace('_', ' ')}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: step === 'basic_info' ? '25%' : step === 'trust_confirmation' ? '50%' : step === 'permissions' ? '75%' : '100%'
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Basic Info */}
          {step === 'basic_info' && (
            <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Type *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'human', species: '', breed: '' }))}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                        formData.type === 'human'
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      👤 Human
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'pet', gender: '' }))}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                        formData.type === 'pet'
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      🐾 Pet
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={formData.type === 'pet' ? "Pet's name" : "Full name"}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  {formData.dateOfBirth && formData.type === 'human' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Age: {age} years old
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Relationship *
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value as any }))}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="">Select relationship</option>
                    {formData.type === 'human' ? (
                      <>
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="sibling">Sibling</option>
                        <option value="grandparent">Grandparent</option>
                      </>
                    ) : (
                      <option value="pet">Pet</option>
                    )}
                  </select>
                </div>

                {formData.type === 'human' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                      className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                )}

                {formData.type === 'pet' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Species *
                      </label>
                      <input
                        type="text"
                        value={formData.species}
                        onChange={(e) => setFormData(prev => ({ ...prev, species: e.target.value }))}
                        placeholder="Dog, Cat, Bird, etc."
                        className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Breed (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.breed}
                        onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                        placeholder="Golden Retriever, etc."
                        className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Trust Confirmation (for minors 13-17) */}
          {step === 'trust_confirmation' && (
            <div className="space-y-6">
              <div className="bg-warning-light border-2 border-warning-dark rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-foreground mb-2">Caregiver Trust Confirmation</h3>
                <p className="text-muted-foreground">
                  {getTrustPromptMessage(formData.name, age)}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  As a caregiver, {formData.name} will be able to:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-foreground">View sensitive health information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="text-foreground">Log meals, weight, and activities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-foreground">Access medical records and documents</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleTrustConfirmation(true)}
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Yes, I trust {formData.name}
                </button>
                <button
                  onClick={() => handleTrustConfirmation(false)}
                  className="w-full px-6 py-3 border-2 border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  No, not right now
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {step === 'permissions' && (
            <form onSubmit={handlePermissionsSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Set Caregiver Permissions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose what {formData.name} can do as a caregiver
                </p>

                <div className="space-y-3">
                  {(['view_only', 'limited', 'full'] as const).map((level) => {
                    // Check if this level is appropriate for their age
                    const isAppropriate = age >= 18 || (age >= 13 && age <= 17 && level !== 'full')

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => isAppropriate && setFormData(prev => ({ ...prev, caregiverPermissionLevel: level }))}
                        disabled={!isAppropriate}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          formData.caregiverPermissionLevel === level
                            ? 'border-primary bg-primary/5'
                            : isAppropriate
                            ? 'border-border hover:border-primary/50'
                            : 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-foreground capitalize mb-1">{level.replace('_', ' ')}</div>
                            <div className="text-sm text-muted-foreground">{getPermissionLevelDescription(level)}</div>
                            {!isAppropriate && (
                              <div className="text-xs text-warning-dark mt-1">Not recommended for minors</div>
                            )}
                          </div>
                          {formData.caregiverPermissionLevel === level && (
                            <svg className="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Email / Final */}
          {step === 'email' && (
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Almost Done!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Does {formData.name} have an email address to create an account?
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.email
                        ? "We'll send them an invitation email to create their account"
                        : "You can manage their profile without them having an account"}
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <h4 className="font-medium text-foreground mb-2">Summary</h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="text-foreground font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="text-foreground font-medium capitalize">{formData.type}</span>
                    </div>
                    {formData.type === 'human' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Age:</span>
                        <span className="text-foreground font-medium">{age} years old</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Caregiver:</span>
                      <span className="text-foreground font-medium">
                        {formData.caregiverEnabled ? `Yes (${formData.caregiverPermissionLevel})` : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billable Seat:</span>
                      <span className="text-warning-dark font-medium">Yes</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : formData.email ? 'Send Invitation' : 'Add Family Member'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
