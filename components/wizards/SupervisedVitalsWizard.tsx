/**
 * Supervised Vitals Wizard with AI Guidance
 *
 * Multi-step wizard that acts as an AI supervisor, guiding caregivers
 * through proper vital sign collection with real-time validation,
 * training prompts, and quality assurance checks.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog } from '@headlessui/react'
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
import { logger } from '@/lib/logger'
import { sendCriticalVitalAlert } from '@/lib/emergency-alerts'
import { useAuth } from '@/hooks/useAuth'

interface SupervisedVitalsWizardProps {
  isOpen: boolean
  onClose: () => void
  familyMember: {
    id: string
    name: string
    age?: number
    conditions?: string[]
  }
  recentReadings?: VitalReading[]
  onSubmit: (vitals: any) => Promise<void>
  onComplete?: (savedVitals: VitalSign[]) => void  // Callback with saved vitals for summary display
}

type WizardStep = 'intro' | 'blood_pressure' | 'temperature' | 'heart_rate' | 'oxygen' | 'blood_sugar' | 'review' | 'mood' | 'schedule' | 'confirmation'

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
  heartRate?: number
  oxygenSaturation?: number
  bloodSugar?: number
  mood?: string
  moodNotes?: string
  notes?: string
  timestamp: Date
  schedulePreferences?: SchedulePreferences
}

export default function SupervisedVitalsWizard({
  isOpen,
  onClose,
  familyMember,
  recentReadings = [],
  onSubmit,
  onComplete
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

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('intro')
      setVitalData({ timestamp: new Date() })
      setValidationResults({})
      setShowGuidance(true)
    }
  }, [isOpen])

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
      weight: 'lbs',
      blood_sugar: 'mg/dL'
    }
    return units[type]
  }

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['intro', 'blood_pressure', 'temperature', 'heart_rate', 'oxygen', 'blood_sugar', 'review', 'mood', 'schedule', 'confirmation']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['intro', 'blood_pressure', 'temperature', 'heart_rate', 'oxygen', 'blood_sugar', 'review', 'mood', 'schedule', 'confirmation']
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
      case 'heart_rate':
        setVitalData(prev => ({ ...prev, heartRate: undefined }))
        setValidationResults(prev => {
          const { heart_rate, ...rest } = prev
          return rest
        })
        break
      case 'oxygen':
        setVitalData(prev => ({ ...prev, oxygenSaturation: undefined }))
        setValidationResults(prev => {
          const { oxygen_saturation, ...rest } = prev
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

      // Run quality checks
      const checks = runQualityChecks({
        type: 'vitals',
        ...vitalData,
        hasAbnormalReading: Object.values(validationResults).some(
          r => r.severity === 'warning' || r.severity === 'critical'
        )
      })

      // Show errors if any critical checks failed
      const errors = checks.filter(c => c.severity === 'error' && !c.passed)
      if (errors.length > 0) {
        logger.error('[Wizard] Quality checks failed', { errors })
        // Show error modal or inline messages
        return
      }

      // Submit vitals - note: onSubmit should return the saved vitals or we track them separately
      await onSubmit(vitalData)

      // Clear draft
      localStorage.removeItem(`vitals_draft_${familyMember.id}`)

      // Go to schedule step instead of directly to confirmation
      setCurrentStep('schedule')
    } catch (error) {
      logger.error('[Wizard] Failed to submit vitals', error)
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
      if (vitalData.heartRate) {
        criticalReadings.heartRate = `${vitalData.heartRate} bpm`
      }
      if (vitalData.oxygenSaturation) {
        criticalReadings.oxygenSaturation = `${vitalData.oxygenSaturation}%`
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
      logger.error('[Wizard] Error sending emergency alert', error)
      alert('❌ Error sending alert. Please call family members directly.')
    } finally {
      setSendingAlert(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep familyMember={familyMember} onNext={handleNext} />

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

      case 'heart_rate':
        return (
          <HeartRateStep
            value={vitalData.heartRate}
            onChange={(hr) => {
              setVitalData(prev => ({ ...prev, heartRate: hr }))
              validateCurrentReading('heart_rate', hr)
            }}
            validation={validationResults.heart_rate}
            showGuidance={showGuidance}
          />
        )

      case 'oxygen':
        return (
          <OxygenStep
            value={vitalData.oxygenSaturation}
            onChange={(o2) => {
              setVitalData(prev => ({ ...prev, oxygenSaturation: o2 }))
              validateCurrentReading('oxygen_saturation', o2)
            }}
            validation={validationResults.oxygen_saturation}
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

      case 'review':
        return (
          <ReviewStep
            vitalData={vitalData}
            validationResults={validationResults}
            familyMember={familyMember}
            onNotesChange={(notes) => setVitalData(prev => ({ ...prev, notes }))}
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
  const stepOrder: WizardStep[] = ['intro', 'blood_pressure', 'temperature', 'heart_rate', 'oxygen', 'blood_sugar', 'review', 'mood']
  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-card rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-4 flex items-center justify-between">
            <div>
              <Dialog.Title className="text-xl font-bold text-primary-foreground">
                Vitals Check - {familyMember.name}
              </Dialog.Title>
              <p className="text-sm text-primary-foreground/90">
                AI-guided vital signs logging
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-primary-foreground hover:text-primary-foreground/80 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          {currentStep !== 'confirmation' && (
            <div className="bg-muted h-2">
              <div
                className="bg-primary h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Training Mode Toggle */}
          {currentStep !== 'intro' && currentStep !== 'confirmation' && (
            <div className="px-6 py-3 bg-accent-light border-b border-accent/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AcademicCapIcon className="w-5 h-5 text-accent-dark" />
                  <span className="text-sm font-medium text-accent-dark">
                    Training Guidance
                  </span>
                </div>
                <button
                  onClick={() => setShowGuidance(!showGuidance)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    showGuidance ? 'bg-accent' : 'bg-muted-dark'
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
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            {renderStepContent()}
          </div>

          {/* Footer Navigation - Hidden on intro, mood, schedule, and confirmation steps */}
          {currentStep !== 'confirmation' && currentStep !== 'intro' && currentStep !== 'mood' && currentStep !== 'schedule' && (
            <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground/80 flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {currentStep !== 'review' && (
                  <button
                    onClick={handleSkipStep}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Skip
                  </button>
                )}

                {currentStep === 'review' ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center gap-2"
                  >
                    Continue
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center gap-2"
                  >
                    Next
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function IntroStep({ familyMember, onNext }: { familyMember: any; onNext: () => void }) {
  const guidance = getTaskGuidance('blood_pressure')

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🩺</span>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Let's Check Vitals for {familyMember.name}
        </h3>
        <p className="text-muted-foreground">
          I'll guide you through each measurement step-by-step
        </p>
      </div>

      <div className="bg-accent-light rounded-lg p-4 border border-accent/30">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-accent-dark mb-2">
              Before We Start
            </h4>
            <ul className="space-y-1 text-sm text-foreground">
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

      <div className="flex flex-col gap-3">
        <button
          onClick={onNext}
          className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center gap-2"
        >
          Start Vitals Check
          <ArrowRightIcon className="w-5 h-5" />
        </button>
        <p className="text-xs text-center text-muted-foreground">
          You can skip any measurement you don't need to take today
        </p>
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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">Blood Pressure</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter the systolic (top) and diastolic (bottom) readings
        </p>
      </div>

      {showGuidance && trainingPrompt && (
        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-400">
          <div className="flex items-start gap-3">
            <AcademicCapIcon className="w-5 h-5 text-purple-800 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-1">
                {trainingPrompt.topic}
              </h4>
              <p className="text-sm text-purple-900 font-medium">
                {trainingPrompt.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Systolic (top)
          </label>
          <input
            type="number"
            value={systolic}
            onChange={(e) => {
              setSystolic(e.target.value)
              handleUpdate(e.target.value, diastolic)
            }}
            placeholder="120"
            className="w-full px-4 py-3 text-2xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-gray-700 mt-1 text-center font-medium">mmHg</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Diastolic (bottom)
          </label>
          <input
            type="number"
            value={diastolic}
            onChange={(e) => {
              setDiastolic(e.target.value)
              handleUpdate(systolic, e.target.value)
            }}
            placeholder="80"
            className="w-full px-4 py-3 text-2xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-gray-700 mt-1 text-center font-medium">mmHg</p>
        </div>
      </div>

      {/* Inline validation warning for swapped values */}
      {showSwapWarning && (
        <div className="rounded-lg p-4 border-2 bg-yellow-50 border-yellow-500">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-800 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-warning-dark mb-1">Values May Be Swapped</p>
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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">Temperature</h3>
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
          placeholder="98.6"
          className="w-full px-6 py-4 text-3xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
        />
        <p className="text-sm text-gray-700 mt-2 text-center font-medium">°F (Fahrenheit)</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Normal range:</strong> 97°F - 99°F<br />
            🌡️ <strong>Fever:</strong> 100.4°F or higher
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
        <h3 className="text-xl font-bold text-foreground mb-2">Heart Rate</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter pulse in beats per minute
        </p>
      </div>

      <div>
        <input
          type="number"
          value={hr}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="72"
          className="w-full px-6 py-4 text-3xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
        />
        <p className="text-sm text-gray-700 mt-2 text-center font-medium">bpm (beats per minute)</p>
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
          placeholder="98"
          max="100"
          className="w-full px-6 py-4 text-3xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
        />
        <p className="text-sm text-gray-700 mt-2 text-center font-medium">% SpO2</p>
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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">Blood Sugar</h3>
        <p className="text-sm text-gray-700 font-medium">
          Enter glucose reading from glucometer
        </p>
      </div>

      <div>
        <input
          type="number"
          value={glucose}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="120"
          className="w-full px-6 py-4 text-3xl font-bold text-center bg-white border-2 border-border rounded-lg focus:border-primary focus:outline-none"
        />
        <p className="text-sm text-gray-700 mt-2 text-center font-medium">mg/dL</p>
      </div>

      {validation && (
        <ValidationAlert validation={validation} />
      )}

      {showGuidance && (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-400">
          <p className="text-sm text-gray-800 font-medium">
            💡 <strong>Target range:</strong> 80-130 mg/dL (fasting)<br />
            🩸 <strong>Critical:</strong> Below 70 or above 300 requires immediate action
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
  onNotesChange
}: {
  vitalData: VitalData
  validationResults: Record<string, ValidationResult>
  familyMember: any
  onNotesChange: (notes: string) => void
}) {
  const hasAbnormalReadings = Object.values(validationResults).some(
    v => v.severity === 'warning' || v.severity === 'critical'
  )

  const hasCriticalReadings = Object.values(validationResults).some(
    v => v.severity === 'critical'
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">Review Vitals</h3>
        <p className="text-sm text-muted-foreground">
          Confirm all readings are correct before submitting
        </p>
      </div>

      <div className="space-y-3">
        {vitalData.bloodPressure && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-border">
            <span className="font-medium text-foreground">Blood Pressure</span>
            <span className="text-lg font-bold text-foreground">
              {vitalData.bloodPressure.systolic}/{vitalData.bloodPressure.diastolic} mmHg
            </span>
          </div>
        )}

        {vitalData.temperature && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-border">
            <span className="font-medium text-foreground">Temperature</span>
            <span className="text-lg font-bold text-foreground">
              {vitalData.temperature}°F
            </span>
          </div>
        )}

        {vitalData.heartRate && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-border">
            <span className="font-medium text-foreground">Heart Rate</span>
            <span className="text-lg font-bold text-foreground">
              {vitalData.heartRate} bpm
            </span>
          </div>
        )}

        {vitalData.oxygenSaturation && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-border">
            <span className="font-medium text-foreground">Oxygen Saturation</span>
            <span className="text-lg font-bold text-foreground">
              {vitalData.oxygenSaturation}%
            </span>
          </div>
        )}

        {vitalData.bloodSugar && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-border">
            <span className="font-medium text-foreground">Blood Sugar</span>
            <span className="text-lg font-bold text-foreground">
              {vitalData.bloodSugar} mg/dL
            </span>
          </div>
        )}
      </div>

      {hasAbnormalReadings && (
        <div className={`rounded-lg p-4 border-2 ${
          hasCriticalReadings
            ? 'bg-error-light border-error'
            : 'bg-warning-light border-warning'
        }`}>
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              hasCriticalReadings ? 'text-error' : 'text-warning'
            }`} />
            <div>
              <h4 className={`font-semibold mb-2 ${
                hasCriticalReadings ? 'text-error-dark' : 'text-warning-dark'
              }`}>
                {hasCriticalReadings ? 'Critical Readings Detected' : 'Abnormal Readings Detected'}
              </h4>
              <p className="text-sm text-foreground mb-3">
                Please add notes explaining the situation and any actions taken:
              </p>
              <textarea
                placeholder="Example: Patient reports feeling dizzy. Gave water and had them sit down. Will monitor for 30 minutes."
                className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:border-primary focus:outline-none min-h-[100px]"
                onChange={(e) => onNotesChange(e.target.value)}
                required={hasCriticalReadings}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          placeholder="Any additional observations or notes..."
          className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:border-primary focus:outline-none min-h-[80px]"
          onChange={(e) => onNotesChange(e.target.value)}
        />
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
    vitalData.heartRate || vitalData.oxygenSaturation,
    vitalData.bloodSugar
  ].filter(Boolean).length

  return (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto">
        <CheckCircleIcon className="w-12 h-12 text-success" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Vitals Logged Successfully!
        </h3>
        <p className="text-muted-foreground">
          {vitalsCount} vital sign{vitalsCount !== 1 ? 's' : ''} recorded for {familyMember.name}
        </p>
      </div>

      {/* Summary of recorded vitals */}
      <div className="max-w-md mx-auto bg-muted/30 rounded-lg p-4 text-left space-y-2">
        <h4 className="font-semibold text-sm text-muted-foreground mb-3">Recorded Measurements:</h4>

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

        {(vitalData.heartRate || vitalData.oxygenSaturation) && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pulse Oximeter:</span>
            <span className="text-sm font-medium text-foreground">
              {vitalData.oxygenSaturation ? `${vitalData.oxygenSaturation}% SpO₂` : ''}
              {vitalData.heartRate ? ` ${vitalData.heartRate} bpm` : ''}
            </span>
          </div>
        )}

        {vitalData.bloodSugar && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Blood Sugar:</span>
            <span className="text-sm font-medium text-foreground">{vitalData.bloodSugar} mg/dL</span>
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
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
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
  const loggedVitals = []
  if (vitalData.bloodPressure) loggedVitals.push({ type: 'blood_pressure', label: 'Blood Pressure' })
  if (vitalData.temperature) loggedVitals.push({ type: 'temperature', label: 'Temperature' })
  if (vitalData.heartRate || vitalData.oxygenSaturation) loggedVitals.push({ type: 'pulse_ox', label: 'Pulse Oximeter' })
  if (vitalData.bloodSugar) loggedVitals.push({ type: 'blood_sugar', label: 'Blood Sugar' })

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
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Set Up Regular Reminders?
        </h3>
        <p className="text-muted-foreground">
          Would you like to receive reminders to check {familyMember.name}'s vitals regularly?
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-accent-light border border-accent/30 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 text-accent rounded focus:ring-2 focus:ring-accent"
          />
          <div className="flex-1">
            <span className="font-medium text-foreground">Yes, set up regular vital check reminders</span>
            <p className="text-sm text-muted-foreground mt-1">
              We'll send you notifications at scheduled times to help you stay on track
            </p>
          </div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-6 animate-fadeIn">
          {/* Select Which Vitals */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Which vitals would you like to monitor regularly?
            </label>
            <div className="space-y-2">
              {loggedVitals.map(vital => (
                <label key={vital.type} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
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
            <label className="block text-sm font-medium text-foreground mb-3">
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
                  className={`relative p-3 rounded-lg border-2 transition-all ${
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
            <label className="block text-sm font-medium text-foreground mb-3">
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
                  className="px-3 py-2 border border-border rounded-lg bg-card text-foreground text-center"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You can adjust these times later in settings
            </p>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              How should we remind you?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
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

              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
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

              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
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
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
          let interimTranscript = ''
          let finalTranscript = moodNotes || ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }

          onNotesChange(finalTranscript.trim())
        }

        recognitionInstance.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            setPermissionError('Microphone access denied. Please allow microphone access in your browser settings.')
          } else if (event.error === 'no-speech') {
            setPermissionError('No speech detected. Please try again.')
          } else {
            setPermissionError(`Error: ${event.error}`)
          }
          setIsRecording(false)
        }

        recognitionInstance.onend = () => {
          setIsRecording(false)
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [])

  const startRecording = async () => {
    setPermissionError(null)
    setIsRequestingPermission(true)

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
              console.log('Starting speech recognition...')
              setIsRecording(true)
              try {
                recognition.start()
              } catch (e: any) {
                console.error('Recognition start error:', e)
                if (e.message.includes('already started')) {
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

    if (recognition) {
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          How is {familyMember.name} feeling today?
        </h3>
        <p className="text-sm text-muted-foreground">
          Select the face that best describes their current mood
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {moods.map((mood) => (
          <button
            key={mood.value}
            onClick={() => onChange(mood.value)}
            className={`p-6 rounded-lg border-2 transition-all ${
              value === mood.value
                ? mood.color
                : 'bg-card border-border hover:border-accent/50'
            }`}
          >
            <div className="text-5xl mb-2">{mood.emoji}</div>
            <div className="text-sm font-medium">{mood.label}</div>
          </button>
        ))}
      </div>

      {value && (
        <div className="space-y-3 animate-fadeIn">
          <label className="block text-sm font-medium text-foreground">
            Tell us more about how {familyMember.name} is feeling (optional)
          </label>

          {speechSupported && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting || isRequestingPermission || countdown !== null}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 ${
                    isRecording
                      ? 'bg-error text-white animate-pulse'
                      : isRequestingPermission || countdown !== null
                      ? 'bg-warning text-white'
                      : 'bg-accent text-accent-foreground hover:bg-accent-dark'
                  }`}
                >
                  {countdown !== null ? (
                    <span className="text-2xl font-bold animate-pulse">{countdown}</span>
                  ) : isRequestingPermission ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <svg
                      className="w-5 h-5"
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
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-muted text-foreground hover:bg-muted/80"
                  >
                    <svg
                      className="w-5 h-5"
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
                {moodNotes && !isRecording && !countdown && (
                  <button
                    type="button"
                    onClick={() => onNotesChange('')}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50"
                    title="Clear recording and start over"
                  >
                    <svg
                      className="w-5 h-5"
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
                {isRequestingPermission && (
                  <span className="text-sm text-warning-dark font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-warning rounded-full animate-pulse"></span>
                    Check your browser for permission prompt
                  </span>
                )}
              </div>
              {permissionError && (
                <div className="bg-warning-light border border-warning rounded-lg p-3">
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
            className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:border-primary focus:outline-none min-h-[100px] text-foreground"
            disabled={isRecording}
          />

          {!speechSupported && (
            <p className="text-xs text-muted-foreground">
              💡 Tip: Voice recording is not supported in your browser. Please type your notes above.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Skip'}
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Submit Vitals
            </>
          )}
        </button>
      </div>
    </div>
  )
}
