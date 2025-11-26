'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { FacePhotoCapture } from '@/components/family/FacePhotoCapture'
import {
  UserMode,
  PrimaryRole,
  OnboardingAnswers,
  FeaturePreference,
  HouseholdType,
  KitchenMode,
  MealLoggingMode,
  AutomationLevel
} from '@/types'

// Import PRD config
import prdConfig from '@/docs/UNIFIED_PRD.json'

interface OnboardingScreen {
  id: string
  question: string
  subtitle?: string
  options: string[]
  optionsByRole?: Record<string, string[]>
  optionDescriptions?: Record<string, string>
  multiSelect?: boolean
  sets: string
  visibleIf?: string
}

export default function OnboardingV2Page() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromInvitation = searchParams.get('from') === 'invitation'

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPhotoCapture, setShowPhotoCapture] = useState(fromInvitation)
  const [photoData, setPhotoData] = useState<any>(null)
  const [pendingApproval, setPendingApproval] = useState(false)
  const [acceptedInvitation, setAcceptedInvitation] = useState<any>(null)

  const screens = prdConfig.onboarding.screens as OnboardingScreen[]

  // Determine user mode from primary role
  function determineUserMode(role: PrimaryRole): UserMode {
    if (role === 'myself') return 'single'
    if (role === 'caregiver') return 'caregiver'
    if (role === 'family') return 'household'
    return 'single' // fallback
  }

  // Check if screen should be visible
  function isScreenVisible(screen: OnboardingScreen): boolean {
    if (!screen.visibleIf) return true

    // Parse simple conditionals
    if (screen.visibleIf === "userMode != 'myself'") {
      const currentMode = answers.userMode
      return currentMode !== 'single'
    }

    return true
  }

  // Get visible screens only
  const visibleScreens = screens.filter(isScreenVisible)
  let currentScreen = visibleScreens[step]

  // Filter options based on role selection (for goals question)
  if (currentScreen?.optionsByRole && answers.role_selection) {
    const selectedRole = answers.role_selection as string
    const roleOptions = currentScreen.optionsByRole[selectedRole]

    if (roleOptions) {
      currentScreen = {
        ...currentScreen,
        options: roleOptions
      }
    }
  }

  const totalSteps = visibleScreens.length

  // Handle answer selection
  function handleAnswer(value: string) {
    const questionId = currentScreen.id

    let updatedAnswers = { ...answers }

    // Handle multi-select
    if (currentScreen.multiSelect) {
      const currentValues = (answers[questionId] as string[]) || []
      if (currentValues.includes(value)) {
        // Remove
        updatedAnswers[questionId] = currentValues.filter((v) => v !== value)
      } else {
        // Add
        updatedAnswers[questionId] = [...currentValues, value]
      }
      setAnswers(updatedAnswers)
      return // Don't auto-advance for multi-select
    }

    // Single select
    updatedAnswers[questionId] = value

    // Auto-determine user mode after role selection
    if (questionId === 'role_selection') {
      const mode = determineUserMode(value as PrimaryRole)
      updatedAnswers.userMode = mode
    }

    setAnswers(updatedAnswers)

    // Auto-advance to next step
    setTimeout(() => {
      setStep(step + 1)
    }, 200)
  }

  // Handle multi-select continue
  function handleMultiSelectContinue() {
    setStep(step + 1)
  }

  // Handle select all for multi-select questions
  function handleSelectAll() {
    const questionId = currentScreen.id
    const allOptions = currentScreen.options
    setAnswers({
      ...answers,
      [questionId]: allOptions
    })
  }

  // Handle deselect all for multi-select questions
  function handleDeselectAll() {
    const questionId = currentScreen.id
    setAnswers({
      ...answers,
      [questionId]: []
    })
  }

  // Complete onboarding
  async function completeOnboarding() {
    if (!user) return

    setIsSubmitting(true)

    try {
      // Parse meal logging preferences
      const loggingPrefs = answers.logging_preference as MealLoggingMode
      const hasReminders = Array.isArray(loggingPrefs)
        ? loggingPrefs.includes('with_reminders')
        : loggingPrefs === 'with_reminders'

      const onboardingData: OnboardingAnswers = {
        userMode: answers.userMode as UserMode,
        primaryRole: answers.role_selection as PrimaryRole,
        featurePreferences: (answers.goals as FeaturePreference[]) || [],
        kitchenMode: answers.food_management as KitchenMode,
        mealLoggingMode: loggingPrefs,
        automationLevel: answers.automation as AutomationLevel,
        addFamilyNow: answers.family_setup === 'yes',
        completedAt: new Date()
      }

      // Save to Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        {
          preferences: {
            onboardingAnswers: onboardingData,
            userMode: onboardingData.userMode,
            notifications: onboardingData.automationLevel === 'yes' || hasReminders
          },
          profile: {
            onboardingCompleted: true,
            onboardingCompletedAt: Timestamp.now()
          }
        },
        { merge: true }
      )

      toast.success('Setup complete! Welcome aboard! 🎉')

      // Redirect based on user mode and choices
      if (onboardingData.addFamilyNow) {
        router.push('/patients/new')
      } else {
        // Get default route from PRD config
        const tabs = prdConfig.onboarding.userModes[onboardingData.userMode].tabs
        const firstTab = tabs[0]

        // Map tab names to routes
        const tabRoutes: Record<string, string> = {
          home: '/dashboard',
          log: '/log-meal',
          kitchen: '/inventory',
          profile: '/profile',
          care_circle: '/patients'
        }

        router.push(tabRoutes[firstTab] || '/dashboard')
      }
    } catch (error) {
      console.error('Error saving onboarding:', error)
      toast.error('Failed to save settings. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Handle back button
  function handleBack() {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  // If we're past the last screen, complete onboarding
  useEffect(() => {
    if (step >= totalSteps && totalSteps > 0 && !isSubmitting) {
      completeOnboarding()
    }
  }, [step, totalSteps, isSubmitting])

  // Handle face photo capture from invitation
  const handlePhotoCapture = async (data: any) => {
    setPhotoData(data)
    setShowPhotoCapture(false)

    try {
      // Save user profile with photo data and mark as pending approval
      const userData: any = {
        email: user!.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        name: `${data.firstName} ${data.lastName}`,
        onboardingComplete: false,
        pendingApproval: true,
        approvalStatus: 'pending',
        invitationOnboarding: true,
        verificationPhotos: {
          front: data.frontPhoto,
          left: data.leftPhoto,
          right: data.rightPhoto,
          capturedAt: Timestamp.now()
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Add optional fields if present
      if (user!.photoURL) userData.photoURL = user!.photoURL
      if (data.dateOfBirth) userData.dateOfBirth = data.dateOfBirth

      await setDoc(doc(db, 'users', user!.uid), userData, { merge: true })

      // Auto-accept invitation if there's a pending invitation code
      const pendingCode = localStorage.getItem('pendingInvitationCode')
      if (pendingCode) {
        try {
          // Verify and accept the invitation
          const verifyResponse = await fetch(`/api/invitations/verify?code=${encodeURIComponent(pendingCode)}`)
          if (verifyResponse.ok) {
            const invitation = await verifyResponse.json()

            // Accept the invitation
            const acceptResponse = await fetch(`/api/invitations/${invitation.id}/accept`, {
              method: 'POST'
            })

            if (acceptResponse.ok) {
              // Clear the pending invitation code
              localStorage.removeItem('pendingInvitationCode')
              // Store invitation data to redirect to patient records after approval
              setAcceptedInvitation(invitation)
              toast.success('Invitation accepted! Photos uploaded.')
            }
          }
        } catch (inviteError) {
          console.error('Error accepting invitation:', inviteError)
          // Don't fail the whole flow if invitation acceptance fails
          toast.success('Photos uploaded! Please accept invitation manually.')
        }
      } else {
        toast.success('Photos uploaded! Waiting for admin approval.')
      }

      setPendingApproval(true)
    } catch (error) {
      console.error('Error saving photo data:', error)
      toast.error('Failed to upload photos. Please try again.')
    }
  }

  // Show pending approval screen if from invitation and photos submitted
  if (pendingApproval) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-lg w-full bg-card rounded-lg border-2 border-border p-8 text-center">
            <div className="w-20 h-20 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-warning-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Pending Admin Approval
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you for submitting your verification photos. An administrator will review and approve your access shortly.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              You'll receive an email notification once your account has been approved.
            </p>
            <button
              onClick={() => {
                // Redirect to patient records if invitation was accepted
                if (acceptedInvitation?.patientsShared && acceptedInvitation.patientsShared.length > 0) {
                  const firstPatientId = acceptedInvitation.patientsShared[0]
                  router.push(`/patients/${firstPatientId}`)
                } else {
                  // Fallback to patients list or dashboard
                  router.push('/patients')
                }
              }}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              {acceptedInvitation ? 'View Patient Records' : 'Go to Dashboard'}
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // Show photo capture for invitation onboarding
  if (showPhotoCapture && fromInvitation) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <FacePhotoCapture
            isOpen={true}
            onComplete={handlePhotoCapture}
            onClose={() => {
              setShowPhotoCapture(false)
              router.push('/dashboard')
            }}
          />
        </div>
      </AuthGuard>
    )
  }

  // Loading state
  if (!currentScreen && !isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Setting up your experience...</div>
        </div>
      </div>
    )
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg">Finalizing your setup...</p>
        </div>
      </div>
    )
  }

  if (!currentScreen) return null

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
        <div className="max-w-xl w-full space-y-8">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {step + 1} of {totalSteps}</span>
              <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
            {/* Question */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {currentScreen.question}
              </h2>
              {currentScreen.subtitle && (
                <p className="text-sm text-muted-foreground mt-2">
                  {currentScreen.subtitle}
                </p>
              )}
            </div>

            {/* Select All / Deselect All buttons for multi-select */}
            {currentScreen.multiSelect && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex-1 px-4 py-2 text-sm font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border-2 border-muted rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {currentScreen.options.map((option) => {
                const isSelected = currentScreen.multiSelect
                  ? (answers[currentScreen.id] as string[] || []).includes(option)
                  : answers[currentScreen.id] === option

                const description = currentScreen.optionDescriptions?.[option]

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`
                      w-full p-5 rounded-xl text-left font-medium transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-2 border-primary shadow-lg scale-[1.02]'
                          : 'bg-accent hover:bg-accent/80 border-2 border-transparent hover:border-primary/30 hover:scale-[1.01]'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="capitalize text-lg font-semibold mb-1">
                          {option.replace(/_/g, ' ')}
                        </div>
                        {description && (
                          <div className="text-sm leading-relaxed text-white/80">
                            {description}
                          </div>
                        )}
                      </div>
                      {isSelected && currentScreen.multiSelect && (
                        <svg
                          className="w-6 h-6 flex-shrink-0 mt-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Multi-select continue button */}
            {currentScreen.multiSelect && (
              <button
                onClick={handleMultiSelectContinue}
                disabled={(answers[currentScreen.id] as string[] || []).length === 0}
                className="w-full mt-6 p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            )}
          </div>

          {/* Back button */}
          {step > 0 && (
            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
