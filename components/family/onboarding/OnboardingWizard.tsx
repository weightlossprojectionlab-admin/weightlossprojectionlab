'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  OnboardingStep,
  type CaregiverProfile,
  type ProfessionalInfo,
  type Availability,
  type CaregiverPreferences,
  createDefaultWeeklySchedule,
  createDefaultCaregiverPreferences
} from '@/types/caregiver-profile'

// Import step components
import { OnboardingProgress } from './OnboardingProgress'
import { WelcomeStep } from './steps/WelcomeStep'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { RoleStep } from './steps/RoleStep'
import { ProfessionalInfoStep } from './steps/ProfessionalInfoStep'
import { AvailabilityStep } from './steps/AvailabilityStep'
import { PreferencesStep } from './steps/PreferencesStep'
import { ReviewStep } from './steps/ReviewStep'

const TOTAL_STEPS = 7

export function OnboardingWizard() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.WELCOME)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Onboarding data state
  const [profileData, setProfileData] = useState<Partial<CaregiverProfile>>({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phoneNumber: '',
    photoUrl: user?.photoURL || undefined,
    isProfessional: false,
    relationshipToPatients: {},
    professionalInfo: undefined,
    availability: undefined,
    preferences: createDefaultCaregiverPreferences(),
    onboardingComplete: false,
    onboardingStep: OnboardingStep.WELCOME,
    accountStatus: 'pending'
  })

  // Load existing profile data on mount
  useEffect(() => {
    if (!user?.uid) return

    const loadProfile = async () => {
      try {
        const profileRef = doc(db, 'caregiver-profiles', user.uid)
        const profileSnap = await getDoc(profileRef)

        if (profileSnap.exists()) {
          const existingData = profileSnap.data() as CaregiverProfile
          setProfileData(existingData)
          setCurrentStep(existingData.onboardingStep || OnboardingStep.WELCOME)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }

    loadProfile()
  }, [user?.uid])

  // Auto-save progress when step changes
  useEffect(() => {
    if (currentStep === OnboardingStep.WELCOME) return // Don't save on welcome

    const saveProgress = async () => {
      if (!user?.uid) return

      setIsSaving(true)
      try {
        const profileRef = doc(db, 'caregiver-profiles', user.uid)
        await setDoc(
          profileRef,
          {
            ...profileData,
            onboardingStep: currentStep,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      } catch (error) {
        console.error('Error saving progress:', error)
      } finally {
        setIsSaving(false)
      }
    }

    const timer = setTimeout(saveProgress, 1000) // Debounce saves
    return () => clearTimeout(timer)
  }, [currentStep, profileData, user?.uid])

  const handleNext = () => {
    // Validation before proceeding
    if (!validateCurrentStep()) {
      return
    }

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (currentStep > OnboardingStep.WELCOME) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSkip = () => {
    // Only allow skipping optional steps
    const skippableSteps = [
      OnboardingStep.PROFESSIONAL,
      OnboardingStep.AVAILABILITY
    ]

    if (skippableSteps.includes(currentStep)) {
      handleNext()
    }
  }

  const handleEditStep = (step: number) => {
    setCurrentStep(step as OnboardingStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case OnboardingStep.BASIC_INFO:
        if (!profileData.displayName?.trim()) {
          toast.error('Please enter your display name')
          return false
        }
        if (!profileData.phoneNumber?.trim()) {
          toast.error('Please enter your phone number')
          return false
        }
        return true

      case OnboardingStep.ROLE:
        if (Object.keys(profileData.relationshipToPatients || {}).length === 0) {
          toast.error('Please select your relationship to at least one patient')
          return false
        }
        return true

      case OnboardingStep.PROFESSIONAL:
        if (profileData.isProfessional) {
          if (!profileData.professionalInfo?.title) {
            toast.error('Please select your professional title')
            return false
          }
        }
        return true

      case OnboardingStep.PREFERENCES:
        if (!profileData.preferences?.languagesSpoken?.length) {
          toast.error('Please select at least one language')
          return false
        }
        if (!profileData.preferences?.preferredContactMethod) {
          toast.error('Please select a preferred contact method')
          return false
        }
        return true

      default:
        return true
    }
  }

  const handleComplete = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to complete onboarding')
      return
    }

    // Final validation
    if (!validateCurrentStep()) {
      return
    }

    setIsSubmitting(true)

    try {
      const profileRef = doc(db, 'caregiver-profiles', user.uid)

      const completeProfile: CaregiverProfile = {
        userId: user.uid,
        displayName: profileData.displayName!,
        email: profileData.email!,
        phoneNumber: profileData.phoneNumber,
        photoUrl: profileData.photoUrl,
        relationshipToPatients: profileData.relationshipToPatients || {},
        isProfessional: profileData.isProfessional || false,
        professionalInfo: profileData.professionalInfo,
        availability: profileData.availability,
        preferences: profileData.preferences || createDefaultCaregiverPreferences(),
        onboardingComplete: true,
        onboardingStep: OnboardingStep.COMPLETE,
        accountStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(profileRef, completeProfile)

      toast.success('Onboarding completed successfully!')

      // Redirect to family dashboard
      setTimeout(() => {
        router.push('/family/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete onboarding. Please try again.')
      setIsSubmitting(false)
    }
  }

  const updateProfileData = (updates: Partial<CaregiverProfile>) => {
    setProfileData((prev) => ({ ...prev, ...updates }))
  }

  const isSkippable =
    currentStep === OnboardingStep.PROFESSIONAL ||
    currentStep === OnboardingStep.AVAILABILITY

  const showBackButton = currentStep > OnboardingStep.WELCOME
  const showNextButton =
    currentStep !== OnboardingStep.WELCOME &&
    currentStep !== OnboardingStep.COMPLETE - 1 // Last step before complete
  const showCompleteButton = currentStep === OnboardingStep.COMPLETE - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Bar */}
        {currentStep !== OnboardingStep.WELCOME && (
          <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        )}

        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Save Indicator */}
          {isSaving && currentStep !== OnboardingStep.WELCOME && (
            <div className="bg-primary/10 border-b border-primary/20 px-6 py-2 text-center">
              <p className="text-sm text-primary">
                Saving progress...
              </p>
            </div>
          )}

          {/* Step Content */}
          <div className="p-8 md:p-12">
            {currentStep === OnboardingStep.WELCOME && (
              <WelcomeStep onGetStarted={handleNext} />
            )}

            {currentStep === OnboardingStep.BASIC_INFO && (
              <BasicInfoStep
                data={{
                  displayName: profileData.displayName || '',
                  phoneNumber: profileData.phoneNumber || '',
                  photoUrl: profileData.photoUrl
                }}
                onChange={(updates) => updateProfileData(updates)}
              />
            )}

            {currentStep === OnboardingStep.ROLE && (
              <RoleStep
                data={{
                  isProfessional: profileData.isProfessional || false,
                  relationshipToPatients: profileData.relationshipToPatients || {}
                }}
                onChange={(updates) => updateProfileData(updates)}
              />
            )}

            {currentStep === OnboardingStep.PROFESSIONAL && profileData.isProfessional && (
              <ProfessionalInfoStep
                data={profileData.professionalInfo}
                onChange={(professionalInfo) => updateProfileData({ professionalInfo })}
              />
            )}

            {currentStep === OnboardingStep.PROFESSIONAL && !profileData.isProfessional && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  This step is only for medical professionals
                </p>
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
                >
                  Continue to Next Step
                </button>
              </div>
            )}

            {currentStep === OnboardingStep.AVAILABILITY && (
              <AvailabilityStep
                data={profileData.availability}
                onChange={(availability) => updateProfileData({ availability })}
              />
            )}

            {currentStep === OnboardingStep.PREFERENCES && (
              <PreferencesStep
                data={profileData.preferences}
                onChange={(preferences) => updateProfileData({ preferences })}
              />
            )}

            {currentStep === OnboardingStep.COMPLETE - 1 && (
              <ReviewStep data={profileData} onEdit={handleEditStep} />
            )}
          </div>

          {/* Navigation Buttons */}
          {currentStep !== OnboardingStep.WELCOME && (
            <div className="px-8 md:px-12 pb-8 flex items-center justify-between gap-4">
              <div className="flex gap-3">
                {showBackButton && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSaving || isSubmitting}
                    className="px-6 py-3 rounded-xl font-medium border-2 border-border hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                )}

                {isSkippable && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSaving || isSubmitting}
                    className="px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Skip for Now
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                {showNextButton && (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving || isSubmitting}
                    className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                )}

                {showCompleteButton && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isSaving || isSubmitting}
                    className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Onboarding</span>
                        <span>🎉</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cancel Link */}
        {currentStep !== OnboardingStep.WELCOME && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/family/dashboard')}
              disabled={isSaving || isSubmitting}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Save and Continue Later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
