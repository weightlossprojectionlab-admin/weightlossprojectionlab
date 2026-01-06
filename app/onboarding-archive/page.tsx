'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import OnboardingRouter from '@/components/auth/OnboardingRouter'
import { useAuth } from '@/hooks/useAuth'
import { auth } from '@/lib/firebase'
import { userProfileOperations, weightLogOperations } from '@/lib/firebase-operations'
import HealthConditionModal from '@/components/onboarding/HealthConditionModal'
import { getQuestionnaireForCondition, hasDetailedQuestionnaire } from '@/lib/health-condition-questions'
import MedicationList from '@/components/health/MedicationList'
import { classifyMedicationConditions, getSuggestedConditions, normalizeConditionName } from '@/lib/medication-classifier'
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  getRecommendedMacros,
  projectWeightLoss,
  calculateBMI,
  getHealthRiskProfile,
  calculateLifestyleImpact,
  calculateOptimalTargets,
  type ActivityLevel,
  type Gender,
  type Units
} from '@/lib/health-calculations'
import {
  calculateAge,
  validateAge,
  getAgeAppropriateCalorieRange,
  getAgeSpecificHealthNotices,
  formatDateForInput,
  getMaxBirthDate,
  getMinBirthDate
} from '@/lib/age-utils'
import { Spinner } from '@/components/ui/Spinner'
import type { UserProfile, UserGoals, UserPreferences } from '@/types'
import type { PatientMedication } from '@/types/medical'
import { logger } from '@/lib/logger'

interface OnboardingData {
  // Step 1: About You
  birthDate?: Date
  birthMonth?: number // 1-12 for dropdown
  birthDay?: number // 1-31 for dropdown
  birthYear?: number // Year for dropdown
  age?: number
  gender?: Gender
  height?: number // Total height in inches (imperial) or cm (metric)
  heightFeet?: number // For imperial split input
  heightInches?: number // For imperial split input

  // Step 2: Current State
  currentWeight?: number
  startWeight?: number
  activityLevel?: ActivityLevel

  // Step 3: Goals
  targetWeight?: number
  targetDate?: Date
  weeklyWeightLossGoal?: number
  primaryGoal?: 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'

  // Step 4: Daily Targets (calculated)
  dailyCalorieGoal?: number
  dailySteps?: number
  macroTargets?: {
    protein: number
    carbs: number
    fat: number
  }

  // Step 5: Preferences & Lifestyle
  dietaryPreferences?: string[]
  foodAllergies?: string[]
  healthConditions?: string[]
  conditionDetails?: Record<string, Record<string, any>> // Detailed responses from health condition questionnaires
  medications?: UserProfile['medications'] // Scanned medications
  units?: Units

  // Lifestyle Factors
  smoking?: 'never' | 'quit-recent' | 'quit-old' | 'current-light' | 'current-heavy'
  smokingQuitDate?: Date
  alcoholFrequency?: 'never' | 'light' | 'moderate' | 'heavy'
  weeklyDrinks?: number
  recreationalDrugs?: 'no' | 'occasional' | 'regular'

  // Step 6: Meal Schedule & Notifications
  mealSchedule?: {
    breakfastTime: string
    lunchTime: string
    dinnerTime: string
    hasSnacks: boolean
    snackWindows?: string[]
  }
  notifications?: boolean
  mealReminderTimes?: {
    breakfast?: string
    lunch?: string
    dinner?: string
    snacks?: string
  }
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
}

function OnboardingContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    units: 'imperial',
    notifications: true,
    weightCheckInFrequency: 'weekly',
    // Meal schedule defaults (7 AM, 12 PM, 6 PM)
    mealSchedule: {
      breakfastTime: '07:00',
      lunchTime: '12:00',
      dinnerTime: '18:00',
      hasSnacks: false,
      snackWindows: []
    },
    // Lifestyle defaults
    smoking: 'never',
    alcoholFrequency: 'never',
    weeklyDrinks: 0,
    recreationalDrugs: 'no'
  })
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])

  const totalSteps = 6

  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }))

    // Clear validation errors for fields that are being updated
    const updatedFields = Object.keys(newData)
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      updatedFields.forEach(field => {
        delete newErrors[field]
      })
      return newErrors
    })
  }

  // Load draft data from Firebase when user is authenticated
  useEffect(() => {
    if (!user) {
      logger.debug('User not authenticated yet, waiting')
      return
    }

    if (draftLoaded) {
      logger.debug('Draft already loaded, skipping')
      return
    }

    const loadDraft = async () => {
      try {
        logger.info('User authenticated, loading onboarding draft from Firebase', { uid: user.uid })
        const profile = await userProfileOperations.getUserProfile()
        logger.debug('Profile data from Firebase', { profile })

        if (profile && !profile.profile?.onboardingCompleted) {
          // User has draft data - load it
          logger.info('Loading onboarding draft', { profile: profile.profile })

          const draftData: Partial<OnboardingData> = {}

          // Step 1 data (from profile object)
          if (profile.profile?.birthDate) draftData.birthDate = new Date(profile.profile.birthDate)
          if (profile.profile?.age) draftData.age = profile.profile.age
          if (profile.profile?.gender) draftData.gender = profile.profile.gender
          if (profile.profile?.height) {
            draftData.height = profile.profile.height
            // Try to extract feet/inches if imperial
            const units = profile.preferences?.units || 'imperial'
            if (units === 'imperial' && profile.profile.height) {
              draftData.heightFeet = Math.floor(profile.profile.height / 12)
              draftData.heightInches = profile.profile.height % 12
            }
          }

          // Step 2 data (from profile object)
          if (profile.profile?.currentWeight) draftData.currentWeight = profile.profile.currentWeight
          if (profile.profile?.activityLevel) draftData.activityLevel = profile.profile.activityLevel

          // Step 3 data (from goals object)
          if (profile.goals?.startWeight) draftData.startWeight = profile.goals.startWeight
          if (profile.goals?.targetWeight) draftData.targetWeight = profile.goals.targetWeight
          if (profile.goals?.weeklyWeightLossGoal) draftData.weeklyWeightLossGoal = profile.goals.weeklyWeightLossGoal
          if (profile.goals?.primaryGoal) draftData.primaryGoal = profile.goals.primaryGoal
          if (profile.goals?.targetDate) draftData.targetDate = new Date(profile.goals.targetDate)

          // Step 4 data (from goals object)
          if (profile.goals?.dailyCalorieGoal) draftData.dailyCalorieGoal = profile.goals.dailyCalorieGoal
          if (profile.goals?.dailySteps) draftData.dailySteps = profile.goals.dailySteps
          if (profile.goals?.macroTargets) draftData.macroTargets = profile.goals.macroTargets

          // Step 5 data (from profile & preferences)
          if (profile.profile?.dietaryPreferences) draftData.dietaryPreferences = profile.profile.dietaryPreferences
          if (profile.profile?.foodAllergies) draftData.foodAllergies = profile.profile.foodAllergies
          if (profile.profile?.healthConditions) draftData.healthConditions = profile.profile.healthConditions
          if (profile.preferences?.units) draftData.units = profile.preferences.units

          // Step 6 data (from preferences)
          if (profile.preferences?.notifications !== undefined) draftData.notifications = profile.preferences.notifications
          if (profile.preferences?.mealSchedule) draftData.mealSchedule = profile.preferences.mealSchedule
          if (profile.preferences?.mealReminderTimes) draftData.mealReminderTimes = profile.preferences.mealReminderTimes
          if (profile.preferences?.weightCheckInFrequency) draftData.weightCheckInFrequency = profile.preferences.weightCheckInFrequency

          // Resume to exact step user was on
          const resumeStep = profile.profile?.currentOnboardingStep || 1

          setData(prev => ({ ...prev, ...draftData }))
          setCurrentStep(resumeStep)

          logger.info('Resumed onboarding', { step: resumeStep })
          toast.success(`📋 Resumed from Step ${resumeStep}`, { duration: 3000 })
        } else if (profile && profile.profile?.onboardingCompleted) {
          logger.info('Onboarding already completed, redirecting to dashboard')
          toast.success('Welcome back! Redirecting to dashboard...', { duration: 2000 })
          router.push('/dashboard')
          return
        } else {
          logger.info('No profile found, starting fresh onboarding')
        }
      } catch (error: any) {
        logger.error('Error loading draft', error as Error)
        // Don't show error to user - just start fresh
      } finally {
        setDraftLoaded(true)
      }
    }

    loadDraft()
  }, [user, router]) // Re-run when user changes

  // Save current step data to Firebase
  const saveStepData = async (stepToSave?: number) => {
    try {
      const partialUpdate: any = {}

      // Use provided step or current step
      const stepNumber = stepToSave !== undefined ? stepToSave : currentStep

      // Always track current step and mark as incomplete
      partialUpdate.profile = {
        onboardingCompleted: false,
        currentOnboardingStep: stepNumber
      }

      // Prepare data based on what's been filled so far
      // IMPORTANT: Convert Date objects to ISO strings for Zod validation
      if (data.birthDate) partialUpdate.profile.birthDate = data.birthDate.toISOString()
      if (data.age) partialUpdate.profile.age = data.age
      if (data.gender) partialUpdate.profile.gender = data.gender
      if (data.height) partialUpdate.profile.height = data.height
      if (data.currentWeight) partialUpdate.profile.currentWeight = data.currentWeight
      if (data.activityLevel) partialUpdate.profile.activityLevel = data.activityLevel
      if (data.healthConditions) partialUpdate.profile.healthConditions = data.healthConditions
      if (data.foodAllergies) partialUpdate.profile.foodAllergies = data.foodAllergies

      if (data.targetWeight || data.primaryGoal || data.dailyCalorieGoal) {
        partialUpdate.goals = {}
        if (data.targetWeight) partialUpdate.goals.targetWeight = data.targetWeight
        if (data.startWeight) partialUpdate.goals.startWeight = data.startWeight
        if (data.weeklyWeightLossGoal) partialUpdate.goals.weeklyWeightLossGoal = data.weeklyWeightLossGoal
        if (data.targetDate) partialUpdate.goals.targetDate = data.targetDate.toISOString()
        if (data.primaryGoal) partialUpdate.goals.primaryGoal = data.primaryGoal
        if (data.dailyCalorieGoal) partialUpdate.goals.dailyCalorieGoal = data.dailyCalorieGoal
        if (data.dailySteps) partialUpdate.goals.dailySteps = data.dailySteps
        if (data.macroTargets) partialUpdate.goals.macroTargets = data.macroTargets
      }

      if (data.units || data.dietaryPreferences || data.notifications !== undefined || data.mealSchedule) {
        partialUpdate.preferences = {}
        if (data.units) partialUpdate.preferences.units = data.units
        if (data.notifications !== undefined) partialUpdate.preferences.notifications = data.notifications
        if (data.dietaryPreferences) partialUpdate.preferences.dietaryPreferences = data.dietaryPreferences
        if (data.mealSchedule) partialUpdate.preferences.mealSchedule = data.mealSchedule
        if (data.mealReminderTimes) partialUpdate.preferences.mealReminderTimes = data.mealReminderTimes
        if (data.weightCheckInFrequency) partialUpdate.preferences.weightCheckInFrequency = data.weightCheckInFrequency
      }

      // Only save if there's data to save
      if (Object.keys(partialUpdate).length > 0) {
        logger.debug('Saving step data', {
          step: stepNumber,
          updateKeys: Object.keys(partialUpdate),
          profileKeys: partialUpdate.profile ? Object.keys(partialUpdate.profile) : [],
          goalsKeys: partialUpdate.goals ? Object.keys(partialUpdate.goals) : [],
          preferencesKeys: partialUpdate.preferences ? Object.keys(partialUpdate.preferences) : []
        })
        await userProfileOperations.updateUserProfile(partialUpdate)
        logger.info('Auto-saved onboarding progress to Firebase', { step: stepNumber })
      }
    } catch (error) {
      logger.error('Error auto-saving onboarding', error as Error, {
        step: stepToSave !== undefined ? stepToSave : currentStep,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown'
      })
      toast.error('Failed to save progress. Please check your connection.')
      // Don't block user progression on save failure
    }
  }

  // Helper functions for validation
  const getFieldError = (field: string): string | undefined => {
    return validationErrors[field]
  }

  const isFieldInvalid = (field: string): boolean => {
    return !!validationErrors[field]
  }

  const setFieldError = (field: string, message: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: message }))
  }

  const clearValidationErrors = () => {
    setValidationErrors({})
  }

  const nextStep = async () => {
    // Validate current step before proceeding
    if (validateStep(currentStep)) {
      setLoading(true)
      try {
        // Clear warnings when moving to next step
        setWarnings([])

        // Calculate next step number
        const nextStepNumber = Math.min(currentStep + 1, totalSteps)

        // Auto-save progress with NEXT step (so resume works correctly)
        await saveStepData(nextStepNumber)

        if (currentStep === 3) {
          // Calculate targets after goals step
          calculateAndSetTargets()
        }
        setCurrentStep(nextStepNumber)
      } finally {
        setLoading(false)
      }
    }
  }

  const prevStep = async () => {
    // Calculate previous step number
    const prevStepNumber = Math.max(currentStep - 1, 1)

    // Auto-save with PREVIOUS step (so resume works correctly)
    await saveStepData(prevStepNumber)
    setCurrentStep(prevStepNumber)
  }

  const validateStep = (step: number): boolean => {
    // Clear previous errors
    clearValidationErrors()

    const missingFields: string[] = []
    let isValid = true

    switch (step) {
      case 1:
        // Check birthday
        if (!data.birthDate) {
          setFieldError('birthDate', 'Birthday is required')
          missingFields.push('Birthday')
          isValid = false
        } else {
          // Validate age from birthdate
          const ageValidation = validateAge(data.birthDate)
          if (!ageValidation.valid) {
            setFieldError('birthDate', ageValidation.error!)
            toast.error(ageValidation.error!)
            return false
          }
          // Calculate and store age
          updateData({ age: ageValidation.age })
        }

        // Check gender
        if (!data.gender) {
          setFieldError('gender', 'Gender is required')
          missingFields.push('Gender')
          isValid = false
        }

        // Check height
        if (!data.height) {
          setFieldError('height', 'Height is required')
          missingFields.push('Height')
          isValid = false
        }

        if (!isValid) {
          toast.error(`Please complete: ${missingFields.join(', ')}`, { duration: 5000 })
        }
        return isValid

      case 2:
        // Check current weight
        if (!data.currentWeight) {
          setFieldError('currentWeight', 'Current weight is required')
          missingFields.push('Current Weight')
          isValid = false
        }

        // Check activity level
        if (!data.activityLevel) {
          setFieldError('activityLevel', 'Activity level is required')
          missingFields.push('Activity Level')
          isValid = false
        }

        if (!isValid) {
          toast.error(`Please complete: ${missingFields.join(', ')}`, { duration: 5000 })
        }
        return isValid

      case 3:
        // Check primary goal
        if (!data.primaryGoal) {
          setFieldError('primaryGoal', 'Primary goal is required')
          missingFields.push('Primary Goal')
          isValid = false
        }

        // Check target weight
        if (!data.targetWeight) {
          setFieldError('targetWeight', 'Target weight is required')
          missingFields.push('Target Weight')
          isValid = false
        }

        // Check weekly weight loss goal
        if (!data.weeklyWeightLossGoal) {
          setFieldError('weeklyWeightLossGoal', 'Weekly weight loss goal is required')
          missingFields.push('Weekly Goal')
          isValid = false
        }

        // Validate target weight for weight loss goal
        if (data.primaryGoal === 'lose-weight' && data.targetWeight && data.currentWeight && data.targetWeight >= data.currentWeight) {
          setFieldError('targetWeight', 'Target weight must be less than current weight')
          toast.error('Target weight must be less than current weight for weight loss', { duration: 5000 })
          return false
        }

        if (!isValid) {
          toast.error(`Please complete: ${missingFields.join(', ')}`, { duration: 5000 })
        }
        return isValid

      default:
        return true
    }
  }

  const calculateAndSetTargets = () => {
    if (!data.age || !data.gender || !data.height || !data.currentWeight || !data.activityLevel || !data.units) {
      return
    }

    // Clear previous warnings
    setWarnings([])

    // Calculate BMR
    const bmr = calculateBMR({
      weight: data.currentWeight,
      height: data.height,
      age: data.age,
      gender: data.gender,
      units: data.units
    })

    // Calculate base TDEE
    const baseTDEE = calculateTDEE(bmr, data.activityLevel)

    // Apply lifestyle adjustments to TDEE
    const lifestyleImpact = calculateLifestyleImpact({
      baseTDEE,
      smoking: data.smoking || 'never',
      weeklyDrinks: data.weeklyDrinks || 0
    })

    const adjustedTDEE = lifestyleImpact.adjustedTDEE

    // Add lifestyle warnings
    lifestyleImpact.warnings.forEach(warning => {
      setWarnings(prev => [...prev, warning])
    })

    // Calculate daily calorie target with lifestyle-adjusted TDEE
    let dailyCalorieGoal = calculateCalorieTarget({
      tdee: adjustedTDEE,
      weeklyWeightLossGoal: data.weeklyWeightLossGoal || 1,
      units: data.units
    })

    // If heavy drinker, reduce calorie budget to account for alcohol
    if (lifestyleImpact.alcoholCaloriesPerDay > 150) {
      dailyCalorieGoal -= lifestyleImpact.alcoholCaloriesPerDay
      setWarnings(prev => [...prev,
        `Your meal calorie budget is reduced by ${Math.round(lifestyleImpact.alcoholCaloriesPerDay)} cal/day to account for alcohol consumption`
      ])
    }

    // Get age-appropriate calorie ranges for safety
    const calorieRange = getAgeAppropriateCalorieRange(data.age, data.gender)

    // Additional health condition adjustments
    let minCalories = calorieRange.min
    if (data.healthConditions?.includes('Type 2 Diabetes')) {
      minCalories = Math.max(minCalories, 1400)
      setWarnings(prev => [...prev, 'Diabetics require higher minimum calorie intake (1400 cal/day) for blood sugar stability'])
    }
    if (data.healthConditions?.includes('Heart Disease')) {
      minCalories = Math.max(minCalories, 1500)
      setWarnings(prev => [...prev, 'Heart disease patients require higher minimum calorie intake (1500 cal/day) for safety'])
    }
    if (data.healthConditions?.includes('Pregnancy/Nursing')) {
      minCalories = 1800
      setWarnings(prev => [...prev, 'Pregnancy/nursing requires minimum 1800 cal/day. Please consult your doctor before dieting.'])
    }

    // Ensure calculated goal is within safe range
    const originalGoal = dailyCalorieGoal
    dailyCalorieGoal = Math.max(
      minCalories,
      Math.min(calorieRange.max, dailyCalorieGoal)
    )

    // Warn user if goal was adjusted for safety
    if (dailyCalorieGoal !== originalGoal && dailyCalorieGoal > originalGoal) {
      const adjustmentMessage = `Your calorie goal was increased to ${dailyCalorieGoal} calories for your health and safety. ${calorieRange.warning || 'This ensures you maintain adequate nutrition.'}`
      setWarnings(prev => [...prev, adjustmentMessage])
    }

    // Get recommended macros based on goal (percentages)
    const macroPercentages = getRecommendedMacros(data.primaryGoal || 'lose-weight')

    // Store percentages (not grams) - schema requires they sum to 100
    updateData({
      dailyCalorieGoal,
      macroTargets: {
        protein: macroPercentages.protein,
        carbs: macroPercentages.carbs,
        fat: macroPercentages.fat
      }
    })

    toast.success('Targets calculated! You can adjust them on the next step.')
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Prepare profile data
      // IMPORTANT: Convert Date objects to ISO strings for Zod validation
      const profile: Partial<UserProfile> = {
        birthDate: data.birthDate!.toISOString() as unknown as Date,
        age: data.age!,
        gender: data.gender!,
        height: data.height!,
        currentWeight: data.currentWeight!, // Fallback only - weight-logs is primary source
        activityLevel: data.activityLevel!,
        healthConditions: data.healthConditions,
        conditionDetails: data.conditionDetails, // Detailed health condition questionnaire responses
        medications: data.medications, // Scanned medications
        foodAllergies: data.foodAllergies,
        lifestyle: {
          smoking: data.smoking || 'never',
          smokingQuitDate: data.smokingQuitDate?.toISOString() as unknown as Date | undefined,
          alcoholFrequency: data.alcoholFrequency || 'never',
          weeklyDrinks: data.weeklyDrinks || 0,
          recreationalDrugs: data.recreationalDrugs || 'no'
        },
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString() as unknown as Date,
        currentOnboardingStep: undefined // Clear step tracker on completion
      }

      // Prepare goals data
      const goals: Partial<UserGoals> = {
        targetWeight: data.targetWeight!,
        startWeight: data.startWeight || data.currentWeight!,
        weeklyWeightLossGoal: data.weeklyWeightLossGoal!,
        targetDate: data.targetDate?.toISOString() as unknown as Date | undefined,
        primaryGoal: data.primaryGoal!,
        dailyCalorieGoal: data.dailyCalorieGoal!,
        dailySteps: data.dailySteps!,
        macroTargets: {
          protein: data.macroTargets!.protein,
          carbs: data.macroTargets!.carbs,
          fat: data.macroTargets!.fat
        }
      }

      // Prepare preferences data
      const preferences: Partial<UserPreferences> = {
        units: data.units!,
        notifications: data.notifications!,
        dietaryPreferences: data.dietaryPreferences,
        mealSchedule: data.mealSchedule,
        mealReminderTimes: data.mealReminderTimes,
        weightCheckInFrequency: data.weightCheckInFrequency
      }

      // Save to Firebase
      logger.info('Saving onboarding completion to Firestore')
      await userProfileOperations.updateUserProfile({
        profile,
        goals,
        preferences
      })

      // CRITICAL: Verify write completed before redirecting (prevents onboarding loop)
      // Firestore uses eventual consistency - write might not be visible immediately
      // Retry with exponential backoff: 500ms, 1s, 2s
      logger.info('Verifying onboarding completion was saved to Firestore')
      let verified = false
      for (let attempt = 0; attempt < 3; attempt++) {
        // Wait before checking (exponential backoff)
        const delay = 500 * Math.pow(2, attempt) // 500ms, 1000ms, 2000ms
        await new Promise(resolve => setTimeout(resolve, delay))

        // Refetch profile to verify onboardingCompleted flag
        try {
          const savedProfile = await userProfileOperations.getUserProfile()
          const isCompleted = savedProfile?.data?.profile?.onboardingCompleted === true

          logger.info('Onboarding completion verification attempt', {
            attempt: attempt + 1,
            onboardingCompleted: isCompleted,
            delayMs: delay,
            timestamp: new Date().toISOString()
          })

          if (isCompleted) {
            verified = true
            logger.info('✅ Onboarding completion verified successfully')
            break
          }
        } catch (verifyError) {
          logger.warn('Verification attempt failed', {
            attempt: attempt + 1,
            error: verifyError instanceof Error ? verifyError.message : String(verifyError)
          })
        }
      }

      if (!verified) {
        logger.error('Failed to verify onboarding completion after 3 attempts')
        throw new Error('Failed to save onboarding completion. Please try again or contact support.')
      }

      // Create initial weight log entry so dashboard shows weight immediately
      try {
        logger.info('Creating initial weight log from onboarding data')
        await weightLogOperations.createWeightLog({
          weight: data.currentWeight!,
          unit: data.units === 'metric' ? 'kg' : 'lbs',
          notes: 'Starting weight from onboarding',
          loggedAt: new Date().toISOString()
        })
        logger.info('Initial weight log created successfully')
      } catch (weightLogError) {
        // Don't block onboarding completion if weight log fails
        logger.warn('Failed to create initial weight log', { error: weightLogError instanceof Error ? weightLogError.message : String(weightLogError) })
        // User can still manually log weight later
      }

      // Generate AI health profile if user has health conditions
      if (data.healthConditions && data.healthConditions.length > 0) {
        try {
          logger.info('Generating AI health profile from onboarding data', {
            conditions: data.healthConditions,
            conditionCount: data.healthConditions.length
          })

          // Get Firebase auth token for API call
          const token = await auth.currentUser?.getIdToken()
          if (!token) {
            throw new Error('No auth token available')
          }

          // Small delay to ensure Firestore write is committed
          // (The API reads from Firestore, not from request body)
          await new Promise(resolve => setTimeout(resolve, 500))

          const response = await fetch('/api/ai/health-profile/generate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const result = await response.json()
            logger.info('AI health profile generated successfully', {
              status: result.status,
              confidence: result.confidence,
              restrictionsCount: result.restrictionsCount
            })

            // Show appropriate message based on status
            if (result.status === 'approved') {
              toast.success('AI health profile created with dietary recommendations')
            } else {
              toast('Health profile pending admin review', { icon: '⏳' })
            }
          } else {
            // Parse error response for detailed logging
            let errorDetails: any = { status: response.status, statusText: response.statusText }
            try {
              const errorBody = await response.json()
              errorDetails = { ...errorDetails, ...errorBody }
            } catch {
              // If JSON parsing fails, just use status info
            }

            throw new Error(`Health profile generation failed: ${response.status} - ${errorDetails.error || errorDetails.message || response.statusText}`)
          }
        } catch (healthProfileError) {
          // Don't block onboarding completion if health profile generation fails
          logger.warn('Failed to generate AI health profile', {
            error: healthProfileError instanceof Error ? healthProfileError.message : String(healthProfileError),
            errorName: healthProfileError instanceof Error ? healthProfileError.name : 'Unknown',
            healthConditionsCount: data.healthConditions?.length || 0,
            hasConditionDetails: !!data.conditionDetails,
            medicationCount: data.medications?.length || 0
          })
          // Profile can be generated later by admin or user
          // This is not a critical failure - user can still complete onboarding
        }
      }

      toast.success('Welcome! Your profile is all set up! 🎉')

      // Add query param to signal successful onboarding completion
      // This helps OnboardingRouter skip Firestore check (defense layer #2)
      router.push('/dashboard?onboardingComplete=true')
    } catch (error) {
      logger.error('Error completing onboarding', error as Error)
      toast.error('Failed to save your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-card">
      <div className="container-medium py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill progress-bar-primary transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="card p-8 mb-6">
          {currentStep === 1 && (
            <StepOne
              data={data}
              updateData={updateData}
              getFieldError={getFieldError}
              isFieldInvalid={isFieldInvalid}
              setWarnings={setWarnings}
            />
          )}
          {currentStep === 2 && (
            <StepTwo
              data={data}
              updateData={updateData}
              getFieldError={getFieldError}
              isFieldInvalid={isFieldInvalid}
            />
          )}
          {currentStep === 3 && (
            <StepThree
              data={data}
              updateData={updateData}
              getFieldError={getFieldError}
              isFieldInvalid={isFieldInvalid}
            />
          )}
          {currentStep === 4 && (
            <StepFour data={data} updateData={updateData} warnings={warnings} />
          )}
          {currentStep === 5 && (
            <StepFive data={data} updateData={updateData} />
          )}
          {currentStep === 6 && (
            <StepSix data={data} updateData={updateData} />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="btn btn-outline"
          >
            ← Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              disabled={loading}
              className={`btn btn-primary font-medium inline-flex items-center space-x-2 ${loading ? 'cursor-wait' : ''}`}
            >
              {loading && <Spinner size="sm" />}
              <span>{loading ? 'Saving...' : 'Continue →'}</span>
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className={`btn btn-success font-medium inline-flex items-center space-x-2 ${loading ? 'cursor-wait' : ''}`}
            >
              {loading && <Spinner size="sm" />}
              <span>{loading ? 'Saving...' : 'Complete Setup ✓'}</span>
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

// Step 1: About You
function StepOne({
  data,
  updateData,
  getFieldError,
  isFieldInvalid,
  setWarnings
}: {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  getFieldError: (field: string) => string | undefined
  isFieldInvalid: (field: string) => boolean
  setWarnings: React.Dispatch<React.SetStateAction<string[]>>
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2>Tell us about yourself</h2>
        <p className="text-muted-foreground mt-2">We'll use this to calculate your personalized targets</p>
      </div>

      {/* Birthday */}
      <div>
        <label className="text-label block mb-2">
          Birthday <span className="text-error">*</span>
          <span className="text-xs text-muted-foreground ml-2">
            (Required for age-appropriate recommendations)
          </span>
        </label>

        <div className="grid grid-cols-3 gap-3">
          {/* Month Dropdown */}
          <div>
            <select
              value={data.birthMonth || ''}
              onChange={(e) => {
                const month = parseInt(e.target.value)
                updateData({ birthMonth: month })

                // Construct date if all fields are filled
                if (month && data.birthDay && data.birthYear) {
                  const birthDate = new Date(data.birthYear, month - 1, data.birthDay)
                  const validation = validateAge(birthDate)

                  if (validation.valid) {
                    updateData({
                      birthDate,
                      age: validation.age
                    })

                    if (validation.warning) {
                      setWarnings(prev => [...prev, validation.warning!])
                    }
                  }
                }
              }}
              className={`form-input ${isFieldInvalid('birthDate') ? 'border-error' : ''}`}
            >
              <option value="">Month</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Day Dropdown */}
          <div>
            <select
              value={data.birthDay || ''}
              onChange={(e) => {
                const day = parseInt(e.target.value)
                updateData({ birthDay: day })

                // Construct date if all fields are filled
                if (data.birthMonth && day && data.birthYear) {
                  const birthDate = new Date(data.birthYear, data.birthMonth - 1, day)
                  const validation = validateAge(birthDate)

                  if (validation.valid) {
                    updateData({
                      birthDate,
                      age: validation.age
                    })

                    if (validation.warning) {
                      setWarnings(prev => [...prev, validation.warning!])
                    }
                  }
                }
              }}
              className={`form-input ${isFieldInvalid('birthDate') ? 'border-error' : ''}`}
            >
              <option value="">Day</option>
              {/* Calculate max days based on selected month/year */}
              {(() => {
                let maxDays = 31
                if (data.birthMonth && data.birthYear) {
                  // Get last day of the month
                  maxDays = new Date(data.birthYear, data.birthMonth, 0).getDate()
                } else if (data.birthMonth) {
                  // Use current year if year not selected
                  maxDays = new Date(new Date().getFullYear(), data.birthMonth, 0).getDate()
                }
                return Array.from({ length: maxDays }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))
              })()}
            </select>
          </div>

          {/* Year Dropdown */}
          <div>
            <select
              value={data.birthYear || ''}
              onChange={(e) => {
                const year = parseInt(e.target.value)
                updateData({ birthYear: year })

                // Construct date if all fields are filled
                if (data.birthMonth && data.birthDay && year) {
                  const birthDate = new Date(year, data.birthMonth - 1, data.birthDay)
                  const validation = validateAge(birthDate)

                  if (validation.valid) {
                    updateData({
                      birthDate,
                      age: validation.age
                    })

                    if (validation.warning) {
                      setWarnings(prev => [...prev, validation.warning!])
                    }
                  } else {
                    toast.error(validation.error!)
                  }
                }
              }}
              className={`form-input ${isFieldInvalid('birthDate') ? 'border-error' : ''}`}
            >
              <option value="">Year</option>
              {/* Generate years from current year - 13 (COPPA) down to current year - 120 */}
              {Array.from({ length: 108 }, (_, i) => new Date().getFullYear() - 13 - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Show calculated age */}
        {data.birthDate && (
          <p className="text-caption mt-1">
            Age: {calculateAge(data.birthDate)} years old
          </p>
        )}

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground mt-2">
          🔒 We collect your birthday to provide age-appropriate health recommendations and ensure safe calorie targets. Your birthday is kept private and never shared.
        </p>

        {/* Error message */}
        {getFieldError('birthDate') && (
          <p className="text-error text-xs mt-1">{getFieldError('birthDate')}</p>
        )}
      </div>

      {/* Age-based health warnings */}
      {data.age && getAgeSpecificHealthNotices(data.age).map((notice, index) => (
        <div key={index} className={`notification notification-${notice.type}`}>
          <p className="text-sm">{notice.message}</p>
        </div>
      ))}

      {/* Gender */}
      <div>
        <label className="text-label block mb-2">
          Gender <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'male', label: 'Male', emoji: '👨' },
            { value: 'female', label: 'Female', emoji: '👩' },
            { value: 'other', label: 'Other', emoji: '🧑' },
            { value: 'prefer-not-to-say', label: 'Prefer not to say', emoji: '😊' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ gender: option.value as Gender })}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                data.gender === option.value
                  ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                  : isFieldInvalid('gender')
                    ? 'border-error hover:border-error'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{option.emoji}</span>
                <span className="font-medium">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
        {/* Error message */}
        {getFieldError('gender') && (
          <p className="text-error text-xs mt-1">{getFieldError('gender')}</p>
        )}
      </div>

      {/* Units */}
      <div>
        <label className="text-label block mb-2">
          Measurement Units
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateData({ units: 'imperial' })}
            className={`p-4 border-2 rounded-lg transition-all ${
              data.units === 'imperial'
                ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium">Imperial</div>
            <div className="text-sm text-muted-foreground">lbs, inches</div>
          </button>
          <button
            type="button"
            onClick={() => updateData({ units: 'metric' })}
            className={`p-4 border-2 rounded-lg transition-all ${
              data.units === 'metric'
                ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium">Metric</div>
            <div className="text-sm text-muted-foreground">kg, cm</div>
          </button>
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="text-label block mb-2">
          Height <span className="text-error">*</span>
        </label>

        {data.units === 'imperial' ? (
          // Imperial: Separate feet and inches inputs
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="3"
                    max="8"
                    value={data.heightFeet || ''}
                    onChange={(e) => {
                      const feet = parseInt(e.target.value) || 0
                      const inches = data.heightInches || 0
                      const totalInches = (feet * 12) + inches
                      updateData({
                        heightFeet: feet,
                        height: totalInches
                      })
                    }}
                    className={`form-input text-center ${isFieldInvalid('height') ? 'border-error' : ''}`}
                    placeholder="e.g., 5"
                  />
                  <span className="text-sm font-medium text-muted-foreground">ft</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={data.heightInches || ''}
                    onChange={(e) => {
                      const inches = parseInt(e.target.value) || 0
                      const feet = data.heightFeet || 0
                      const totalInches = (feet * 12) + inches
                      updateData({
                        heightInches: inches,
                        height: totalInches
                      })
                    }}
                    className={`form-input text-center ${isFieldInvalid('height') ? 'border-error' : ''}`}
                    placeholder="e.g., 10"
                  />
                  <span className="text-sm font-medium text-muted-foreground">in</span>
                </div>
              </div>
            </div>
            <p className="text-caption mt-1">
              Example: 5 ft 8 in
            </p>
          </>
        ) : (
          // Metric: Single centimeters input
          <>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="90"
                max="240"
                value={data.height || ''}
                onChange={(e) => updateData({ height: parseFloat(e.target.value) })}
                className={`form-input flex-1 ${isFieldInvalid('height') ? 'border-error' : ''}`}
                placeholder="173"
              />
              <span className="text-sm font-medium text-muted-foreground">cm</span>
            </div>
            <p className="text-caption mt-1">
              Example: 173 cm
            </p>
          </>
        )}

        {/* Error message */}
        {getFieldError('height') && (
          <p className="text-error text-xs mt-1">{getFieldError('height')}</p>
        )}
      </div>
    </div>
  )
}

// Step 2: Current State
function StepTwo({
  data,
  updateData,
  getFieldError,
  isFieldInvalid
}: {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  getFieldError: (field: string) => string | undefined
  isFieldInvalid: (field: string) => boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2>Your current state</h2>
        <p className="text-muted-foreground mt-2">Help us understand where you're starting from</p>
      </div>

      {/* Current Weight */}
      <div>
        <label className="text-label block mb-2">
          Current Weight {data.units === 'imperial' ? '(lbs)' : '(kg)'} <span className="text-error">*</span>
        </label>
        <input
          type="number"
          min="50"
          max="500"
          step="0.1"
          value={data.currentWeight || ''}
          onChange={(e) => {
            const weight = parseFloat(e.target.value)
            updateData({
              currentWeight: weight,
              startWeight: data.startWeight || weight
            })
          }}
          className={`form-input ${isFieldInvalid('currentWeight') ? 'border-error' : ''}`}
          placeholder={data.units === 'imperial' ? "e.g., 180" : "e.g., 82"}
        />
        {/* Error message */}
        {getFieldError('currentWeight') && (
          <p className="text-error text-xs mt-1">{getFieldError('currentWeight')}</p>
        )}
      </div>

      {/* Activity Level */}
      <div>
        <label className="text-label block mb-3">
          Activity Level <span className="text-error">*</span>
        </label>
        <div className="space-y-3">
          {[
            { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise', emoji: '🛋️' },
            { value: 'lightly-active', label: 'Lightly Active', desc: '1-3 days/week', emoji: '🚶' },
            { value: 'moderately-active', label: 'Moderately Active', desc: '3-5 days/week', emoji: '🏃' },
            { value: 'very-active', label: 'Very Active', desc: '6-7 days/week', emoji: '🏋️' },
            { value: 'extremely-active', label: 'Extremely Active', desc: 'Athlete level', emoji: '🏅' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ activityLevel: option.value as ActivityLevel })}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                data.activityLevel === option.value
                  ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                  : isFieldInvalid('activityLevel')
                    ? 'border-error hover:border-error'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </div>
                </div>
                {data.activityLevel === option.value && (
                  <span className="text-primary">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
        {/* Error message */}
        {getFieldError('activityLevel') && (
          <p className="text-error text-xs mt-1">{getFieldError('activityLevel')}</p>
        )}
      </div>
    </div>
  )
}

// Step 3: Goals & Targets
function StepThree({
  data,
  updateData,
  getFieldError,
  isFieldInvalid
}: {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  getFieldError: (field: string) => string | undefined
  isFieldInvalid: (field: string) => boolean
}) {
  // Auto-calculate optimal targets when user selects primary goal
  useEffect(() => {
    if (
      data.currentWeight &&
      data.height &&
      data.age &&
      data.gender &&
      data.activityLevel &&
      data.primaryGoal
    ) {
      const optimalTargets = calculateOptimalTargets({
        currentWeight: data.currentWeight,
        height: data.height,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        primaryGoal: data.primaryGoal,
        healthConditions: data.healthConditions,
        units: data.units!
      })

      // Auto-populate the calculated targets
      updateData({
        targetWeight: optimalTargets.targetWeight,
        weeklyWeightLossGoal: optimalTargets.weeklyWeightLossGoal,
        dailySteps: optimalTargets.dailySteps
      })
    }
  }, [data.primaryGoal, data.healthConditions]) // Recalculate when goal or health conditions change

  const projection = data.currentWeight && data.targetWeight && data.weeklyWeightLossGoal
    ? projectWeightLoss({
        startWeight: data.currentWeight,
        targetWeight: data.targetWeight,
        weeklyWeightLossGoal: data.weeklyWeightLossGoal,
        units: data.units!
      })
    : null

  // Get reasoning for the auto-calculated targets
  const optimalTargets = data.currentWeight && data.height && data.age && data.gender && data.activityLevel && data.primaryGoal
    ? calculateOptimalTargets({
        currentWeight: data.currentWeight,
        height: data.height,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        primaryGoal: data.primaryGoal,
        healthConditions: data.healthConditions,
        units: data.units!
      })
    : null

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2>Your personalized plan</h2>
        <p className="text-muted-foreground mt-2">Based on your profile, we've calculated optimal targets for your success</p>
      </div>

      {/* Primary Goal */}
      <div>
        <label className="text-label block mb-3">
          Primary Goal <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'lose-weight', label: 'Lose Weight', emoji: '📉' },
            { value: 'maintain-weight', label: 'Maintain', emoji: '⚖️' },
            { value: 'gain-muscle', label: 'Gain Muscle', emoji: '💪' },
            { value: 'improve-health', label: 'Get Healthier', emoji: '❤️' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ primaryGoal: option.value as any })}
              className={`p-4 border-2 rounded-lg transition-all ${
                data.primaryGoal === option.value
                  ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                  : isFieldInvalid('primaryGoal')
                    ? 'border-error hover:border-error'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-2xl mb-1">{option.emoji}</div>
              <div className="font-medium text-sm">{option.label}</div>
            </button>
          ))}
        </div>
        {/* Error message */}
        {getFieldError('primaryGoal') && (
          <p className="text-error text-xs mt-1">{getFieldError('primaryGoal')}</p>
        )}
      </div>

      {/* Auto-Calculated Targets Display */}
      {optimalTargets && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-primary rounded-lg p-5 space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🎯</span>
            <div className="flex-1">
              <h3 className="font-bold text-primary-dark dark:text-primary-light mb-1">Your Optimized Targets</h3>
              <p className="text-xs text-primary-dark/80 dark:text-primary-light/80">
                Calculated by our system based on evidence-based guidelines for safe, sustainable results
              </p>
            </div>
          </div>

          {/* Target Weight */}
          <div className="bg-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Target Weight</span>
              <span className="text-2xl font-bold text-primary">{optimalTargets.targetWeight} {data.units === 'imperial' ? 'lbs' : 'kg'}</span>
            </div>
            <p className="text-xs text-muted-foreground">{optimalTargets.reasoning.targetWeightReason}</p>
          </div>

          {/* Weekly Weight Loss Goal */}
          <div className="bg-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Weekly Rate</span>
              <span className="text-2xl font-bold text-primary">{optimalTargets.weeklyWeightLossGoal.toFixed(1)} lbs/week</span>
            </div>
            <p className="text-xs text-muted-foreground">{optimalTargets.reasoning.weeklyGoalReason}</p>
          </div>

          {/* Safety Notice */}
          <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent dark:border-accent-light rounded-lg p-3">
            <p className="text-xs text-accent-dark dark:text-accent-light">
              <strong>🔒 These targets are locked</strong> to ensure your safety and success. They're based on your BMI, age, health conditions, and activity level using evidence-based formulas.
            </p>
          </div>
        </div>
      )}

      {/* Projection */}
      {projection && (
        <div className="bg-muted border-2 border-border rounded-lg p-4">
          <div className="font-medium mb-2">📊 Your Timeline</div>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Estimated time:</span> {projection.estimatedWeeks} weeks (~{Math.round(projection.estimatedWeeks / 4)} months)</p>
            <p><span className="font-medium">Target date:</span> {projection.estimatedDate.toLocaleDateString()}</p>
            <p><span className="font-medium">Total to lose:</span> {(data.currentWeight! - data.targetWeight!).toFixed(1)} {data.units === 'imperial' ? 'lbs' : 'kg'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Step 4: Daily Targets
function StepFour({
  data,
  updateData,
  warnings
}: {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  warnings: string[]
}) {
  // Get the auto-calculated targets and reasoning
  const optimalTargets = data.currentWeight && data.height && data.age && data.gender && data.activityLevel && data.primaryGoal
    ? calculateOptimalTargets({
        currentWeight: data.currentWeight,
        height: data.height,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        primaryGoal: data.primaryGoal,
        healthConditions: data.healthConditions,
        units: data.units!
      })
    : null

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2>Your daily targets</h2>
        <p className="text-muted-foreground mt-2">These are calculated based on your profile to optimize your results</p>
      </div>

      {/* Daily Calories - LOCKED (Auto-Calculated) */}
      <div className="bg-primary-light dark:bg-purple-900/20 border-2 border-primary rounded-lg p-5">
        <label className="text-label block mb-3">
          Daily Calorie Goal <span className="text-xs text-muted-foreground ml-2">(Auto-Calculated)</span>
        </label>
        <div className="flex items-center space-x-4 mb-2">
          <input
            type="number"
            value={data.dailyCalorieGoal || ''}
            readOnly
            className="form-input flex-1 text-lg font-semibold bg-muted cursor-not-allowed"
            placeholder="Auto-calculated"
          />
          <span className="text-muted-foreground font-medium">calories/day</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-primary-dark dark:text-primary-light">
          <span>🔒</span>
          <span>Locked for your safety. Based on your BMR, activity level, and weight loss goal.</span>
        </div>
      </div>

      {/* Daily Steps - LOCKED (Auto-Calculated) */}
      {optimalTargets && (
        <div className="bg-card border-2 border-border rounded-lg p-5">
          <label className="text-label block mb-3">
            Daily Steps Goal <span className="text-xs text-muted-foreground ml-2">(Auto-Calculated)</span>
          </label>
          <div className="flex items-center space-x-4 mb-2">
            <input
              type="number"
              value={optimalTargets.dailySteps}
              readOnly
              className="form-input flex-1 text-lg font-semibold bg-muted cursor-not-allowed"
            />
            <span className="text-muted-foreground font-medium">steps/day</span>
          </div>
          <p className="text-xs text-muted-foreground">{optimalTargets.reasoning.stepsReason}</p>
        </div>
      )}

      {/* Health & Safety Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          {warnings.map((warning, index) => (
            <div key={index} className="notification notification-warning">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm flex-1">{warning}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Macro Targets */}
      <div className="bg-muted rounded-lg p-4">
        <div className="font-medium mb-3">Macro Distribution</div>
        <p className="text-sm text-muted-foreground mb-4">
          Macronutrients (macros) are the three main nutrients your body needs: protein builds muscle, carbs provide energy, and fats support hormones and cell function. These targets help you achieve balanced nutrition for your goals.
        </p>
        {data.macroTargets && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="text-2xl font-bold text-primary">{data.macroTargets.protein}g</div>
              <div className="text-xs text-muted-foreground mt-1">Protein</div>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="text-2xl font-bold text-success">{data.macroTargets.carbs}g</div>
              <div className="text-xs text-muted-foreground mt-1">Carbs</div>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="text-2xl font-bold text-accent">{data.macroTargets.fat}g</div>
              <div className="text-xs text-muted-foreground mt-1">Fat</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Step 5: Preferences & Lifestyle (Accountability-Focused)
function StepFive({ data, updateData }: { data: OnboardingData; updateData: (data: Partial<OnboardingData>) => void }) {
  const dietaryOptions = ['Vegan', 'Vegetarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Mediterranean']
  const commonAllergies = ['Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat/Gluten', 'Fish']

  // Modal state for detailed health condition questionnaires
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [conditionResponses, setConditionResponses] = useState<Record<string, Record<string, any>>>({})

  // Medication classification state
  const [isClassifyingMeds, setIsClassifyingMeds] = useState(false)
  const [suggestedConditions, setSuggestedConditions] = useState<Array<{ condition: string; confidence: number; medications: string[] }>>([])

  // Calculate BMI and health risk profile
  const bmiData = data.currentWeight && data.height && data.units
    ? calculateBMI({ weight: data.currentWeight, height: data.height, units: data.units })
    : null

  const healthRisk = bmiData && data.age && data.gender
    ? getHealthRiskProfile({ bmi: bmiData.bmi, gender: data.gender, age: data.age })
    : null

  // Pre-select likely conditions on first render
  useEffect(() => {
    if (healthRisk && healthRisk.likelyConditions.length > 0 && (!data.healthConditions || data.healthConditions.length === 0)) {
      updateData({ healthConditions: healthRisk.likelyConditions })
    }
  }, [healthRisk?.bmiCategory]) // Only run when BMI category is calculated

  // Classify medications and suggest conditions when medications change
  useEffect(() => {
    const classifyMeds = async () => {
      if (data.medications && data.medications.length > 0 && !isClassifyingMeds) {
        setIsClassifyingMeds(true)
        try {
          const classifications = await classifyMedicationConditions(data.medications)
          const suggested = getSuggestedConditions(classifications)

          // Normalize condition names to match app's condition list
          const normalizedSuggestions = suggested.map(s => ({
            ...s,
            condition: normalizeConditionName(s.condition)
          }))

          setSuggestedConditions(normalizedSuggestions)

          // Auto-select high-confidence conditions (>= 80)
          const highConfidenceConditions = normalizedSuggestions
            .filter(s => s.confidence >= 80)
            .map(s => s.condition)

          if (highConfidenceConditions.length > 0) {
            // Merge with existing conditions (don't override user selections)
            const mergedConditions = Array.from(new Set([
              ...(data.healthConditions || []),
              ...highConfidenceConditions
            ]))
            updateData({ healthConditions: mergedConditions })

            toast.success(`Based on your medications, WPL identified ${highConfidenceConditions.length} condition(s)`)
          }
        } catch (error) {
          logger.error('[Onboarding] Medication classification failed', error as Error)
        } finally {
          setIsClassifyingMeds(false)
        }
      }
    }

    classifyMeds()
  }, [data.medications?.length]) // Re-run when medication count changes

  const toggleDietaryPref = (pref: string) => {
    const current = data.dietaryPreferences || []
    const updated = current.includes(pref) ? current.filter(p => p !== pref) : [...current, pref]
    updateData({ dietaryPreferences: updated })
  }

  const toggleAllergy = (allergy: string) => {
    const current = data.foodAllergies || []
    const updated = current.includes(allergy) ? current.filter(a => a !== allergy) : [...current, allergy]
    updateData({ foodAllergies: updated })
  }

  const toggleHealthCondition = (condition: string) => {
    const current = data.healthConditions || []
    const isSelected = current.includes(condition)

    if (!isSelected) {
      // User is selecting the condition
      const updated = [...current, condition]
      updateData({ healthConditions: updated })

      // Check if this condition has a detailed questionnaire
      if (hasDetailedQuestionnaire(condition)) {
        // Open modal for detailed questions
        setSelectedCondition(condition)
        setModalOpen(true)
      }
    } else {
      // User is deselecting the condition
      const updated = current.filter(c => c !== condition)
      updateData({ healthConditions: updated })

      // Clear responses for this condition
      const newResponses = { ...conditionResponses }
      delete newResponses[condition]
      setConditionResponses(newResponses)
    }
  }

  const handleModalSave = (conditionKey: string, responses: Record<string, any>) => {
    // Save responses for this condition
    const updatedResponses = {
      ...conditionResponses,
      [selectedCondition!]: responses
    }
    setConditionResponses(updatedResponses)

    // Extract and consolidate medications from all condition responses
    const allMedications: UserProfile['medications'] = []
    Object.entries(updatedResponses).forEach(([condition, conditionData]) => {
      // Look for medication-scanner question responses
      Object.entries(conditionData).forEach(([questionId, value]) => {
        // Check if this is a medication array
        if (Array.isArray(value) && value.length > 0 && value[0]?.name) {
          // This is a medications array from a medication-scanner question
          allMedications.push(...value)
        }
      })
    })

    // Save both condition details and consolidated medications to onboarding data
    updateData({
      conditionDetails: updatedResponses,
      medications: allMedications
    })

    toast.success(`WPL now understands your ${selectedCondition}`)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2>Let WPL Get to Know You</h2>
        <p className="text-muted-foreground mt-2">
          Help WPL understand your health story to provide safe, personalized guidance
        </p>
        <div className="bg-primary-light dark:bg-purple-900/20 border-2 border-primary rounded-lg p-4 mt-4">
          <h3 className="font-bold text-primary-dark dark:text-primary-light mb-2">You're Seen</h3>
          <p className="text-sm text-primary-dark dark:text-primary-light">
            WPL is designed to support complex health needs. The more you share, the safer and more accurate your meal recommendations will be.
          </p>
        </div>
        <div className="bg-error-light dark:bg-error-dark/20 border-2 border-error rounded-lg p-4 mt-4">
          <h3 className="font-bold text-error-dark dark:text-error-light mb-2">Why This Matters</h3>
          <ul className="text-sm text-error-dark dark:text-error-light space-y-1 text-left list-none">
            <li>❌ Skip allergies → We might suggest peanuts to someone with severe allergy</li>
            <li>❌ Skip diabetes → We might suggest 80g carb meals causing blood sugar spikes</li>
            <li>❌ Skip dietary needs → We might suggest meat to vegetarians</li>
          </ul>
          <p className="text-sm text-error-dark dark:text-error-light font-bold mt-3 text-center">
            If you skip this step, meal suggestions will NOT be personalized or safe.
          </p>
        </div>
      </div>

      {/* BMI Health Risk Assessment */}
      {bmiData && healthRisk && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-400 dark:border-orange-600 rounded-lg p-5">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-2">Your Health Profile</h3>
              <div className="space-y-1">
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  Your BMI: <strong>{bmiData.bmi.toFixed(1)}</strong> ({healthRisk.bmiCategory})
                </p>
                {healthRisk.warnings.map((warning, i) => (
                  <p key={i} className="text-xs text-orange-700 dark:text-orange-400">• {warning}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lifestyle Reality Check */}
      <div className="space-y-4">
        <div className="bg-primary-light dark:bg-purple-900/20 border-2 border-primary rounded-lg p-4">
          <h3 className="font-medium text-primary-dark dark:text-primary-light mb-1">🔒 Lifestyle Reality Check</h3>
          <p className="text-sm text-primary-dark dark:text-primary-light">
            Your lifestyle affects your metabolism and calorie needs. We need honest answers for safe, accurate recommendations.
            <strong> Remember: This is about ACCOUNTABILITY, not judgment.</strong>
          </p>
        </div>

        {/* Smoking/Tobacco */}
        <div>
          <label className="text-label block mb-2">Smoking/Tobacco Use</label>
          <div className="space-y-2">
            {[
              { value: 'never', label: 'No, never smoked' },
              { value: 'quit-recent', label: 'No, quit within last 6 months ⚠️' },
              { value: 'quit-old', label: 'No, quit over 6 months ago' },
              { value: 'current-light', label: 'Yes, less than 10 cigarettes/day' },
              { value: 'current-heavy', label: 'Yes, 10+ cigarettes/day (1+ pack)' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateData({ smoking: option.value as any })}
                className={`w-full p-3 border-2 rounded-lg text-left transition-all text-sm ${
                  data.smoking === option.value
                    ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {(data.smoking === 'current-light' || data.smoking === 'current-heavy') && (
            <p className="text-xs text-warning dark:text-warning-light mt-2">
              ⚠️ Smokers burn 200-300 extra cal/day. If you quit during your journey, expect 5-10 lb weight gain from metabolic slowdown.
            </p>
          )}
          {data.smoking === 'quit-recent' && (
            <p className="text-xs text-warning dark:text-warning-light mt-2">
              ⚠️ Recent quitters have ~200 cal/day slower metabolism. Your calorie target will be adjusted accordingly.
            </p>
          )}
        </div>

        {/* Alcohol Consumption */}
        <div>
          <label className="text-label block mb-2">Alcohol Consumption</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Frequency</label>
              <select
                value={data.alcoholFrequency || 'never'}
                onChange={(e) => updateData({ alcoholFrequency: e.target.value as any })}
                className="form-input w-full"
              >
                <option value="never">Never / Rarely</option>
                <option value="light">1-2 times per week</option>
                <option value="moderate">3-4 times per week</option>
                <option value="heavy">5+ times per week (daily)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Drinks per week</label>
              <input
                type="number"
                min="0"
                max="50"
                value={data.weeklyDrinks || 0}
                onChange={(e) => updateData({ weeklyDrinks: parseInt(e.target.value) || 0 })}
                className="form-input w-full"
                placeholder="0"
              />
            </div>
          </div>
          {data.weeklyDrinks && data.weeklyDrinks > 0 && (
            <p className="text-xs text-warning dark:text-warning-light mt-2">
              ⚠️ Alcohol Impact: ~{Math.round((data.weeklyDrinks * 150) / 7)} hidden cal/day from drinks.
              Each drink = 150 cal + 24 hours of reduced fat burning.
            </p>
          )}
        </div>

        {/* Recreational Drug Use */}
        <div>
          <label className="text-label block mb-2">
            Recreational Drug Use
            <span className="text-xs text-muted-foreground ml-2">(Private & confidential)</span>
          </label>
          <div className="space-y-2">
            {[
              { value: 'no', label: 'No' },
              { value: 'occasional', label: 'Yes, occasionally (1-2 times/month)' },
              { value: 'regular', label: 'Yes, regularly (weekly or more)' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateData({ recreationalDrugs: option.value as any })}
                className={`w-full p-3 border-2 rounded-lg text-left transition-all text-sm ${
                  data.recreationalDrugs === option.value
                    ? 'border-primary bg-primary-light dark:bg-purple-900/20 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            🔒 Your data is encrypted and never shared. We ask because marijuana increases appetite and
            stimulants artificially suppress it, affecting tracking accuracy.
          </p>
        </div>
      </div>

      {/* Medications Scanner - Universal (Before Conditions) */}
      <div className="space-y-4">
        <div className="bg-primary-light dark:bg-purple-900/20 border-2 border-primary rounded-lg p-4">
          <h3 className="font-medium text-primary-dark dark:text-primary-light mb-1">📷 Scan Your Medications</h3>
          <p className="text-sm text-primary-dark dark:text-primary-light">
            Scan all your prescription bottles - WPL will identify what conditions they treat. This helps caregivers and family members who may not know medication details.
          </p>
        </div>

        <MedicationList
          medications={(data.medications || []) as PatientMedication[]}
          onChange={(medications) => updateData({ medications: medications as any })}
          label="Your Medications"
          description="Scan prescription labels with NDC barcode or OCR. WPL will auto-suggest health conditions based on your medications."
        />

        {/* Show suggested conditions from medications */}
        {suggestedConditions.length > 0 && (
          <div className="bg-success-light dark:bg-green-900/20 border-2 border-green-400 dark:border-success rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
              ✓ WPL identified conditions from your medications:
            </h4>
            <ul className="space-y-1">
              {suggestedConditions.map((suggestion, index) => (
                <li key={index} className="text-sm text-green-800 dark:text-green-300">
                  • <strong>{suggestion.condition}</strong> (from {suggestion.medications.join(', ')}) - {suggestion.confidence}% confidence
                </li>
              ))}
            </ul>
            <p className="text-xs text-success-dark dark:text-green-400 mt-2">
              These conditions have been automatically selected below. You can modify them if needed.
            </p>
          </div>
        )}

        {isClassifyingMeds && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Analyzing medications...</p>
          </div>
        )}
      </div>

      {/* Health Conditions - BMI-Suggested + Other Conditions */}
      <div>
        {/* BMI-Suggested Conditions */}
        {healthRisk && healthRisk.likelyConditions.length > 0 && (
          <div className="mb-6">
            <label className="text-label block mb-2">
              Health Conditions Based on Your Profile
              <span className="text-xs text-warning dark:text-warning-light ml-2">
                (Pre-selected based on your BMI - uncheck if not applicable)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {healthRisk.likelyConditions.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => toggleHealthCondition(condition)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                    data.healthConditions?.includes(condition)
                      ? 'border-warning bg-warning-light dark:bg-warning-dark/20 text-warning-dark dark:text-warning-light font-medium'
                      : 'border-warning/30 dark:border-warning/50 hover:border-warning/50 dark:hover:border-warning/70 text-warning-dark dark:text-warning-light/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{condition}</span>
                    {hasDetailedQuestionnaire(condition) && (
                      <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded ml-1">?</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These conditions are common at your BMI category and affect your calorie targets for safe weight loss.
            </p>
          </div>
        )}

        {/* Other Conditions */}
        <div>
          <label className="text-label block mb-2">
            Other Health Conditions
            <span className="text-xs text-muted-foreground ml-2">
              (Select any that apply to you)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {healthRisk?.otherConditions.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => toggleHealthCondition(condition)}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                  data.healthConditions?.includes(condition)
                    ? 'border-primary bg-primary-light dark:bg-purple-900/20 text-primary dark:text-primary-light font-medium'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{condition}</span>
                  {hasDetailedQuestionnaire(condition) && (
                    <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded ml-1">?</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            WPL uses this information to ensure meal suggestions are safe for your specific health needs.
          </p>
        </div>
      </div>

      {/* Dietary Preferences */}
      <div>
        <label className="text-label block mb-3">
          Dietary Preferences <span className="text-error">*</span>
          <span className="text-xs text-muted-foreground ml-2">(Select all that apply, or "None")</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* Explicit "None" option */}
          <button
            type="button"
            onClick={() => updateData({ dietaryPreferences: [] })}
            className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
              data.dietaryPreferences?.length === 0
                ? 'border-success bg-success-light dark:bg-success-dark/20 text-success-dark dark:text-success-light font-bold'
                : 'border-border hover:border-success/50'
            }`}
          >
            ✓ None (No restrictions)
          </button>
          {dietaryOptions.map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => toggleDietaryPref(pref)}
              className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                data.dietaryPreferences?.includes(pref)
                  ? 'border-primary bg-primary-light dark:bg-purple-900/20 text-primary dark:text-primary-light'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>

      {/* Food Allergies */}
      <div>
        <label className="text-label block mb-3">
          Food Allergies <span className="text-error">*</span>
          <span className="text-xs text-muted-foreground ml-2">(Select all that apply, or "None")</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* Explicit "None" option */}
          <button
            type="button"
            onClick={() => updateData({ foodAllergies: [] })}
            className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
              data.foodAllergies?.length === 0
                ? 'border-success bg-success-light dark:bg-success-dark/20 text-success-dark dark:text-success-light font-bold'
                : 'border-border hover:border-success/50'
            }`}
          >
            ✓ None (No allergies)
          </button>
          {commonAllergies.map((allergy) => (
            <button
              key={allergy}
              type="button"
              onClick={() => toggleAllergy(allergy)}
              className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                data.foodAllergies?.includes(allergy)
                  ? 'border-error bg-error-light dark:bg-error-dark/20 text-error dark:text-error-light'
                  : 'border-border hover:border-error/50'
              }`}
            >
              {allergy}
            </button>
          ))}
        </div>
      </div>

      {/* Accountability Message */}
      <div className="bg-error-light dark:bg-error-dark/20 border-2 border-error rounded-lg p-4">
        <h3 className="font-medium text-error-dark dark:text-error-light mb-2">⚠️ Why Honesty Matters</h3>
        <ul className="text-sm text-error-dark dark:text-error-light space-y-1 list-disc list-inside">
          <li>If you have diabetes and don't tell us, we might recommend dangerously low blood sugar levels</li>
          <li>If you drink 3 beers daily but don't report it, that's 450 hidden calories</li>
          <li>If you smoke and quit mid-journey, your metabolism will drop 250 cal/day unexpectedly</li>
        </ul>
        <p className="text-sm text-error-dark dark:text-error-light font-bold mt-3">
          Be honest - it's for YOUR safety and YOUR results.
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ⚕️ This is not a medical diagnosis. Consult your doctor for proper medical advice.
      </p>

      {/* Health Condition Modal */}
      {selectedCondition && (
        <HealthConditionModal
          questionnaire={getQuestionnaireForCondition(selectedCondition)!}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleModalSave}
          existingResponses={conditionResponses[selectedCondition]}
        />
      )}
    </div>
  )
}

