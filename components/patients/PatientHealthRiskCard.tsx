'use client'

import { PatientProfile } from '@/types/medical'
import { calculateBMI, getHealthRiskProfile } from '@/lib/health-calculations'
import { calculateAge } from '@/lib/age-utils'
import { getHumanLifeStage } from '@/lib/life-stage-utils'

interface Props {
  patient: PatientProfile
}

/**
 * BMI + Health Concerns card. Mirrors the block on the wizard review
 * step so the same primitives (calculateBMI + getHealthRiskProfile)
 * drive both surfaces. Renders nothing when the inputs aren't there
 * (pet, newborn/infant, missing DOB / height / current weight) so the
 * Vitals Profile section degrades silently.
 */
export function PatientHealthRiskCard({ patient }: Props) {
  const isPet = patient.type === 'pet'
  const lifeStage = !isPet && patient.dateOfBirth ? getHumanLifeStage(patient.dateOfBirth).stage : null
  const isNewbornOrInfant = lifeStage === 'newborn' || lifeStage === 'infant'

  if (isPet || isNewbornOrInfant) return null
  if (!patient.dateOfBirth || !patient.height || !patient.currentWeight) return null

  const age = calculateAge(patient.dateOfBirth)
  if (!Number.isFinite(age)) return null

  const units: 'imperial' | 'metric' = patient.heightUnit === 'metric' ? 'metric' : 'imperial'
  const { bmi, category } = calculateBMI({
    weight: patient.currentWeight,
    height: patient.height,
    units,
  })
  const risk = getHealthRiskProfile({
    bmi,
    gender: (patient.gender as 'male' | 'female' | 'other' | 'prefer-not-to-say') || 'other',
    age,
  })

  const riskChipClass =
    risk.riskLevel === 'severe'
      ? 'bg-error/10 text-error border-error/30'
      : risk.riskLevel === 'high'
        ? 'bg-warning/10 text-warning border-warning/30'
        : risk.riskLevel === 'moderate'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
          : 'bg-success/10 text-success border-success/30'

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">
        BMI &amp; Health Concerns
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">BMI:</span>
          <span className="font-semibold text-foreground">{bmi}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground capitalize">{category}</span>
          <span
            className={`inline-block text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${riskChipClass}`}
          >
            {risk.riskLevel} risk
          </span>
        </div>
        {risk.warnings.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            {risk.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
        {risk.likelyConditions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Conditions to monitor: </span>
            {risk.likelyConditions.join(', ')}
          </p>
        )}
        {risk.otherConditions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Other considerations: </span>
            {risk.otherConditions.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
