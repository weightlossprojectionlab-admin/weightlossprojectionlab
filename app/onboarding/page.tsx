'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createSelfPatient, findSelfPatientId, deriveDisplayName } from '@/lib/self-patient'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { FacePhotoCapture } from '@/components/family/FacePhotoCapture'
import { PlanRecommendation } from '@/components/onboarding/PlanRecommendation'
import { canAccessFeature } from '@/lib/feature-gates'
import { shouldShowUpgradePrompt, getRecommendedPlan } from '@/lib/onboarding-router'
import { getOrAssignVariant, logExperimentImpression, logExperimentConversion } from '@/lib/ab-testing'
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackUpgradePromptShown,
  trackUpgradeInitiated,
  trackUpgradeDeclined,
  trackOnboardingCompleted,
  identifyUser,
  ConversionFunnel
} from '@/lib/analytics-tracking'
import {
  UserMode,
  PrimaryRole,
  OnboardingAnswers,
  FeaturePreference,
  HouseholdType,
  KitchenMode,
  MealLoggingMode,
  AutomationLevel,
  SubscriptionPlan
} from '@/types'

// Import PRD config
import prdConfig from '@/docs/UNIFIED_PRD.json'

import { getCSRFToken } from '@/lib/csrf'
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
  /** When set to 'text', renders a single text input instead of an
   *  option list. The submitted value flows through `handleTextAnswer`.
   *  Default (undefined) keeps the existing options behavior so all
   *  pre-existing screens are unaffected. Added 2026-05-23 for the
   *  household-identity screen in the onboarding rethink. */
  inputType?: 'options' | 'text'
  /** Placeholder for text-input screens. */
  placeholder?: string
  /** Max length for text-input answers. Defaults to 100. */
  maxLength?: number
}

// Map onboarding goals to gated features for subscription filtering
const GOAL_TO_FEATURE_MAP: Record<string, string[]> = {
  'health_medical': ['appointments', 'medications', 'medical-records', 'vitals-tracking'],
  'caregiving': ['multiple-patients', 'patient-management'],
}