// Step 6: Meal Schedule & Notifications
function StepSix({ data, updateData }: { data: OnboardingData; updateData: (data: Partial<OnboardingData>) => void }) {
  // Convert 24-hour time to 12-hour format with AM/PM
  const convertTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Handle notification toggle with auto-sync from meal schedule
  const handleNotificationToggle = () => {
    const newValue = !data.notifications

    if (newValue) {
      // Initialize reminder times from current meal schedule
      updateData({
        notifications: newValue,
        mealReminderTimes: {
          breakfast: convertTo12Hour(data.mealSchedule?.breakfastTime || '07:00'),
          lunch: convertTo12Hour(data.mealSchedule?.lunchTime || '12:00'),
          dinner: convertTo12Hour(data.mealSchedule?.dinnerTime || '18:00'),
          snacks: data.mealSchedule?.hasSnacks ? convertTo12Hour(data.mealSchedule.snackWindows?.[0] || '15:00') : undefined
        }
      })
    } else {
      updateData({ notifications: newValue })
    }
  }

  // Update meal schedule time and auto-sync reminder
  const updateMealTime = (meal: 'breakfastTime' | 'lunchTime' | 'dinnerTime', time: string) => {
    const mealKey = meal.replace('Time', '') as 'breakfast' | 'lunch' | 'dinner'

    updateData({
      mealSchedule: {
        ...data.mealSchedule!,
        [meal]: time
      },
      // Auto-sync reminder times if notifications enabled
      mealReminderTimes: data.notifications ? {
        ...data.mealReminderTimes,
        [mealKey]: convertTo12Hour(time)
      } : data.mealReminderTimes
    })
  }

  // Toggle snacks and auto-sync reminder
  const toggleSnacks = () => {
    const newHasSnacks = !data.mealSchedule?.hasSnacks
    const defaultSnackTime = '15:00'

    updateData({
      mealSchedule: {
        ...data.mealSchedule!,
        hasSnacks: newHasSnacks,
        snackWindows: newHasSnacks ? [defaultSnackTime] : []
      },
      // Auto-sync snack reminder if notifications enabled
      mealReminderTimes: data.notifications ? {
        ...data.mealReminderTimes,
        snacks: newHasSnacks ? convertTo12Hour(defaultSnackTime) : undefined
      } : data.mealReminderTimes
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2>Your meal schedule</h2>
        <p className="text-muted-foreground mt-2">Tell us when you typically eat - this helps us suggest the right meal at the right time</p>
      </div>

      {/* Meal Schedule Times */}
      <div className="bg-card border-2 border-border rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">⏰</span>
          <div>
            <div className="font-medium">When do you typically eat?</div>
            <div className="text-xs text-muted-foreground">We'll use this to give you better meal suggestions</div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Breakfast Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌅</span>
              <div>
                <div className="text-sm font-medium">Breakfast</div>
                <div className="text-xs text-muted-foreground">Morning meal</div>
              </div>
            </div>
            <input
              type="time"
              value={data.mealSchedule?.breakfastTime || '07:00'}
              onChange={(e) => updateMealTime('breakfastTime', e.target.value)}
              className="px-3 py-2 border border-border rounded text-sm bg-background text-foreground"
            />
          </div>

          {/* Lunch Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">☀️</span>
              <div>
                <div className="text-sm font-medium">Lunch</div>
                <div className="text-xs text-muted-foreground">Midday meal</div>
              </div>
            </div>
            <input
              type="time"
              value={data.mealSchedule?.lunchTime || '12:00'}
              onChange={(e) => updateMealTime('lunchTime', e.target.value)}
              className="px-3 py-2 border border-border rounded text-sm bg-background text-foreground"
            />
          </div>

          {/* Dinner Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌙</span>
              <div>
                <div className="text-sm font-medium">Dinner</div>
                <div className="text-xs text-muted-foreground">Evening meal</div>
              </div>
            </div>
            <input
              type="time"
              value={data.mealSchedule?.dinnerTime || '18:00'}
              onChange={(e) => updateMealTime('dinnerTime', e.target.value)}
              className="px-3 py-2 border border-border rounded text-sm bg-background text-foreground"
            />
          </div>

          {/* Snacks Toggle */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={toggleSnacks}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🍎</span>
                <div className="text-left">
                  <div className="text-sm font-medium">I eat snacks</div>
                  <div className="text-xs text-muted-foreground">Between meals</div>
                </div>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                data.mealSchedule?.hasSnacks ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  data.mealSchedule?.hasSnacks ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Enable Notifications */}
      <div className="bg-primary-light dark:bg-purple-900/20 border-2 border-primary rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔔</span>
            <div>
              <div className="font-medium">Enable Notifications</div>
              <div className="text-sm text-muted-foreground">Get reminders and updates</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNotificationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.notifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                data.notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Meal Reminder Times - Auto-set */}
      {data.notifications && (
        <div className="bg-muted rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-4">
            📅 We've set recommended meal reminder times for you. You can customize these later in your profile settings.
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
              { key: 'lunch', label: 'Lunch', emoji: '☀️' },
              { key: 'snacks', label: 'Snacks', emoji: '🍎' },
              { key: 'dinner', label: 'Dinner', emoji: '🌙' }
            ].map((meal) => (
              <div key={meal.key} className="flex items-center space-x-3 bg-card rounded-lg p-3 border border-border">
                <span className="text-2xl">{meal.emoji}</span>
                <div>
                  <div className="text-xs text-muted-foreground">{meal.label}</div>
                  <div className="text-sm font-semibold text-primary">
                    {data.mealReminderTimes?.[meal.key as keyof typeof data.mealReminderTimes] || 'Not set'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weight Check-in Frequency */}
      <div>
        <label className="text-label block mb-3">
          Weight Check-in Frequency
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'daily', label: 'Daily', emoji: '📅' },
            { value: 'weekly', label: 'Weekly', emoji: '📊' },
            { value: 'biweekly', label: 'Bi-weekly', emoji: '🗓️' },
            { value: 'monthly', label: 'Monthly', emoji: '📆' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ weightCheckInFrequency: option.value as any })}
              className={`p-3 border-2 rounded-lg transition-all ${
                data.weightCheckInFrequency === option.value
                  ? 'border-primary bg-primary-light dark:bg-purple-900/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-xl mb-1">{option.emoji}</div>
              <div className="text-sm font-medium">{option.label}</div>
            </button>
          ))}
        </div>
        <p className="text-caption mt-2">
          Recommended: Weekly (avoid daily fluctuations stress)
        </p>
      </div>

      {/* Summary */}
      <div className="bg-success-light dark:bg-success-dark/20 border-2 border-success rounded-lg p-4 mt-6">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">✨</span>
          <div>
            <div className="font-medium text-success-dark dark:text-success-light">You're all set!</div>
            <div className="text-sm text-success-dark dark:text-success-light mt-1">
              Click "Complete Setup" to start your weight loss journey. We've created a personalized plan just for you!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingRouter>
        <OnboardingContent />
      </OnboardingRouter>
    </AuthGuard>
  )
}
