/**
 * Supervised Vitals Wizard with AI Guidance
 *
 * Multi-step wizard that acts as an AI supervisor, guiding caregivers
 * through proper vital sign collection with real-time validation,
 * training prompts, and quality assurance checks.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import {
  validateVitalReading,
  getTrainingPrompt,
  runQualityChecks,
  detectAnomalies,
  getTaskGuidance,
  type VitalReading,
  type ValidationResult
} from '@/lib/ai-supervisor'
import { LightThemeWizardWrapper } from './LightThemeWizardWrapper'
import type { VitalSign } from '@/types/medical'
import { logger } from '@/lib/logger'
import { sendCriticalVitalAlert } from '@/lib/emergency-alerts'
import { useAuth } from '@/hooks/useAuth'
import VitalDatePicker from '../vitals/VitalDatePicker'
import { useVitalDatePicker } from '@/hooks/useVitalDatePicker'

interface SupervisedVitalsWizardProps {
  isOpen: boolean
  onClose: () => void
  familyMember: {
    id: string
    name: string
    age?: number
    conditions?: string[]
    createdAt?: string  // For date validation
  }
  recentReadings?: VitalReading[]
  onSubmit: (vitals: any) => Promise<void>
  onComplete?: (savedVitals: VitalSign[]) => void  // Callback with saved vitals for summary display
  caregivers?: Array<{
    id: string
    name: string
    relationship?: string
    userId?: string
  }>
}

type WizardStep = 'intro' | 'date_selection' | 'blood_pressure' | 'temperature' | 'pulse_oximeter' | 'blood_sugar' | 'weight' | 'review' | 'mood' | 'schedule' | 'confirmation'

interface SchedulePreferences {
  enabled: boolean
  vitalTypes: string[] // Which vitals to schedule (from what was logged)
  frequency: string // '1x', '2x', '4x', etc.
  times: string[] // ['08:00', '20:00']
  notificationChannels: {
    app: boolean
    email: boolean
    sms: boolean
  }
}

interface VitalData {
  bloodPressure?: { systolic: number; diastolic: number }
  temperature?: number
  pulseOximeterReading?: { spo2: number; pulseRate: number; perfusionIndex?: number }
  bloodSugar?: number
  weight?: number
  mood?: string
  moodNotes?: string
  notes?: string
  recordedDate?: Date  // User-selected date for backdate support
  timestamp: Date       // System timestamp (now uses recordedDate if set)
  schedulePreferences?: SchedulePreferences
  loggedBy?: {
    userId: string
    name: string
    relationship?: string
  }
}

export default function SupervisedVitalsWizard({
  isOpen,
  onClose,
  familyMember,
  recentReadings = [],
  onSubmit,
  onComplete,
  caregivers = []
}: SupervisedVitalsWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro')
  const [vitalData, setVitalData] = useState<VitalData>({ timestamp: new Date() })
  const [savedVitals, setSavedVitals] = useState<VitalSign[]>([])  // Track saved vitals for summary
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({})
  const [showGuidance, setShowGuidance] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTrainingMode, setShowTrainingMode] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const { user } = useAuth()

  // Use date picker hook for backdate support
  const datePicker = useVitalDatePicker({
    patientCreatedAt: familyMember.createdAt || new Date().toISOString(),
    userPlanTier: 'free', // TODO: Get from user subscription
    initialDate: new Date()
  })

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('intro')
      const now = new Date()
      setVitalData({ recordedDate: now, timestamp: now })
      setValidationResults({})
      setShowGuidance(true)
      datePicker.reset()
    }
  }, [isOpen])

  // Sync vitalData timestamp with datePicker selectedDate whenever it changes
  useEffect(() => {
    if (isOpen && datePicker.selectedDate) {
      const selectedDateTime = new Date(datePicker.selectedDate)
      setVitalData(prev => ({
        ...prev,
        recordedDate: selectedDateTime,
        timestamp: selectedDateTime
      }))
    }
  }, [isOpen, datePicker.selectedDate])

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isOpen && currentStep !== 'intro') {
      localStorage.setItem(
        `vitals_draft_${familyMember.id}`,
        JSON.stringify({ ...vitalData, step: currentStep })
      )
    }
  }, [vitalData, currentStep, familyMember.id, isOpen])

  // Check for existing draft on mount
  useEffect(() => {
    if (isOpen) {
      const draft = localStorage.getItem(`vitals_draft_${familyMember.id}`)
      if (draft) {
        const parsed = JSON.parse(draft)
        // Show option to resume draft
        logger.info('[Wizard] Found existing draft', { step: parsed.step })

        // CRITICAL: Update draft timestamp to TODAY to prevent duplicate date errors
        // The draft may be from yesterday, but vitals should default to today's date
        const today = new Date()
        setVitalData(prev => ({
          ...prev,
          recordedDate: today,
          timestamp: today
        }))
      }
    }
  }, [isOpen, familyMember.id])

  const validateCurrentReading = (type: VitalReading['type'], value: any) => {
    const reading: VitalReading = {
      type,
      value,
      unit: getUnitForType(type),
      timestamp: new Date(),
      familyMemberName: familyMember.name,
      age: familyMember.age,
      existingConditions: familyMember.conditions
    }

    const result = validateVitalReading(reading)
    setValidationResults(prev => ({ ...prev, [type]: result }))

    // Log validation for training/analytics
    logger.info('[AI Supervisor] Validated vital reading', {
      type,
      value,
      severity: result.severity,
      requiresConfirmation: result.requiresConfirmation
    })

    return result
  }

  const getUnitForType = (type: VitalReading['type']): string => {
    const units: Record<VitalReading['type'], string> = {
      blood_pressure: 'mmHg',
      temperature: '°F',
      heart_rate: 'bpm',
      oxygen_saturation: '%',
      pulse_oximeter: 'SpO₂% / bpm',
      weight: 'lbs',
      blood_sugar: 'mg/dL'
    }
    return units[type]
  }

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['intro', 'date_selection', 'blood_pressure', 'temperature', 'pulse_oximeter', 'blood_sugar', 'weight', 'mood', 'review', 'schedule', 'confirmation']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['intro', 'date_selection', 'blood_pressure', 'temperature', 'pulse_oximeter', 'blood_sugar', 'weight', 'mood', 'review', 'schedule', 'confirmation']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleSkipStep = () => {
    // Clear the current step's data when skipping to prevent stale/invalid data
    switch (currentStep) {
      case 'blood_pressure':
        setVitalData(prev => ({ ...prev, bloodPressure: undefined }))
        setValidationResults(prev => {
          const { blood_pressure, ...rest } = prev
          return rest
        })
        break
      case 'temperature':
        setVitalData(prev => ({ ...prev, temperature: undefined }))
        setValidationResults(prev => {
          const { temperature, ...rest } = prev
          return rest
        })
        break
      case 'pulse_oximeter':
        setVitalData(prev => ({ ...prev, pulseOximeterReading: undefined }))
        setValidationResults(prev => {
          const { pulse_oximeter, ...rest } = prev
          return rest
        })
        break
      case 'blood_sugar':
        setVitalData(prev => ({ ...prev, bloodSugar: undefined }))
        setValidationResults(prev => {
          const { blood_sugar, ...rest } = prev
          return rest
        })
        break
      case 'weight':
        setVitalData(prev => ({ ...prev, weight: undefined }))
        setValidationResults(prev => {
          const { weight, ...rest } = prev
          return rest
        })
        break
    }
    handleNext()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // PRE-FLIGHT VALIDATION: Check blood pressure if it exists
      if (vitalData.bloodPressure) {
        const { systolic, diastolic } = vitalData.bloodPressure
        if (!systolic || !diastolic || systolic <= diastolic) {
          alert('Invalid blood pressure values. Systolic must be greater than diastolic. Please go back and correct the values.')
          setIsSubmitting(false)
          return
        }
        // Additional range validation
        if (systolic < 40 || systolic > 300) {
          alert('Systolic value out of range (40-300 mmHg). Please go back and correct.')
          setIsSubmitting(false)
          return
        }
        if (diastolic < 20 || diastolic > 200) {
          alert('Diastolic value out of range (20-200 mmHg). Please go back and correct.')
          setIsSubmitting(false)
          return
        }
      }

      // PRE-FLIGHT VALIDATION: Check pulse oximeter if it exists
      if (vitalData.pulseOximeterReading) {
        const { spo2, pulseRate } = vitalData.pulseOximeterReading
        if (!spo2 || !pulseRate) {
          alert('Invalid pulse oximeter reading. Both SpO₂ and pulse rate are required.')
          setIsSubmitting(false)
          return
        }
        // Range validation
        if (spo2 < 70 || spo2 > 100) {
          alert('SpO₂ value out of range (70-100%). Please go back and correct.')
          setIsSubmitting(false)
          return
        }
        if (pulseRate < 30 || pulseRate > 220) {
          alert('Pulse rate out of range (30-220 bpm). Please go back and correct.')
          setIsSubmitting(false)
          return
        }
      }

      // Run quality checks (for info/warnings only - not blocking)
      const checks = runQualityChecks({
        type: 'vitals',
        ...vitalData,
        hasAbnormalReading: Object.values(validationResults).some(
          r => r.severity === 'warning' || r.severity === 'critical'
        )
      })

      // Log quality checks for analytics (not blocking submission)
      const warnings = checks.filter(c => c.severity === 'warning' && !c.passed)
      if (warnings.length > 0) {
        logger.warn('[Wizard] Quality check warnings', {
          warnings: warnings.map(w => ({ message: w.message, suggestion: w.suggestion }))
        })
      }

      // Submit vitals - use recordedDate if set, otherwise use timestamp
      // This ensures backdated vitals are recorded with the user-selected date
      const submissionData = {
        ...vitalData,
        timestamp: vitalData.recordedDate || vitalData.timestamp
      }

      // DEBUG: Log the timestamp being sent
      logger.info('[Wizard] Submitting vitals with timestamp', {
        recordedDate: vitalData.recordedDate?.toISOString(),
        timestamp: vitalData.timestamp?.toISOString(),
        finalTimestamp: submissionData.timestamp?.toISOString(),
        datePickerSelectedDate: datePicker.selectedDate
      })

      // onSubmit returns saved vitals from parent
      const result = await onSubmit(submissionData)
      const submittedVitals = result as VitalSign[] | undefined

      // Call onComplete callback if provided (parent will handle refetch and summary display)
      if (onComplete && submittedVitals && submittedVitals.length > 0) {
        onComplete(submittedVitals)
      }

      // Clear draft
      localStorage.removeItem(`vitals_draft_${familyMember.id}`)

      // Go to schedule step instead of directly to confirmation
      setCurrentStep('schedule')
    } catch (error) {
      logger.error('[Wizard] Failed to submit vitals', error instanceof Error ? error : undefined)
      alert(`Failed to save vitals: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAlertFamily = async () => {
    setSendingAlert(true)

    try {
      // Gather critical readings
      const criticalReadings: any = {}
      if (vitalData.bloodPressure) {
        criticalReadings.bloodPressure = `${vitalData.bloodPressure.systolic}/${vitalData.bloodPressure.diastolic} mmHg`
      }
      if (vitalData.temperature) {
        criticalReadings.temperature = `${vitalData.temperature}°F`
      }
      if (vitalData.pulseOximeterReading) {
        criticalReadings.pulseOximeter = `${vitalData.pulseOximeterReading.spo2}% SpO₂, ${vitalData.pulseOximeterReading.pulseRate} bpm`
      }
      if (vitalData.bloodSugar) {
        criticalReadings.bloodSugar = `${vitalData.bloodSugar} mg/dL`
      }

      // Find the most critical reading
      const criticalValidations = Object.entries(validationResults).filter(
        ([_, v]) => v.severity === 'critical'
      )
      const mostCritical = criticalValidations[0] || Object.entries(validationResults)[0]

      const [vitalType, validation] = mostCritical
      const vitalValue = criticalReadings[vitalType as keyof typeof criticalReadings]

      // Determine if emergency services are needed
      const requiresEmergencyServices = validation.message.includes('911') ||
        validation.message.includes('EMERGENCY') ||
        validation.message.includes('CRISIS')

      // Send alert
      const result = await sendCriticalVitalAlert(
        familyMember.id,
        familyMember.name,
        criticalReadings,
        vitalType,
        vitalValue,
        validation.guidance,
        {
          uid: user?.uid || 'unknown',
          name: user?.displayName || 'Caregiver',
          role: 'caregiver'
        },
        requiresEmergencyServices
      )

      if (result.success) {
        logger.info('[Wizard] Emergency alert sent successfully', {
          notificationsSent: result.notificationsSent
        })
        alert(`✅ Alert sent to ${result.notificationsSent} family member(s) and caregiver(s)`)
      } else {
        logger.error('[Wizard] Failed to send emergency alert')
        alert('❌ Failed to send alert. Please call family members directly.')
      }
    } catch (error) {
      logger.error('[Wizard] Error sending emergency alert', error instanceof Error ? error : undefined)
      alert('❌ Error sending alert. Please call family members directly.')
    } finally {
      setSendingAlert(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <IntroStep
            familyMember={familyMember}
            caregivers={caregivers}
            currentUser={user}
            selectedCaregiver={vitalData.loggedBy}
            onCaregiverSelect={(caregiver) => {
              setVitalData({ ...vitalData, loggedBy: caregiver })
            }}
            onNext={handleNext}
          />
        )

      case 'date_selection':
        return (
          <DateSelectionStep
            selectedDate={datePicker.selectedDate}
            isValid={datePicker.isValid}
            error={datePicker.error}
            isBackdated={datePicker.isBackdated}
            daysDifference={datePicker.daysDifference}
            familyMember={familyMember}
            onDateChange={(date) => {
              datePicker.setDate(date)
              // date is already an ISO string from VitalDatePicker, store it directly as Date
              setVitalData(prev => ({ ...prev, recordedDate: new Date(date), timestamp: new Date(date) }))
            }}
            onNext={handleNext}
          />
        )

      case 'blood_pressure':
        return (
          <BloodPressureStep
            value={vitalData.bloodPressure}
            onChange={(bp) => {
              setVitalData(prev => ({ ...prev, bloodPressure: bp }))
              validateCurrentReading('blood_pressure', bp)
            }}
            validation={validationResults.blood_pressure}
            showGuidance={showGuidance}
            familyMember={familyMember}
          />
        )

      case 'temperature':
        return (
          <TemperatureStep
            value={vitalData.temperature}
            onChange={(temp) => {
              setVitalData(prev => ({ ...prev, temperature: temp }))
              validateCurrentReading('temperature', temp)
            }}
            validation={validationResults.temperature}
            showGuidance={showGuidance}
          />
        )

      case 'pulse_oximeter':
        return (
          <PulseOximeterStep
            value={vitalData.pulseOximeterReading}
            onChange={(reading) => {
              setVitalData(prev => ({ ...prev, pulseOximeterReading: reading }))
              if (reading) {
                validateCurrentReading('pulse_oximeter', reading)
              }
            }}
            validation={validationResults.pulse_oximeter}
            showGuidance={showGuidance}
          />
        )

      case 'blood_sugar':
        return (
          <BloodSugarStep
            value={vitalData.bloodSugar}
            onChange={(bs) => {
              setVitalData(prev => ({ ...prev, bloodSugar: bs }))
              validateCurrentReading('blood_sugar', bs)
            }}
            validation={validationResults.blood_sugar}
            showGuidance={showGuidance}
          />
        )

      case 'weight':
        return (
          <WeightStep
            value={vitalData.weight}
            onChange={(w) => {
              setVitalData(prev => ({ ...prev, weight: w }))
              validateCurrentReading('weight', w)
            }}
            validation={validationResults.weight}
            showGuidance={showGuidance}
          />
        )

      case 'mood':
        return (
          <MoodStep
            value={vitalData.mood}
            moodNotes={vitalData.moodNotes}
            onChange={(mood) => setVitalData(prev => ({ ...prev, mood }))}
            onNotesChange={(moodNotes) => setVitalData(prev => ({ ...prev, moodNotes }))}
            familyMember={familyMember}
            onNext={handleNext}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )

      case 'review':
        return (
          <ReviewStep
            vitalData={vitalData}
            validationResults={validationResults}
            familyMember={familyMember}
            onNotesChange={(notes) => setVitalData(prev => ({ ...prev, notes }))}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        )

      case 'schedule':
        return (
          <ScheduleStep
            vitalData={vitalData}
            familyMember={familyMember}
            onScheduleChange={(schedulePreferences) =>
              setVitalData(prev => ({ ...prev, schedulePreferences }))
            }
            onNext={handleNext}
          />
        )

      case 'confirmation':
        return <ConfirmationStep familyMember={familyMember} vitalData={vitalData} onClose={onClose} />

      default:
        return null
    }
  }

  // Progress indicator
  const stepOrder: WizardStep[] = ['intro', 'date_selection', 'blood_pressure', 'temperature', 'pulse_oximeter', 'blood_sugar', 'weight', 'mood', 'review']
  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Vitals Check</h2>
            <p className="text-sm text-muted-foreground mt-1">for {familyMember.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        {currentStep !== 'confirmation' && (
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStepIndex + 1} of {stepOrder.length}</span>
              <span className="text-sm text-muted-foreground capitalize">
                {currentStep.replace('_', ' ')}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Training Mode Toggle */}
        {currentStep !== 'intro' && currentStep !== 'confirmation' && currentStep !== 'date_selection' && (
          <div className="bg-accent-light border-b border-accent/20 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-accent-dark" />
                <span className="text-sm font-medium text-accent-dark">
                  Training Mode
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidance(!showGuidance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showGuidance ? 'bg-accent' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={showGuidance}
                aria-label="Toggle training guidance"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showGuidance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <LightThemeWizardWrapper>
          <div className="px-6 py-6">
            {renderStepContent()}
          </div>
        </LightThemeWizardWrapper>

        {/* Footer Navigation */}
        {currentStep !== 'confirmation' && currentStep !== 'intro' && currentStep !== 'review' && currentStep !== 'schedule' && currentStep !== 'date_selection' && (
          <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex justify-between">
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleSkipStep}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Next
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function IntroStep({
  familyMember,
  caregivers,
  currentUser,
  selectedCaregiver,
  onCaregiverSelect,
  onNext
}: {
  familyMember: any
  caregivers: Array<{
    id: string
    name: string
    relationship?: string
    userId?: string
  }>
  currentUser: any
  selectedCaregiver?: {
    userId: string
    name: string
    relationship?: string
  }
  onCaregiverSelect: (caregiver: { userId: string; name: string; relationship?: string }) => void
  onNext: () => void
}) {
  const guidance = getTaskGuidance('blood_pressure')

  // Build list of available caregivers including the patient and caregivers
  console.log('IntroStep - Available caregivers prop:', caregivers)

  const availableCaregivers = [
    // Include the patient themselves as an option
    {
      userId: familyMember.id, // Use patient ID
      name: `${familyMember.name} (Self)`,
      relationship: 'self'
    },
    // Include all caregivers
    ...caregivers
      .filter(c => {
        const hasUserId = !!c.userId
        if (!hasUserId) {
          console.log('Caregiver filtered out (no userId):', c)
        }
        return hasUserId
      })
      .map(c => ({
        userId: c.userId!,
        name: c.name,
        relationship: c.relationship
      }))
  ]

  console.log('IntroStep - Final available caregivers:', availableCaregivers)

  // Auto-select patient (self) if no caregiver selected yet
  useEffect(() => {
    if (!selectedCaregiver && availableCaregivers.length > 0) {
      onCaregiverSelect(availableCaregivers[0]) // Default to patient (self)
    }
  }, [selectedCaregiver, availableCaregivers.length, onCaregiverSelect])

  return (
    <div className="space-y-2">
      <div className="text-center">
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-base">🩺</span>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">
          Let's Check Vitals for {familyMember.name}
        </h3>
        <p className="text-gray-700 font-medium text-sm">
          I'll guide you through each measurement step-by-step
        </p>
      </div>

      {/* Caregiver Selection */}
      {availableCaregivers.length > 0 && (
        <div className="bg-gray-50 rounded-md p-2 border-2 border-gray-300">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Who is performing this vitals check?
          </label>
          <select
            value={selectedCaregiver?.userId || ''}
            onChange={(e) => {
              const caregiver = availableCaregivers.find(c => c.userId === e.target.value)
              if (caregiver) {
                onCaregiverSelect(caregiver)
              }
            }}
            className="w-full px-2 py-1.5 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none text-gray-900 text-base"
          >
            {availableCaregivers.map((caregiver) => (
              <option key={caregiver.userId} value={caregiver.userId}>
                {caregiver.name}
                {caregiver.relationship && caregiver.relationship !== 'self'
                  ? ` (${caregiver.relationship})`
                  : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-blue-50 rounded-md p-2 border-2 border-blue-400">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="w-4 h-4 text-blue-800 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1 text-sm">
              Before We Start
            </h4>
            <ul className="space-y-1 text-sm text-gray-900">
              {guidance.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-medium">{index + 1}.</span>
                  <span>{step.replace(/^\d+\.\s/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onNext}
          className="w-full px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium flex items-center justify-center gap-2 text-base"
        >
          Start Vitals Check
          <ArrowRightIcon className="w-4 h-4" />
        </button>
        <p className="text-xs text-center text-gray-700 font-medium">
          You can skip any measurement you don't need to take today
        </p>
      </div>
    </div>
  )
}

function DateSelectionStep({
  selectedDate,
  isValid,
  error,
  isBackdated,
  daysDifference,
  familyMember,
  onDateChange,
  onNext
}: {
  selectedDate: string
  isValid: boolean
  error: string | null
  isBackdated: boolean
  daysDifference: number
  familyMember: any
  onDateChange: (date: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="text-center">
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-base">📅</span>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">
          When Were These Vitals Taken?
        </h3>
        <p className="text-gray-700 font-medium text-sm">
          Select the date for {familyMember.name}'s vital readings
        </p>
      </div>

      <VitalDatePicker
        value={selectedDate}
        onChange={onDateChange}
        patientCreatedAt={familyMember.createdAt || new Date().toISOString()}
        userPlanTier="free"
        label="Recording Date"
        helperText="Select today or a previous date"
        required
      />

      {isBackdated && isValid && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-md p-2">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1 text-sm">
                Backdated Entry
              </h4>
              <p className="text-sm text-amber-900">
                This entry will be marked as backdated by <strong>{daysDifference} day{daysDifference !== 1 ? 's' : ''}</strong>.
                All backdated entries are tracked for compliance purposes.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-md p-2 border-2 border-blue-400">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="w-4 h-4 text-blue-800 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1 text-sm">
              Why We Ask
            </h4>
            <p className="text-sm text-gray-900">
              Recording the actual date helps track health trends accurately. If you're logging vitals from a previous day, that's okay - just select the correct date.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-end pt-2 border-t border-gray-200">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          Next
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface StepProps {
  value?: any
  onChange: (value: any) => void
  validation?: ValidationResult
  showGuidance: boolean
}

function BloodPressureStep({ value, onChange, validation, showGuidance, familyMember }: StepProps & { familyMember: any }) {
  const [systolic, setSystolic] = useState(value?.systolic?.toString() || '')
  const [diastolic, setDiastolic] = useState(value?.diastolic?.toString() || '')

  const handleUpdate = (sys: string, dia: string) => {
    // If both fields are empty, clear the blood pressure data
    if (sys === '' && dia === '') {
      onChange(undefined)
      return
    }

    const sysNum = parseInt(sys)
    const diaNum = parseInt(dia)

    // Only update if both values are valid positive numbers
    if (!isNaN(sysNum) && !isNaN(diaNum) && sysNum > 0 && diaNum > 0) {
      // Additional validation: systolic must be greater than diastolic
      if (sysNum <= diaNum) {
        // Don't call onChange with invalid data
        // The inline warning will show feedback to the user
        return
      }
      onChange({ systolic: sysNum, diastolic: diaNum })
    } else {
      // If one or both values are incomplete, clear the data
      onChange(undefined)
    }
  }

  // Add real-time validation feedback
  const hasValues = systolic !== '' && diastolic !== ''
  const systolicNum = parseInt(systolic)
  const diastolicNum = parseInt(diastolic)
  const showSwapWarning = hasValues &&
    !isNaN(systolicNum) &&
    !isNaN(diastolicNum) &&
    systolicNum > 0 &&
    diastolicNum > 0 &&
    systolicNum <= diastolicNum

  const trainingPrompt = getTrainingPrompt('blood_pressure_first_time')

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">Blood Pressure</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter the systolic (top) and diastolic (bottom) readings
        </p>
      </div>

      {showGuidance && trainingPrompt && (
        <div className="bg-purple-50 rounded-md p-2 border-2 border-purple-400">
          <div className="flex items-start gap-2">
            <AcademicCapIcon className="w-4 h-4 text-purple-800 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-1 text-sm">
                {trainingPrompt.topic}
              </h4>
              <p className="text-sm text-purple-900 font-medium">
                {trainingPrompt.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Systolic (top)
          </label>
          <input
            type="number"
            value={systolic}
            onChange={(e) => {
              setSystolic(e.target.value)
              handleUpdate(e.target.value, diastolic)
            }}
            placeholder=""
            className="w-full px-2 py-1.5 text-base font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none"
            aria-describedby="systolic-hint"
            enterKeyHint="next"
            inputMode="numeric"
          />
          <p id="systolic-hint" className="text-xs text-gray-700 mt-1 text-center font-medium">Top number (typically 90-140 mmHg)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Diastolic (bottom)
          </label>
          <input
            type="number"
            value={diastolic}
            onChange={(e) => {
              setDiastolic(e.target.value)
              handleUpdate(systolic, e.target.value)
            }}
            placeholder=""
            className="w-full px-2 py-1.5 text-base font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none"
            aria-describedby="diastolic-hint"
            enterKeyHint="done"
            inputMode="numeric"
          />
          <p id="diastolic-hint" className="text-xs text-gray-700 mt-1 text-center font-medium">Bottom number (typically 60-90 mmHg)</p>
        </div>
      </div>

      {/* Inline validation warning for swapped values */}
      {showSwapWarning && (
        <div className="rounded-md p-2 border-2 bg-yellow-50 border-yellow-500">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-800 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-warning-dark mb-1 text-sm">Values May Be Swapped</p>
              <p className="text-sm text-foreground">
                Systolic (top number) should be HIGHER than diastolic (bottom number).
                Your current values: {systolicNum}/{diastolicNum}.
                Did you mean {diastolicNum}/{systolicNum}?
              </p>
            </div>
          </div>
        </div>
      )}

      {validation && (
        <ValidationAlert validation={validation} />
      )}
    </div>
  )
}

function TemperatureStep({ value, onChange, validation, showGuidance }: StepProps) {
  const [temp, setTemp] = useState(value || '')

  const handleChange = (val: string) => {
    setTemp(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      onChange(num)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Temperature</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter temperature in Fahrenheit
        </p>
      </div>

      <div>
        <input
          type="number"
          step="0.1"
          value={temp}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-2 py-1.5 text-base font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none"
          aria-describedby="temp-hint"
          enterKeyHint="done"
          inputMode="decimal"
        />
        <p id="temp-hint" className="text-sm text-gray-700 mt-1 text-center font-medium">Enter temperature (°F, typically 97-99°F)</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-md p-2 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Normal range:</strong> 97°F - 99°F<br />
            🌡️ <strong>Fever:</strong> 100.4°F or higher
          </p>
        </div>
      )}
    </div>
  )
}

function PulseOximeterStep({ value, onChange, validation, showGuidance }: StepProps) {
  const [spo2, setSpo2] = useState(value?.spo2?.toString() || '')
  const [pulseRate, setPulseRate] = useState(value?.pulseRate?.toString() || '')
  const [perfusionIndex, setPerfusionIndex] = useState(value?.perfusionIndex?.toString() || '')

  const handleUpdate = (spo2Val: string, pulseVal: string, perfusionVal: string) => {
    // If both required fields are empty, clear the data
    if (spo2Val === '' && pulseVal === '') {
      onChange(undefined)
      return
    }

    const spo2Num = parseInt(spo2Val)
    const pulseNum = parseInt(pulseVal)
    const perfusionNum = perfusionVal ? parseFloat(perfusionVal) : undefined

    // Only update if both required values are valid positive numbers
    if (!isNaN(spo2Num) && !isNaN(pulseNum) && spo2Num > 0 && pulseNum > 0) {
      onChange({
        spo2: spo2Num,
        pulseRate: pulseNum,
        perfusionIndex: perfusionNum
      })
    } else {
      // If one or both values are incomplete, clear the data
      onChange(undefined)
    }
  }

  const trainingPrompt = getTrainingPrompt('pulse_oximeter_first_time')

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">Pulse Oximeter Reading</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter both SpO₂ and pulse rate from your pulse oximeter
        </p>
      </div>

      {showGuidance && trainingPrompt && (
        <div className="bg-purple-50 rounded-md p-2 border-2 border-purple-400">
          <div className="flex items-start gap-2">
            <AcademicCapIcon className="w-4 h-4 text-purple-800 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-1 text-sm">
                {trainingPrompt.topic}
              </h4>
              <p className="text-sm text-purple-900 font-medium">
                {trainingPrompt.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SpO2 and Pulse Rate - Side by side like Blood Pressure */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            SpO₂ (Oxygen)
          </label>
          <input
            type="number"
            value={spo2}
            onChange={(e) => {
              setSpo2(e.target.value)
              handleUpdate(e.target.value, pulseRate, perfusionIndex)
            }}
            placeholder=""
            min="70"
            max="100"
            className="w-full px-2 py-1.5 text-base font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none"
            aria-describedby="spo2-hint"
            enterKeyHint="next"
            inputMode="numeric"
          />
          <p id="spo2-hint" className="text-xs text-gray-700 mt-1 text-center font-medium">
            Oxygen saturation (typically 95-100%)
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Pulse Rate
          </label>
          <input
            type="number"
            value={pulseRate}
            onChange={(e) => {
              setPulseRate(e.target.value)
              handleUpdate(spo2, e.target.value, perfusionIndex)
            }}
            placeholder=""
            min="30"
            max="220"
            className="w-full px-2 py-1.5 text-base font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none"
            aria-describedby="pulse-hint"
            enterKeyHint="next"
            inputMode="numeric"
          />
          <p id="pulse-hint" className="text-xs text-gray-700 mt-1 text-center font-medium">
            Heart rate (typically 60-100 bpm)
          </p>
        </div>
      </div>

      {/* Perfusion Index - Optional, full width */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Perfusion Index (Optional)
        </label>
        <input
          type="number"
          step="0.1"
          value={perfusionIndex}
          onChange={(e) => {
            setPerfusionIndex(e.target.value)
            handleUpdate(spo2, pulseRate, e.target.value)
          }}
          placeholder=""
          min="0"
          max="20"
          className="w-full px-2 py-1.5 text-base font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-md focus:border-primary focus:outline-none"
          aria-describedby="perfusion-hint"
          enterKeyHint="done"
          inputMode="decimal"
        />
        <p id="perfusion-hint" className="text-xs text-gray-700 mt-1 text-center font-medium">
          Perfusion strength (optional, 0-20%)
        </p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-md p-2 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Normal SpO₂:</strong> 95-100%<br />
            ❤️ <strong>Normal Pulse:</strong> 60-100 bpm at rest<br />
            🫁 <strong>Low oxygen:</strong> Below 90% requires medical attention
          </p>
        </div>
      )}
    </div>
  )
}

function HeartRateStep({ value, onChange, validation, showGuidance }: StepProps) {
  const [hr, setHr] = useState(value || '')

  const handleChange = (val: string) => {
    setHr(val)
    const num = parseInt(val)
    if (!isNaN(num) && num > 0) {
      onChange(num)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Heart Rate</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter pulse in beats per minute
        </p>
      </div>

      <div>
        <input
          type="number"
          value={hr}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-6 py-4 text-3xl font-bold text-center text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
          aria-describedby="hr-hint"
        />
        <p id="hr-hint" className="text-sm text-gray-700 mt-2 text-center font-medium">Heart rate (typically 60-100 bpm at rest)</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Normal range:</strong> 60-100 bpm at rest<br />
            ❤️ <strong>Tip:</strong> Count for 30 seconds and multiply by 2
          </p>
        </div>
      )}
    </div>
  )
}

function OxygenStep({ value, onChange, validation, showGuidance }: StepProps) {
  const [o2, setO2] = useState(value || '')

  const handleChange = (val: string) => {
    setO2(val)
    const num = parseInt(val)
    if (!isNaN(num) && num > 0 && num <= 100) {
      onChange(num)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">Oxygen Saturation</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter SpO2 percentage from pulse oximeter
        </p>
      </div>

      <div>
        <input
          type="number"
          value={o2}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          max="100"
          className="w-full px-6 py-4 text-3xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
          aria-describedby="o2-hint"
        />
        <p id="o2-hint" className="text-sm text-gray-700 mt-2 text-center font-medium">Oxygen saturation (typically 95-100%)</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Normal range:</strong> 95-100%<br />
            🫁 <strong>Low oxygen:</strong> Below 90% requires medical attention
          </p>
        </div>
      )}
    </div>
  )
}

function BloodSugarStep({ value, onChange, validation, showGuidance }: StepProps) {
  const [glucose, setGlucose] = useState(value || '')

  const handleChange = (val: string) => {
    setGlucose(val)
    const num = parseInt(val)
    if (!isNaN(num) && num > 0) {
      onChange(num)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">Blood Sugar</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter glucose reading from glucometer
        </p>
      </div>

      <div>
        <input
          type="number"
          value={glucose}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-2 py-1.5 text-base font-bold text-center bg-white border-2 border-border rounded-md focus:border-primary focus:outline-none"
          aria-describedby="glucose-hint"
          enterKeyHint="done"
          inputMode="numeric"
        />
        <p id="glucose-hint" className="text-sm text-gray-700 mt-1 text-center font-medium">Blood sugar (mg/dL, typically 80-130 fasting)</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-md p-2 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Target range:</strong> 80-130 mg/dL (fasting)<br />
            🩸 <strong>Critical:</strong> Below 70 or above 300 requires immediate action
          </p>
        </div>
      )}
    </div>
  )
}

function WeightStep({ value, onChange, validation, showGuidance }: StepProps) {
  const [weight, setWeight] = useState(value || '')

  const handleChange = (val: string) => {
    setWeight(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      onChange(num)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">Weight</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter current weight in pounds
        </p>
      </div>

      <div>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-2 py-1.5 text-base font-bold text-center bg-white border-2 border-border rounded-md focus:border-primary focus:outline-none"
          aria-describedby="weight-hint"
          enterKeyHint="done"
          inputMode="decimal"
        />
        <p id="weight-hint" className="text-sm text-gray-700 mt-1 text-center font-medium">Enter weight in pounds (lbs)</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-md p-2 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            ⚖️ <strong>Tip:</strong> Weigh yourself at the same time each day for consistency<br />
            📊 <strong>Note:</strong> Daily fluctuations of 1-2 lbs are normal
          </p>
        </div>
      )}
    </div>
  )
}

function ReviewStep({
  vitalData,
  validationResults,
  familyMember,
  onNotesChange,
  onSubmit,
  onBack,
  isSubmitting
}: {
  vitalData: VitalData
  validationResults: Record<string, ValidationResult>
  familyMember: any
  onNotesChange: (notes: string) => void
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
}) {
  const hasAbnormalReadings = Object.values(validationResults).some(
    v => v.severity === 'warning' || v.severity === 'critical'
  )

  const hasCriticalReadings = Object.values(validationResults).some(
    v => v.severity === 'critical'
  )

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">Review Vitals</h3>
        <p className="text-sm text-muted-foreground">
          Confirm all readings are correct before submitting
        </p>
      </div>

      <div className="space-y-2">
        {vitalData.bloodPressure && (
          <div className="flex items-center justify-between p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground text-sm">Blood Pressure</span>
            <span className="text-base font-bold text-foreground">
              {vitalData.bloodPressure.systolic}/{vitalData.bloodPressure.diastolic} mmHg
            </span>
          </div>
        )}

        {vitalData.temperature && (
          <div className="flex items-center justify-between p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground text-sm">Temperature</span>
            <span className="text-base font-bold text-foreground">
              {vitalData.temperature}°F
            </span>
          </div>
        )}

        {vitalData.pulseOximeterReading && (
          <div className="flex items-center justify-between p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground text-sm">Pulse Oximeter</span>
            <span className="text-base font-bold text-foreground">
              {vitalData.pulseOximeterReading.spo2}% SpO₂ / {vitalData.pulseOximeterReading.pulseRate} bpm
              {vitalData.pulseOximeterReading.perfusionIndex &&
                ` (PI: ${vitalData.pulseOximeterReading.perfusionIndex}%)`
              }
            </span>
          </div>
        )}

        {vitalData.bloodSugar && (
          <div className="flex items-center justify-between p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground text-sm">Blood Sugar</span>
            <span className="text-base font-bold text-foreground">
              {vitalData.bloodSugar} mg/dL
            </span>
          </div>
        )}

        {vitalData.weight && (
          <div className="flex items-center justify-between p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground text-sm">Weight</span>
            <span className="text-base font-bold text-foreground">
              {vitalData.weight} lbs
            </span>
          </div>
        )}

        {vitalData.mood && (
          <div className="flex items-center justify-between p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground text-sm">Mood</span>
            <span className="text-base font-bold text-foreground capitalize">
              {vitalData.mood === 'happy' && '😊 Happy'}
              {vitalData.mood === 'calm' && '😌 Calm'}
              {vitalData.mood === 'okay' && '😐 Okay'}
              {vitalData.mood === 'worried' && '😟 Worried'}
              {vitalData.mood === 'sad' && '😢 Sad'}
              {vitalData.mood === 'pain' && '😫 Pain'}
            </span>
          </div>
        )}

        {vitalData.moodNotes && (
          <div className="p-2 bg-card rounded-md border-2 border-border">
            <span className="font-medium text-foreground block mb-1 text-sm">Mood Notes</span>
            <p className="text-sm text-foreground">
              {vitalData.moodNotes}
            </p>
          </div>
        )}
      </div>

      {hasAbnormalReadings && (
        <div className={`rounded-md p-2 border-2 ${
          hasCriticalReadings
            ? 'bg-error-light border-error'
            : 'bg-warning-light border-warning'
        }`}>
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              hasCriticalReadings ? 'text-error' : 'text-warning'
            }`} />
            <div>
              <h4 className={`font-semibold mb-1 text-sm ${
                hasCriticalReadings ? 'text-error-dark' : 'text-warning-dark'
              }`}>
                {hasCriticalReadings ? 'Critical Readings Detected' : 'Abnormal Readings Detected'}
              </h4>
              <p className="text-sm text-foreground mb-2">
                <strong>Recommended:</strong> Please add notes explaining the situation and any actions taken:
              </p>
              <textarea
                value={vitalData.notes || ''}
                placeholder="Example: Patient reports feeling dizzy. Gave water and had them sit down. Will monitor for 30 minutes."
                className="w-full px-2 py-1.5 bg-card border-2 border-border rounded-md focus:border-primary focus:outline-none min-h-[80px] text-base"
                onChange={(e) => onNotesChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Additional Notes (Optional)
        </label>
        <textarea
          placeholder="Any additional observations or notes..."
          className="w-full px-2 py-1.5 bg-card border border-border rounded-md focus:border-primary focus:outline-none min-h-[60px] text-base"
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-3 py-1.5 bg-success text-white rounded-md hover:bg-success-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4" />
              Submit Vitals
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ConfirmationStep({
  familyMember,
  vitalData,
  onClose
}: {
  familyMember: any
  vitalData: VitalData
  onClose: () => void
}) {
  // Count how many vitals were recorded
  const vitalsCount = [
    vitalData.bloodPressure,
    vitalData.temperature,
    vitalData.pulseOximeterReading,
    vitalData.bloodSugar,
    vitalData.weight
  ].filter(Boolean).length

  return (
    <div className="text-center py-4 space-y-2">
      <div className="w-8 h-8 bg-success-light rounded-full flex items-center justify-center mx-auto">
        <CheckCircleIcon className="w-8 h-8 text-success" />
      </div>

      <div>
        <h3 className="text-base font-bold text-foreground mb-1">
          Vitals Logged Successfully
        </h3>
        <p className="text-muted-foreground text-sm">
          {vitalsCount} vital sign{vitalsCount !== 1 ? 's' : ''} recorded for {familyMember.name}
        </p>
      </div>

      {/* Logged by and timestamp */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{new Date(vitalData.timestamp).toLocaleString()}</span>
        </div>
        {vitalData.loggedBy && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{vitalData.loggedBy.name}</span>
          </div>
        )}
      </div>

      {/* Summary of recorded vitals */}
      <div className="max-w-md mx-auto bg-muted/30 rounded-md p-2 text-left space-y-1">
        <h4 className="font-semibold text-sm text-muted-foreground mb-2">Recorded Measurements:</h4>

        {vitalData.bloodPressure && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Blood Pressure:</span>
            <span className="text-sm font-medium text-foreground">
              {vitalData.bloodPressure.systolic}/{vitalData.bloodPressure.diastolic} mmHg
            </span>
          </div>
        )}

        {vitalData.temperature && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Temperature:</span>
            <span className="text-sm font-medium text-foreground">{vitalData.temperature}°F</span>
          </div>
        )}

        {vitalData.pulseOximeterReading && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pulse Oximeter:</span>
            <span className="text-sm font-medium text-foreground">
              {vitalData.pulseOximeterReading.spo2}% SpO₂ / {vitalData.pulseOximeterReading.pulseRate} bpm
            </span>
          </div>
        )}

        {vitalData.bloodSugar && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Blood Sugar:</span>
            <span className="text-sm font-medium text-foreground">{vitalData.bloodSugar} mg/dL</span>
          </div>
        )}

        {vitalData.weight && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Weight:</span>
            <span className="text-sm font-medium text-foreground">{vitalData.weight} lbs</span>
          </div>
        )}

        {vitalData.mood && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Mood:</span>
            <span className="text-sm font-medium text-foreground">{vitalData.mood}</span>
          </div>
        )}

        {vitalData.notes && (
          <div className="pt-2 mt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Notes: {vitalData.notes}</span>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium text-base"
      >
        Done
      </button>
    </div>
  )
}

/**
 * Schedule Step - Ask if user wants to set up regular reminders
 */
function ScheduleStep({
  vitalData,
  familyMember,
  onScheduleChange,
  onNext
}: {
  vitalData: VitalData
  familyMember: { id: string; name: string }
  onScheduleChange: (preferences: SchedulePreferences) => void
  onNext: () => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [selectedVitals, setSelectedVitals] = useState<string[]>([])
  const [frequency, setFrequency] = useState('2x')
  const [times, setTimes] = useState<string[]>(['08:00', '20:00'])
  const [appNotifications, setAppNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)

  // Get vitals that were logged
  const loggedVitals: Array<{ type: string; label: string }> = []
  if (vitalData.bloodPressure) loggedVitals.push({ type: 'blood_pressure', label: 'Blood Pressure' })
  if (vitalData.temperature) loggedVitals.push({ type: 'temperature', label: 'Temperature' })
  if (vitalData.pulseOximeterReading) loggedVitals.push({ type: 'pulse_oximeter', label: 'Pulse Oximeter' })
  if (vitalData.bloodSugar) loggedVitals.push({ type: 'blood_sugar', label: 'Blood Sugar' })
  if (vitalData.weight) loggedVitals.push({ type: 'weight', label: 'Weight' })

  // Initialize with all logged vitals selected
  useEffect(() => {
    if (enabled && selectedVitals.length === 0) {
      setSelectedVitals(loggedVitals.map(v => v.type))
    }
  }, [enabled])

  // Update parent when preferences change
  useEffect(() => {
    onScheduleChange({
      enabled,
      vitalTypes: selectedVitals,
      frequency,
      times,
      notificationChannels: {
        app: appNotifications,
        email: emailNotifications,
        sms: smsNotifications
      }
    })
  }, [enabled, selectedVitals, frequency, times, appNotifications, emailNotifications, smsNotifications])

  // Update times based on frequency
  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq)
    switch (freq) {
      case '1x':
        setTimes(['08:00'])
        break
      case '2x':
        setTimes(['08:00', '20:00'])
        break
      case '3x':
        setTimes(['08:00', '14:00', '20:00'])
        break
      case '4x':
        setTimes(['07:00', '12:00', '17:00', '22:00'])
        break
      case '6x':
        setTimes(['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'])
        break
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-center mb-2">
        <h3 className="text-base font-bold text-foreground mb-1">
          Set Up Regular Reminders?
        </h3>
        <p className="text-muted-foreground text-sm">
          Would you like to receive reminders to check {familyMember.name}'s vitals regularly?
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-accent-light border border-accent/30 rounded-md p-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 text-accent rounded focus:ring-2 focus:ring-accent"
          />
          <div className="flex-1">
            <span className="font-medium text-foreground text-sm">Yes, set up regular vital check reminders</span>
            <p className="text-sm text-muted-foreground mt-1">
              We'll send you notifications at scheduled times to help you stay on track
            </p>
          </div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-2 animate-fadeIn">
          {/* Select Which Vitals */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Which vitals would you like to monitor regularly?
            </label>
            <div className="space-y-1">
              {loggedVitals.map(vital => (
                <label key={vital.type} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedVitals.includes(vital.type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVitals([...selectedVitals, vital.type])
                      } else {
                        setSelectedVitals(selectedVitals.filter(v => v !== vital.type))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-foreground">{vital.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              How often should we remind you?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1x', label: 'Once Daily', recommended: false },
                { value: '2x', label: 'Twice Daily', recommended: true },
                { value: '3x', label: '3× Daily', recommended: false },
                { value: '4x', label: '4× Daily', recommended: selectedVitals.includes('blood_sugar') },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleFrequencyChange(option.value)}
                  className={`relative p-2 rounded-md border-2 transition-all ${
                    frequency === option.value
                      ? 'border-accent bg-accent-light'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                  {option.recommended && (
                    <div className="absolute -top-2 -right-2 bg-success text-white text-xs px-2 py-0.5 rounded-full">
                      Recommended
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reminder Times
            </label>
            <div className="grid grid-cols-2 gap-2">
              {times.map((time, index) => (
                <input
                  key={index}
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const newTimes = [...times]
                    newTimes[index] = e.target.value
                    setTimes(newTimes)
                  }}
                  className="px-2 py-1.5 border border-border rounded-md bg-card text-foreground text-center text-base"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You can adjust these times later in settings
            </p>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              How should we remind you?
            </label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 p-2 bg-muted/30 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={appNotifications}
                  onChange={(e) => setAppNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">📱 App Notifications</span>
                  <p className="text-xs text-muted-foreground">Push notifications on your device</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-muted/30 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">📧 Email</span>
                  <p className="text-xs text-muted-foreground">Email reminders</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-muted/30 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">💬 SMS Text</span>
                  <p className="text-xs text-muted-foreground">Text message reminders (optional)</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {!enabled && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            You can always set up reminders later from the patient settings page
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          onClick={() => {
            setEnabled(false)
            onNext()
          }}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Skip for Now
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
        >
          {enabled ? 'Save & Continue' : 'Skip & Finish'}
        </button>
      </div>
    </div>
  )
}

function ValidationAlert({ validation }: { validation: ValidationResult }) {
  const severityStyles = {
    normal: 'bg-success-light border-success text-success-dark',
    warning: 'bg-warning-light border-warning text-warning-dark',
    critical: 'bg-error-light border-error text-error-dark'
  }

  const icons = {
    normal: <CheckCircleIcon className="w-5 h-5 text-success" />,
    warning: <ExclamationTriangleIcon className="w-5 h-5 text-warning" />,
    critical: <ExclamationTriangleIcon className="w-5 h-5 text-error" />
  }

  return (
    <div className={`rounded-lg p-4 border-2 ${severityStyles[validation.severity]}`}>
      <div className="flex items-start gap-3">
        {icons[validation.severity]}
        <div className="flex-1">
          <p className="font-semibold mb-1">{validation.message}</p>
          <p className="text-sm">{validation.guidance}</p>
          {validation.suggestedAction && (
            <div className="mt-2 pt-2 border-t border-current/20">
              <p className="text-sm font-medium">Suggested Action:</p>
              <p className="text-sm">{validation.suggestedAction}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MoodStep({
  value,
  moodNotes,
  onChange,
  onNotesChange,
  familyMember,
  onNext,
  onSubmit,
  isSubmitting
}: {
  value?: string
  moodNotes?: string
  onChange: (mood: string) => void
  onNotesChange: (notes: string) => void
  familyMember: { name: string }
  onNext: () => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef<string>('')

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = 'en-US'

        recognitionInstance.onresult = (event: any) => {
          console.log('Speech recognition result:', event)
          let finalTranscript = transcriptRef.current

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              console.log('Final transcript segment:', transcript)
              finalTranscript += transcript + ' '
              transcriptRef.current = finalTranscript
              onNotesChange(finalTranscript.trim())
              setIsProcessing(false)
            } else {
              console.log('Interim transcript:', transcript)
            }
          }
        }

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'not-allowed') {
            setPermissionError('Microphone access denied. Please allow microphone access in your browser settings.')
          } else if (event.error === 'no-speech') {
            setPermissionError('No speech detected. Please try again.')
          } else if (event.error !== 'aborted') {
            setPermissionError(`Error: ${event.error}`)
          }
          setIsRecording(false)
          setIsProcessing(false)
        }

        recognitionInstance.onstart = () => {
          console.log('Speech recognition started')
        }

        recognitionInstance.onend = () => {
          console.log('Speech recognition ended')
          setIsRecording(false)
          // Give a small delay before clearing processing to allow final results to come through
          setTimeout(() => {
            setIsProcessing(false)
          }, 500)
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [])

  const startRecording = async () => {
    setPermissionError(null)
    setIsRequestingPermission(true)

    // Sync the transcript ref with current notes
    transcriptRef.current = moodNotes || ''

    // Check if navigator.mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('Your browser does not support microphone access. Please use Chrome, Edge, or Safari.')
      setIsRequestingPermission(false)
      return
    }

    // Request microphone permission first
    try {
      console.log('Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone permission granted')

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop())
      setIsRequestingPermission(false)

      if (recognition) {
        // Start countdown from 3
        setCountdown(3)
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current)
                countdownIntervalRef.current = null
              }
              // Start recording after countdown
              setCountdown(null)
              console.log('Starting speech recognition...', 'Current transcript:', transcriptRef.current)
              setIsRecording(true)
              try {
                recognition.start()
                console.log('Speech recognition start() called successfully')
              } catch (e: any) {
                console.error('Recognition start error:', e)
                if (e.message.includes('already started')) {
                  console.log('Recognition already started, continuing...')
                  setIsRecording(true)
                } else {
                  setIsRecording(false)
                  setPermissionError(`Error starting recording: ${e.message}`)
                }
              }
              return null
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setPermissionError('Speech recognition is not initialized. Please refresh the page.')
      }
    } catch (error: any) {
      console.error('Microphone access error:', error)
      setIsRequestingPermission(false)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Microphone access denied. Please click the microphone icon in your browser address bar and allow access.')
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.')
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Microphone is already in use by another application.')
      } else {
        setPermissionError(`Could not access microphone: ${error.message || error.name}`)
      }
    }
  }

  const stopRecording = () => {
    // Clear countdown if it's running
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
      setCountdown(null)
    }

    if (recognition && isRecording) {
      setIsProcessing(true)
      recognition.stop()
      setIsRecording(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const moods = [
    { emoji: '😊', label: 'Happy', value: 'happy', color: 'bg-success-light border-success text-success-dark' },
    { emoji: '😌', label: 'Calm', value: 'calm', color: 'bg-accent-light border-accent text-accent-dark' },
    { emoji: '😐', label: 'Okay', value: 'okay', color: 'bg-muted border-border text-foreground' },
    { emoji: '😟', label: 'Worried', value: 'worried', color: 'bg-warning-light border-warning text-warning-dark' },
    { emoji: '😢', label: 'Sad', value: 'sad', color: 'bg-error-light border-error text-error-dark' },
    { emoji: '😫', label: 'Pain', value: 'pain', color: 'bg-error-light border-error text-error-dark' }
  ]

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">
          How is {familyMember.name} feeling today?
        </h3>
        <p className="text-sm text-muted-foreground">
          Select the face that best describes their current mood
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {moods.map((mood) => (
          <button
            key={mood.value}
            onClick={() => onChange(mood.value)}
            className={`p-2 rounded-md border-2 transition-all ${
              value === mood.value
                ? mood.color
                : 'bg-card border-border hover:border-accent/50'
            }`}
          >
            <div className="text-2xl mb-1">{mood.emoji}</div>
            <div className="text-sm font-medium">{mood.label}</div>
          </button>
        ))}
      </div>

      {value && (
        <div className="space-y-2 animate-fadeIn">
          <label className="block text-sm font-medium text-foreground">
            Tell us more about how {familyMember.name} is feeling (optional)
          </label>

          {speechSupported && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isRequestingPermission || countdown !== null || isProcessing}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 disabled:opacity-50 text-base ${
                    isRecording
                      ? 'bg-error text-white animate-pulse'
                      : isRequestingPermission || countdown !== null || isProcessing
                      ? 'bg-warning text-white'
                      : 'bg-accent text-accent-foreground hover:bg-accent-dark'
                  }`}
                >
                  {countdown !== null ? (
                    <span className="text-base font-bold animate-pulse">{countdown}</span>
                  ) : (isProcessing || isRequestingPermission) ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {countdown !== null
                    ? 'Get Ready...'
                    : isProcessing
                    ? 'Processing...'
                    : isRequestingPermission
                    ? 'Requesting Permission...'
                    : isRecording
                    ? 'Stop Recording'
                    : 'Start Voice Recording'}
                </button>
                {countdown !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current)
                        countdownIntervalRef.current = null
                      }
                      setCountdown(null)
                    }}
                    className="px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 bg-muted text-foreground hover:bg-muted/80 text-base"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                )}
                {moodNotes && !isRecording && !countdown && !isProcessing && (
                  <button
                    type="button"
                    onClick={() => {
                      transcriptRef.current = ''
                      onNotesChange('')
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 text-base"
                    title="Clear recording and start over"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Clear & Retry
                  </button>
                )}
                {countdown !== null && (
                  <span className="text-sm text-warning-dark font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-warning rounded-full animate-pulse"></span>
                    Starting in {countdown}...
                  </span>
                )}
                {isRecording && (
                  <span className="text-sm text-error font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-error rounded-full animate-pulse"></span>
                    Recording...
                  </span>
                )}
                {isProcessing && (
                  <span className="text-sm text-accent-dark font-medium flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border-2 border-accent-dark border-t-transparent rounded-full"></div>
                    Processing transcription...
                  </span>
                )}
                {isRequestingPermission && (
                  <span className="text-sm text-warning-dark font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-warning rounded-full animate-pulse"></span>
                    Check your browser for permission prompt
                  </span>
                )}
              </div>
              {permissionError && (
                <div className="bg-warning-light border border-warning rounded-md p-2">
                  <p className="text-sm text-warning-dark font-medium">
                    {permissionError}
                  </p>
                </div>
              )}
            </div>
          )}

          <textarea
            value={moodNotes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Example: My back is hurting today, took pain medication at 8am..."
            className="w-full px-2 py-1.5 bg-card border border-border rounded-md focus:border-primary focus:outline-none min-h-[80px] text-foreground text-base"
            disabled={isRecording || isProcessing}
          />

          {!speechSupported && (
            <p className="text-xs text-muted-foreground">
              💡 Tip: Voice recording is not supported in your browser. Please type your notes above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