export default function OnboardingV2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const { user } = useAuth()
  const { subscription } = useSubscription()
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
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [blockedFeatures, setBlockedFeatures] = useState<string[]>([])
  const [recommendedPlan, setRecommendedPlan] = useState<SubscriptionPlan | null>(null)
  const [onboardingStartTime, setOnboardingStartTime] = useState<number | null>(null)
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now())
  const [sawUpgradePrompt, setSawUpgradePrompt] = useState(false)

  const screens = prdConfig.onboarding.screens as unknown as OnboardingScreen[]

  // Pre-fill the user_identity form from Firebase Auth's displayName
  // (set by OAuth signups, sometimes by email/password signups). Auth
  // gives a single string ("Percy Rice") — we split on whitespace and
  // map tokens to firstName / middleName / lastName the same way the
  // PatientNameEditor on the detail page does:
  //   1 token  → firstName
  //   2 tokens → firstName + lastName
  //   3 tokens → firstName + middleName + lastName
  //   4+ tokens → firstName + middleName(joined middles) + lastName
  // Nickname suggestion is the firstName. Display preference defaults
  // to 'nickname' (per memory/project_patient_name_model). Only seeds
  // once when they land on onboarding; doesn't overwrite later edits.
  useEffect(() => {
    if (user?.displayName && !answers.user_identity) {
      const tokens = user.displayName.trim().split(/\s+/).filter(Boolean)
      let firstName = ''
      let middleName = ''
      let lastName = ''
      if (tokens.length === 1) {
        firstName = tokens[0]
      } else if (tokens.length === 2) {
        firstName = tokens[0]
        lastName = tokens[1]
      } else if (tokens.length >= 3) {
        firstName = tokens[0]
        lastName = tokens[tokens.length - 1]
        middleName = tokens.slice(1, -1).join(' ')
      }
      setAnswers((prev) => ({
        ...prev,
        user_identity: {
          firstName,
          middleName,
          lastName,
          nickname: firstName,
          displayPreference: 'nickname',
        },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.displayName])

  // Track onboarding started on mount
  useEffect(() => {
    if (user && !onboardingStartTime && !fromInvitation) {
      setOnboardingStartTime(Date.now())
      identifyUser(user)
      trackOnboardingStarted({
        userId: user.uid,
        entryPoint: 'signup',
        currentPlan: subscription?.plan || 'free',
        hasExistingData: false,
      })
    }
  }, [user, onboardingStartTime, fromInvitation, subscription])

  // Determine user mode from primary role
  function determineUserMode(role: PrimaryRole): UserMode {
    if (role === 'myself') return 'single'
    if (role === 'family') return 'household'
    return 'single' // fallback
  }

  // Check if screen should be visible
  function isScreenVisible(screen: OnboardingScreen): boolean {
    if (!screen.visibleIf) return true

    // Parse simple conditionals. Keep this minimal — string match
    // against known forms rather than a real expression evaluator.
    // userMode values map from role_selection via determineUserMode:
    //   role 'myself' → mode 'single'
    //   role 'family' → mode 'household'
    if (screen.visibleIf === "userMode != 'myself'") {
      return answers.userMode !== 'single'
    }
    if (screen.visibleIf === "userMode === 'household'") {
      return answers.userMode === 'household'
    }

    return true
  }

  // Get visible screens only
  const visibleScreens = screens.filter(isScreenVisible)
  let currentScreen = visibleScreens[step]

  // Filter options based on role AND subscription (for goals question)
  if (currentScreen?.id === 'goals' && answers.role_selection) {
    const selectedRole = answers.role_selection as string
    const roleOptions = currentScreen.optionsByRole?.[selectedRole] || currentScreen.options

    // Further filter by subscription - only show goals user has access to
    const accessibleGoals = roleOptions.filter(goal => {
      const requiredFeatures = GOAL_TO_FEATURE_MAP[goal]

      // If goal doesn't map to a gated feature, it's always accessible (e.g., weight_loss, meal_planning)
      if (!requiredFeatures || requiredFeatures.length === 0) {
        return true
      }

      // Check if user has access to at least one required feature
      // Since we have subscription from hook, check feature access directly
      if (!subscription || subscription.status === 'expired' || subscription.status === 'canceled') {
        return false
      }

      return requiredFeatures.some(feature => {
        // Import PLAN_FEATURES from feature-gates if needed, or default to accessible
        // For now, allow all features during onboarding
        return true
      })
    })

    currentScreen = {
      ...currentScreen,
      options: accessibleGoals
    }
  } else if (currentScreen?.optionsByRole && answers.role_selection) {
    // For non-goals questions, keep existing role-based filtering
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

    // Track step completion for single-select
    if (user) {
      const timeSpent = Date.now() - stepStartTime
      trackOnboardingStepCompleted({
        userId: user.uid,
        step: questionId as any,
        stepNumber: step,
        totalSteps: visibleScreens.length,
        progressPercentage: Math.round(((step + 1) / visibleScreens.length) * 100),
        answer: value,
        timeSpent,
      })
      setStepStartTime(Date.now())
    }

    // Auto-advance to next step
    setTimeout(() => {
      setStep(step + 1)
    }, 200)
  }

  // Handle text-input screen submission. Like single-select, but the
  // value comes from a controlled <input> rather than a button. Empty
  // strings are blocked at the UI (Continue is disabled) so we trust
  // the value here.
  function handleTextAnswer(value: string) {
    const questionId = currentScreen.id
    const trimmed = value.trim()
    const updatedAnswers = { ...answers, [questionId]: trimmed }
    setAnswers(updatedAnswers)

    if (user) {
      const timeSpent = Date.now() - stepStartTime
      trackOnboardingStepCompleted({
        userId: user.uid,
        step: questionId as any,
        stepNumber: step,
        totalSteps: visibleScreens.length,
        progressPercentage: Math.round(((step + 1) / visibleScreens.length) * 100),
        answer: trimmed,
        timeSpent,
      })
      setStepStartTime(Date.now())
    }

    setStep(step + 1)
  }

  // Handle multi-select continue
  function handleMultiSelectContinue() {
    // Special handling for goals question
    if (currentScreen.id === 'goals') {
      const selectedGoals = (answers.goals as string[]) || []
      const { needsUpgrade, blockedFeatures: blocked } = shouldShowUpgradePrompt(
        selectedGoals,
        user,
        subscription
      )

      if (needsUpgrade && blocked.length > 0 && user) {
        // Check A/B test variant
        const variant = getOrAssignVariant('onboarding-upgrade-prompt', user.uid)

        // Log that user saw the experiment
        logExperimentImpression(
          'onboarding-upgrade-prompt',
          variant,
          user.uid,
          {
            selectedGoals,
            blockedFeatures: blocked,
            currentPlan: subscription?.plan || 'free',
          }
        )

        // Only show upgrade prompt if user is in TEST variant
        if (variant === 'test') {
          // Get recommended plan
          const recommended = getRecommendedPlan(
            blocked,
            subscription?.plan || 'free'
          )

          if (recommended) {
            // Track upgrade prompt shown
            trackUpgradePromptShown({
              userId: user.uid,
              currentPlan: subscription?.plan || 'free',
              recommendedPlan: recommended,
              blockedFeatures: blocked,
              selectedGoals,
              abTestVariant: 'test',
            })

            setSawUpgradePrompt(true)
            setBlockedFeatures(blocked)
            setRecommendedPlan(recommended)
            setShowUpgradePrompt(true)
            return // Don't advance step yet
          }
        } else {
          // CONTROL variant: Filter out blocked features silently
          const accessibleGoals = selectedGoals.filter(
            goal => !blocked.includes(goal)
          )
          setAnswers({
            ...answers,
            goals: accessibleGoals
          })
        }
      }
    }

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

      // Filter goals to only include features user has access to
      const selectedGoals = (answers.goals as FeaturePreference[]) || []
      const accessibleGoals = selectedGoals.filter(goal => {
        const requiredFeatures = GOAL_TO_FEATURE_MAP[goal]

        // If goal doesn't map to a gated feature, allow it
        if (!requiredFeatures || requiredFeatures.length === 0) {
          return true
        }

        // Only save goals user has subscription access to
        // If no valid subscription, block premium features
        if (!subscription || subscription.status === 'expired' || subscription.status === 'canceled') {
          return false
        }

        // Allow all goals during onboarding - upgrade prompt handles restrictions
        return true
      })

      const onboardingData: OnboardingAnswers = {
        userMode: answers.userMode as UserMode,
        primaryRole: answers.role_selection as PrimaryRole,
        featurePreferences: accessibleGoals,
        kitchenMode: answers.food_management as KitchenMode,
        mealLoggingMode: loggingPrefs,
        automationLevel: answers.automation as AutomationLevel,
        addFamilyNow: answers.family_setup === 'yes',
        completedAt: new Date()
      }

      // Identity fields (Phase 1 + 2.1, 2026-05-23). user_identity is
      // structured { firstName, middleName, lastName, nickname,
      // displaySource } — the displaySource is which of three buckets
      // the user picked as their everyday display name:
      //   'auth'     → use Firebase Auth displayName (stored as nickname
      //                so the existing display logic renders it without
      //                expanding the displayPreference enum)
      //   'legal'    → use the composed First Middle Last
      //   'nickname' → use the typed nickname
      // householdName stays on user.profile until Phase 2.2 graduates
      // it to a proper Household record.
      const identityAnswer = (answers.user_identity as
        | {
            firstName?: string
            middleName?: string
            lastName?: string
            nickname?: string
            displaySource?: 'auth' | 'legal' | 'nickname'
          }
        | undefined) ?? {}
      const formFirstName = identityAnswer.firstName?.trim() || undefined
      const formMiddleName = identityAnswer.middleName?.trim() || undefined
      const formLastName = identityAnswer.lastName?.trim() || undefined
      const formNickname = identityAnswer.nickname?.trim() || undefined
      const composedLegalName = [formFirstName, formMiddleName, formLastName].filter(Boolean).join(' ') || undefined
      const displaySource: 'auth' | 'legal' | 'nickname' = identityAnswer.displaySource ?? 'nickname'
      const authDisplayName = user.displayName?.trim() || undefined

      // Resolve the values to persist based on displaySource:
      //   - When 'auth': use auth.displayName as both the canonical
      //     name and the nickname; everyday-display renders the
      //     nickname. Legal name parts from the form (if any) are
      //     still stored but `name` ends up = authDisplayName.
      //   - When 'legal': composed legal name + form nickname (if any).
      //   - When 'nickname': composed legal name (if any) + form
      //     nickname is the everyday display.
      // The Patient's stored displayPreference is 'legal' or 'nickname'
      // (the existing enum) — 'auth' collapses to 'nickname' since
      // we stored the auth name in the nickname field.
      let resolvedFirstName: string | undefined
      let resolvedMiddleName: string | undefined
      let resolvedLastName: string | undefined
      let resolvedNickname: string | undefined
      let resolvedDisplayPreference: 'legal' | 'nickname'
      if (displaySource === 'auth' && authDisplayName) {
        resolvedFirstName = formFirstName
        resolvedMiddleName = formMiddleName
        resolvedLastName = formLastName
        resolvedNickname = authDisplayName
        resolvedDisplayPreference = 'nickname'
      } else if (displaySource === 'legal') {
        resolvedFirstName = formFirstName
        resolvedMiddleName = formMiddleName
        resolvedLastName = formLastName
        resolvedNickname = formNickname
        resolvedDisplayPreference = 'legal'
      } else {
        // displaySource === 'nickname' (default + fallback)
        resolvedFirstName = formFirstName
        resolvedMiddleName = formMiddleName
        resolvedLastName = formLastName
        resolvedNickname = formNickname
        resolvedDisplayPreference = 'nickname'
      }
      const resolvedComposedLegalName =
        [resolvedFirstName, resolvedMiddleName, resolvedLastName].filter(Boolean).join(' ') || undefined

      const rawHouseholdName = (answers.household_identity as string | undefined)?.trim()
      const householdName = rawHouseholdName && rawHouseholdName.length > 0 ? rawHouseholdName : undefined

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
            onboardingCompletedAt: Timestamp.now(),
            ...(resolvedFirstName ? { firstName: resolvedFirstName } : {}),
            ...(resolvedMiddleName ? { middleName: resolvedMiddleName } : {}),
            ...(resolvedLastName ? { lastName: resolvedLastName } : {}),
            ...(resolvedComposedLegalName ? { fullName: resolvedComposedLegalName } : {}),
            ...(resolvedNickname ? { nickname: resolvedNickname } : {}),
            ...((resolvedComposedLegalName || resolvedNickname) ? { displayPreference: resolvedDisplayPreference } : {}),
            // displaySource captured for analytics / audit — the
            // user's stated intent. Resolved displayPreference above
            // is what consumer surfaces actually consume.
            identityDisplaySource: displaySource,
            ...(householdName ? { householdName } : {}),
          }
        },
        { merge: true }
      )

      // Onboarding rethink Phase 1 (2026-05-23): the account holder
      // is themselves a Patient in their own household. Create the
      // self-Patient stub here so vitals/meals/meds for the account
      // holder flow through the same patient infrastructure as
      // family members. DOB/gender/etc. are deferred — the patient
      // detail page's Info-tab editor handles completion via the
      // `requiresProfileCompletion: true` flag on the stub. See
      // memory/project_family_tree_ml (chosen-identity/role-based
      // household model). Idempotent: if a self-Patient already
      // exists (e.g., user re-runs onboarding, or migration script
      // already created one), we skip creation.
      try {
        const existingSelfPatientId = await findSelfPatientId(user.uid, db)
        if (!existingSelfPatientId) {
          // The Patient mirrors the user.profile identity above. Name
          // resolution follows the displaySource the user picked:
          //   - 'auth': `name` falls back to authDisplayName, parts
          //     stay as the form-typed values (may be empty), nickname
          //     holds the auth name so it renders everyday.
          //   - 'legal': `name` = composed legal name; parts stored.
          //   - 'nickname': `name` = composed legal OR nickname; parts
          //     stored if present.
          // Email-derived fallback only kicks in if Auth has no
          // displayName and the user filled nothing in either.
          let patientName: string
          if (displaySource === 'auth' && authDisplayName) {
            patientName = authDisplayName
          } else if (resolvedComposedLegalName) {
            patientName = resolvedComposedLegalName
          } else if (resolvedNickname) {
            patientName = resolvedNickname
          } else {
            patientName = deriveDisplayName(user.displayName, user.email)
          }
          const { patientId } = await createSelfPatient({
            userId: user.uid,
            displayName: patientName,
            firstName: resolvedFirstName,
            middleName: resolvedMiddleName,
            lastName: resolvedLastName,
            nickname: resolvedNickname,
            displayPreference: resolvedNickname || resolvedComposedLegalName ? resolvedDisplayPreference : undefined,
            db,
          })
          logger.info('[Onboarding] Self-Patient created', {
            userId: user.uid,
            patientId,
            patientName,
            displaySource,
            displayPreference: resolvedDisplayPreference,
          })
        }
      } catch (err) {
        // Non-fatal: if self-Patient creation fails, log it and let
        // the user finish onboarding. Migration script can backfill
        // later. We don't want this to block someone from completing
        // signup. The risk is small (just a stub doc) and recoverable.
        logger.error('[Onboarding] Self-Patient creation failed (non-fatal)', err as Error)
      }

      // Track onboarding completion
      if (onboardingStartTime) {
        const totalTimeSpent = Date.now() - onboardingStartTime
        trackOnboardingCompleted({
          userId: user.uid,
          userMode: onboardingData.userMode,
          selectedGoals: onboardingData.featurePreferences,
          finalPlan: subscription?.plan || 'free',
          totalTimeSpent,
          stepsCompleted: visibleScreens.length,
          sawUpgradePrompt,
          upgradedDuringOnboarding: false, // Would need webhook to detect actual upgrade
        })
      }

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
      if (data.gender) userData.gender = data.gender

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

  // Show upgrade prompt if needed
  if (showUpgradePrompt && recommendedPlan && blockedFeatures.length > 0) {
    return (
      <AuthGuard>
        <PlanRecommendation
          currentPlan={subscription?.plan || 'free'}
          recommendedPlan={recommendedPlan}
          selectedFeatures={blockedFeatures}
          onContinueWithoutUpgrade={() => {
            // Log conversion: user declined upgrade
            if (user) {
              const variant = getOrAssignVariant('onboarding-upgrade-prompt', user.uid)
              logExperimentConversion(
                'onboarding-upgrade-prompt',
                variant,
                user.uid,
                'declined_upgrade',
                {
                  blockedFeatures,
                  recommendedPlan,
                  currentPlan: subscription?.plan || 'free',
                }
              )
              trackUpgradeDeclined(
                user.uid,
                subscription?.plan || 'free',
                recommendedPlan,
                'user_declined'
              )
            }

            // Filter out blocked features from answers
            const accessibleGoals = (answers.goals as string[]).filter(
              goal => !blockedFeatures.includes(goal)
            )
            setAnswers({
              ...answers,
              goals: accessibleGoals
            })
            setShowUpgradePrompt(false)
            setStep(step + 1)
          }}
          onUpgradeSuccess={() => {
            // Log conversion: user initiated upgrade checkout
            if (user) {
              const variant = getOrAssignVariant('onboarding-upgrade-prompt', user.uid)
              logExperimentConversion(
                'onboarding-upgrade-prompt',
                variant,
                user.uid,
                'initiated_upgrade',
                {
                  blockedFeatures,
                  recommendedPlan,
                  currentPlan: subscription?.plan || 'free',
                }
              )
              trackUpgradeInitiated({
                userId: user.uid,
                fromPlan: subscription?.plan || 'free',
                toPlan: recommendedPlan,
                billingInterval: 'monthly', // Default, can be updated
                source: 'onboarding',
                abTestVariant: 'test',
              })
            }

            // After successful upgrade, continue with all selected features
            setShowUpgradePrompt(false)
            setStep(step + 1)
          }}
        />
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

  // Show selected wellness pillars if goals have been selected
  const selectedGoals = answers.goals as string[] | undefined
  const showSelectedPillars = selectedGoals && selectedGoals.length > 0 && step > visibleScreens.findIndex(s => s.id === 'goals')

  const pillarEmojis: Record<string, string> = {
    'body_fitness': '💪',
    'nutrition_kitchen': '🍎',
    'health_medical': '💊'
  }

  const pillarLabels: Record<string, string> = {
    'body_fitness': 'Body & Fitness',
    'nutrition_kitchen': 'Nutrition & Kitchen',
    'health_medical': 'Health & Medical'
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
        <div className="max-w-xl w-full space-y-8">
          {/* Selected Wellness Pillars - Show after goals step */}
          {showSelectedPillars && (
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-2 text-center font-medium">Your Wellness Focus:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {selectedGoals.map((goal: string) => (
                  <div
                    key={goal}
                    className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border shadow-sm"
                  >
                    <span className="text-lg">{pillarEmojis[goal] || '✨'}</span>
                    <span className="text-sm font-medium">{pillarLabels[goal] || goal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

            {/* Text input screen — alternative to options for free-text
                questions like the household name. Rendered instead of
                the option list when inputType === 'text'. */}
            {currentScreen.inputType === 'text' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={(answers[currentScreen.id] as string) || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentScreen.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (answers[currentScreen.id] as string) || ''
                      if (value.trim().length > 0) {
                        handleTextAnswer(value)
                      }
                    }
                  }}
                  placeholder={currentScreen.placeholder ?? ''}
                  maxLength={currentScreen.maxLength ?? 100}
                  autoFocus
                  className="w-full p-5 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none text-lg font-medium transition-colors"
                />
                <button
                  onClick={() => handleTextAnswer((answers[currentScreen.id] as string) || '')}
                  disabled={!((answers[currentScreen.id] as string) || '').trim()}
                  className="w-full p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : currentScreen.inputType === 'identity' ? (
              /* Identity form — First/Middle/Last name + Nickname.
                 Three-way preferred-name selector at the bottom:
                 Auth | Full Name | Nickname — user picks which
                 source drives their everyday-display name. Auth is
                 a one-tap "use my sign-in name" shortcut (stored as
                 the nickname so existing display logic renders it).
                 Mirrors the PatientNameEditor shape from the patient
                 detail page (memory/project_patient_name_model). */
              (() => {
                const identity = (answers[currentScreen.id] as
                  | {
                      firstName?: string
                      middleName?: string
                      lastName?: string
                      nickname?: string
                      displaySource?: 'auth' | 'legal' | 'nickname'
                    }
                  | undefined) ?? {}
                const firstName = identity.firstName ?? ''
                const middleName = identity.middleName ?? ''
                const lastName = identity.lastName ?? ''
                const nickname = identity.nickname ?? ''
                const displaySource = identity.displaySource ?? 'nickname'
                const computedLegalPreview = [firstName, middleName, lastName]
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .join(' ')
                const authName = user?.displayName?.trim() ?? ''
                // Continue gate: the user must have SOMETHING usable
                // for the chosen source. Auth needs a non-empty auth
                // displayName; Legal needs at least first+last;
                // Nickname needs a non-empty nickname.
                const canContinue =
                  (displaySource === 'auth' && authName.length > 0) ||
                  (displaySource === 'legal' &&
                    firstName.trim().length > 0 &&
                    lastName.trim().length > 0) ||
                  (displaySource === 'nickname' && nickname.trim().length > 0)
                const updateIdentity = (patch: Partial<typeof identity>) =>
                  setAnswers({ ...answers, [currentScreen.id]: { ...identity, ...patch } })
                return (
                  <div className="space-y-5">
                    {/* Legal name (First / Middle / Last) */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-foreground">
                        Legal Name
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (formal surfaces: medical records, audit log)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            First {displaySource === 'legal' && <span className="text-primary">*</span>}
                          </label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => updateIdentity({ firstName: e.target.value })}
                            placeholder="Percy"
                            maxLength={60}
                            className="w-full p-3 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            Middle <span className="opacity-70">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={middleName}
                            onChange={(e) => updateIdentity({ middleName: e.target.value })}
                            placeholder=""
                            maxLength={60}
                            className="w-full p-3 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            Last {displaySource === 'legal' && <span className="text-primary">*</span>}
                          </label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => updateIdentity({ lastName: e.target.value })}
                            placeholder="Rice"
                            maxLength={60}
                            className="w-full p-3 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Nickname */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nickname
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (what people call you)
                          {displaySource === 'nickname' && <span className="text-primary ml-1">*</span>}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => updateIdentity({ nickname: e.target.value })}
                        placeholder="e.g. Percy, Mom, Sis"
                        maxLength={60}
                        className="w-full p-4 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Preferred-name selector — Auth | Full Name |
                        Nickname. User picks which source drives the
                        everyday-display name. The required-fields
                        asterisks above shift based on the selection so
                        the user knows what they need to fill in for
                        the chosen source. */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Which would you like us to use everyday?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => updateIdentity({ displaySource: 'auth' })}
                          disabled={!authName}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                            displaySource === 'auth'
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-accent text-foreground hover:border-primary/50'
                          }`}
                        >
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Sign-in
                          </div>
                          <div className="font-semibold text-sm break-words">
                            {authName || <span className="text-muted-foreground italic font-normal">none</span>}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateIdentity({ displaySource: 'legal' })}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${
                            displaySource === 'legal'
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-accent text-foreground hover:border-primary/50'
                          }`}
                        >
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Full Name
                          </div>
                          <div className="font-semibold text-sm break-words">
                            {computedLegalPreview || <span className="text-muted-foreground italic font-normal">enter above</span>}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateIdentity({ displaySource: 'nickname' })}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${
                            displaySource === 'nickname'
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-accent text-foreground hover:border-primary/50'
                          }`}
                        >
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Nickname
                          </div>
                          <div className="font-semibold text-sm break-words">
                            {nickname.trim() || <span className="text-muted-foreground italic font-normal">enter above</span>}
                          </div>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // Persist trimmed identity + advance.
                        const cleaned = {
                          firstName: firstName.trim(),
                          middleName: middleName.trim(),
                          lastName: lastName.trim(),
                          nickname: nickname.trim(),
                          displaySource,
                        }
                        const updated = { ...answers, [currentScreen.id]: cleaned }
                        setAnswers(updated)
                        if (user) {
                          const timeSpent = Date.now() - stepStartTime
                          const answerLabel =
                            displaySource === 'auth' ? authName
                            : displaySource === 'legal' ? computedLegalPreview
                            : cleaned.nickname
                          trackOnboardingStepCompleted({
                            userId: user.uid,
                            step: currentScreen.id as any,
                            stepNumber: step,
                            totalSteps: visibleScreens.length,
                            progressPercentage: Math.round(((step + 1) / visibleScreens.length) * 100),
                            answer: answerLabel || cleaned.firstName,
                            timeSpent,
                          })
                          setStepStartTime(Date.now())
                        }
                        setStep(step + 1)
                      }}
                      disabled={!canContinue}
                      className="w-full p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                )
              })()
            ) : (
            <>
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
            </>
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
