'use client'

import { OnboardingStep } from '@/types/caregiver-profile'

interface OnboardingProgressProps {
  currentStep: OnboardingStep
  totalSteps: number
}

const STEP_LABELS = {
  [OnboardingStep.WELCOME]: 'Welcome',
  [OnboardingStep.BASIC_INFO]: 'Basic Info',
  [OnboardingStep.ROLE]: 'Role & Relationship',
  [OnboardingStep.PROFESSIONAL]: 'Professional Info',
  [OnboardingStep.AVAILABILITY]: 'Availability',
  [OnboardingStep.PREFERENCES]: 'Preferences',
  [OnboardingStep.COMPLETE]: 'Complete'
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-muted">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary to-purple-600 transition-all duration-500 ease-out"
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between items-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index as OnboardingStep
          const isComplete = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isUpcoming = stepNum > currentStep

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2"
            >
              {/* Circle Indicator */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${isComplete ? 'bg-gradient-to-r from-primary to-purple-600 text-white' : ''}
                  ${isCurrent ? 'bg-primary text-white ring-4 ring-primary/30' : ''}
                  ${isUpcoming ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {isComplete ? '✓' : index + 1}
              </div>

              {/* Step Label */}
              <span
                className={`
                  text-xs font-medium text-center max-w-[80px] hidden sm:block
                  ${isCurrent ? 'text-primary' : 'text-muted-foreground'}
                `}
              >
                {STEP_LABELS[stepNum]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current Step Info */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}: {STEP_LABELS[currentStep]}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {Math.round(progress)}% Complete
        </p>
      </div>
    </div>
  )
}
