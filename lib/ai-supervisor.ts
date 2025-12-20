/**
 * AI Supervisor for Caregiver Guidance
 *
 * Acts as an intelligent assistant that:
 * - Validates caregiver inputs
 * - Detects anomalies in vital readings
 * - Provides real-time training and best practices
 * - Ensures quality care documentation
 * - Guides caregivers through proper procedures
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

// ============================================================================
// VITAL SIGNS VALIDATION
// ============================================================================

export interface VitalReading {
  type: 'blood_pressure' | 'temperature' | 'heart_rate' | 'oxygen_saturation' | 'weight' | 'blood_sugar'
  value: number | { systolic: number; diastolic: number }
  unit: string
  timestamp: Date
  familyMemberName: string
  age?: number
  existingConditions?: string[]
}

export interface ValidationResult {
  isValid: boolean
  severity: 'normal' | 'warning' | 'critical'
  message: string
  guidance: string
  requiresConfirmation: boolean
  suggestedAction?: string
}

/**
 * Validates vital readings against normal ranges and provides guidance
 */
export function validateVitalReading(reading: VitalReading): ValidationResult {
  const { type, value, familyMemberName, age = 65 } = reading

  switch (type) {
    case 'blood_pressure':
      const bp = value as { systolic: number; diastolic: number }

      // Check if bp values exist
      if (!bp || typeof bp.systolic !== 'number' || typeof bp.diastolic !== 'number') {
        return {
          isValid: false,
          severity: 'normal',
          message: 'Please enter both systolic and diastolic values',
          guidance: 'Enter the top number (systolic) and bottom number (diastolic) from the blood pressure reading',
          requiresConfirmation: false
        }
      }

      // Critical ranges
      if (bp.systolic > 180 || bp.diastolic > 120) {
        return {
          isValid: true,
          severity: 'critical',
          message: `⚠️ HYPERTENSIVE CRISIS: ${bp.systolic}/${bp.diastolic} mmHg is dangerously high`,
          guidance: 'This is a medical emergency. If the person has chest pain, shortness of breath, back pain, numbness/weakness, vision changes, or difficulty speaking, call 911 immediately.',
          requiresConfirmation: true,
          suggestedAction: 'Call emergency services and notify family immediately'
        }
      }

      if (bp.systolic < 90 || bp.diastolic < 60) {
        return {
          isValid: true,
          severity: 'critical',
          message: `⚠️ LOW BLOOD PRESSURE: ${bp.systolic}/${bp.diastolic} mmHg`,
          guidance: 'Low blood pressure can cause dizziness and falls. Have the person sit down. If they feel faint, dizzy, or confused, seek medical attention.',
          requiresConfirmation: true,
          suggestedAction: 'Monitor closely and notify healthcare provider'
        }
      }

      // Warning ranges
      if (bp.systolic >= 140 || bp.diastolic >= 90) {
        return {
          isValid: true,
          severity: 'warning',
          message: `⚠️ Elevated: ${bp.systolic}/${bp.diastolic} mmHg (Stage 2 Hypertension)`,
          guidance: 'This reading is higher than normal. Make sure they took their blood pressure medication today. Recheck in 5 minutes after they rest quietly.',
          requiresConfirmation: true,
          suggestedAction: 'Verify medication compliance and retest after rest'
        }
      }

      if (bp.systolic >= 130 || bp.diastolic >= 80) {
        return {
          isValid: true,
          severity: 'warning',
          message: `Stage 1 Hypertension: ${bp.systolic}/${bp.diastolic} mmHg`,
          guidance: 'Slightly elevated. This should be monitored. Ensure they avoid salty foods today and stay hydrated.',
          requiresConfirmation: false
        }
      }

      return {
        isValid: true,
        severity: 'normal',
        message: `✓ Normal: ${bp.systolic}/${bp.diastolic} mmHg`,
        guidance: 'Blood pressure is within healthy range.',
        requiresConfirmation: false
      }

    case 'temperature':
      const tempF = value as number

      if (tempF >= 103) {
        return {
          isValid: true,
          severity: 'critical',
          message: `🌡️ HIGH FEVER: ${tempF}°F`,
          guidance: 'Fever over 103°F requires immediate medical attention, especially for elderly individuals. Give fever-reducing medication if prescribed, and call their doctor.',
          requiresConfirmation: true,
          suggestedAction: 'Contact healthcare provider immediately'
        }
      }

      if (tempF >= 100.4) {
        return {
          isValid: true,
          severity: 'warning',
          message: `🌡️ Fever: ${tempF}°F`,
          guidance: 'Monitor closely. Ensure they drink plenty of fluids. Check temperature again in 2 hours. Note any other symptoms like cough, pain, or confusion.',
          requiresConfirmation: true,
          suggestedAction: 'Monitor symptoms and hydration'
        }
      }

      if (tempF < 95) {
        return {
          isValid: true,
          severity: 'critical',
          message: `❄️ LOW TEMPERATURE: ${tempF}°F (Hypothermia)`,
          guidance: 'Body temperature below 95°F is hypothermia. Warm them gradually with blankets. Do NOT use hot water or heating pads. Call their doctor immediately.',
          requiresConfirmation: true,
          suggestedAction: 'Warm gradually and seek medical attention'
        }
      }

      return {
        isValid: true,
        severity: 'normal',
        message: `✓ Normal: ${tempF}°F`,
        guidance: 'Temperature is within normal range.',
        requiresConfirmation: false
      }

    case 'heart_rate':
      const hr = value as number

      if (hr > 120) {
        return {
          isValid: true,
          severity: 'critical',
          message: `❤️ HIGH HEART RATE: ${hr} bpm`,
          guidance: 'Heart rate over 120 at rest is concerning. Have them sit and rest. If they have chest pain, shortness of breath, or dizziness, call 911.',
          requiresConfirmation: true,
          suggestedAction: 'Monitor for emergency symptoms'
        }
      }

      if (hr < 50) {
        return {
          isValid: true,
          severity: 'warning',
          message: `❤️ LOW HEART RATE: ${hr} bpm`,
          guidance: 'Heart rate below 50 may indicate medication side effects or heart rhythm issues. Check if they feel dizzy or weak. Contact their doctor.',
          requiresConfirmation: true,
          suggestedAction: 'Check symptoms and notify provider'
        }
      }

      if (hr > 100 || hr < 60) {
        return {
          isValid: true,
          severity: 'warning',
          message: `⚠️ Outside normal range: ${hr} bpm`,
          guidance: 'Slightly outside typical range (60-100 bpm). Note if they just exercised, ate, or are stressed, which can affect heart rate.',
          requiresConfirmation: false
        }
      }

      return {
        isValid: true,
        severity: 'normal',
        message: `✓ Normal: ${hr} bpm`,
        guidance: 'Heart rate is within healthy range.',
        requiresConfirmation: false
      }

    case 'oxygen_saturation':
      const o2 = value as number

      if (o2 < 90) {
        return {
          isValid: true,
          severity: 'critical',
          message: `🫁 CRITICAL LOW OXYGEN: ${o2}%`,
          guidance: 'Oxygen below 90% requires immediate medical attention. If they have an oxygen concentrator, apply it now. Call 911 if they are struggling to breathe.',
          requiresConfirmation: true,
          suggestedAction: 'Apply supplemental oxygen and call 911'
        }
      }

      if (o2 < 95) {
        return {
          isValid: true,
          severity: 'warning',
          message: `🫁 Low Oxygen: ${o2}%`,
          guidance: 'Oxygen saturation below 95% should be monitored. Have them take deep breaths. If prescribed oxygen, apply it. Contact their doctor.',
          requiresConfirmation: true,
          suggestedAction: 'Apply prescribed oxygen and notify provider'
        }
      }

      return {
        isValid: true,
        severity: 'normal',
        message: `✓ Normal: ${o2}%`,
        guidance: 'Oxygen saturation is within healthy range.',
        requiresConfirmation: false
      }

    case 'blood_sugar':
      const glucose = value as number

      if (glucose < 70) {
        return {
          isValid: true,
          severity: 'critical',
          message: `🩸 LOW BLOOD SUGAR: ${glucose} mg/dL (Hypoglycemia)`,
          guidance: 'IMMEDIATELY give them 15g fast-acting carbs (4oz juice, 3-4 glucose tablets, or 1 tbsp honey). Recheck in 15 minutes. If below 70, repeat. Call doctor if it stays low.',
          requiresConfirmation: true,
          suggestedAction: 'Give 15g carbs, recheck in 15 min, call if persistent'
        }
      }

      if (glucose > 300) {
        return {
          isValid: true,
          severity: 'critical',
          message: `🩸 VERY HIGH BLOOD SUGAR: ${glucose} mg/dL`,
          guidance: 'Blood sugar over 300 is dangerous. Check for ketones if type 1 diabetic. Ensure they drink water. Call their doctor immediately.',
          requiresConfirmation: true,
          suggestedAction: 'Hydrate and contact healthcare provider'
        }
      }

      if (glucose > 180) {
        return {
          isValid: true,
          severity: 'warning',
          message: `🩸 High Blood Sugar: ${glucose} mg/dL`,
          guidance: 'Blood sugar is elevated. Check when they last ate and took medication. Encourage water intake. Monitor for increased thirst or urination.',
          requiresConfirmation: true,
          suggestedAction: 'Review medication timing and monitor symptoms'
        }
      }

      return {
        isValid: true,
        severity: 'normal',
        message: `✓ Normal: ${glucose} mg/dL`,
        guidance: 'Blood sugar is within target range.',
        requiresConfirmation: false
      }

    default:
      return {
        isValid: true,
        severity: 'normal',
        message: 'Reading recorded',
        guidance: '',
        requiresConfirmation: false
      }
  }
}

// ============================================================================
// TRAINING & BEST PRACTICES
// ============================================================================

export interface TrainingPrompt {
  topic: string
  message: string
  learnMoreUrl?: string
  videoUrl?: string
}

/**
 * Provides context-aware training tips based on the action being performed
 */
export function getTrainingPrompt(action: string, context: any = {}): TrainingPrompt | null {
  const prompts: Record<string, TrainingPrompt> = {
    'blood_pressure_first_time': {
      topic: 'Taking Blood Pressure',
      message: '💡 TIP: Have them sit quietly for 5 minutes before measuring. Feet flat on floor, arm at heart level, supported on a table. Don\'t talk during measurement.',
      learnMoreUrl: '/help/blood-pressure-guide'
    },
    'medication_logging': {
      topic: 'Medication Safety',
      message: '💊 REMINDER: Always check the medication label matches what you\'re giving. Verify the dose and time. Mark it as given AFTER they swallow it, not before.',
      learnMoreUrl: '/help/medication-safety'
    },
    'meal_logging': {
      topic: 'Nutrition Tracking',
      message: '🍽️ TIP: Note portion sizes (1/2 cup, fist-sized, etc) and if they finished the meal. This helps track appetite changes and nutrition intake.',
      learnMoreUrl: '/help/meal-tracking'
    },
    'wound_care': {
      topic: 'Wound Documentation',
      message: '🩹 BEST PRACTICE: Take a photo each time you change the dressing. Describe: size, color, drainage, smell, and pain level. This tracks healing progress.',
      learnMoreUrl: '/help/wound-care'
    },
    'fall_risk': {
      topic: 'Fall Prevention',
      message: '⚠️ SAFETY: Before they stand, have them sit at the edge of the bed for 30 seconds. Check for dizziness. Walk beside them, not ahead or behind.',
      learnMoreUrl: '/help/fall-prevention'
    }
  }

  return prompts[action] || null
}

// ============================================================================
// QUALITY ASSURANCE CHECKS
// ============================================================================

export interface QualityCheck {
  passed: boolean
  message: string
  severity: 'normal' | 'warning' | 'error'
  suggestion?: string
}

/**
 * Runs quality checks before submitting care logs
 */
export function runQualityChecks(logData: any): QualityCheck[] {
  const checks: QualityCheck[] = []

  // Check 1: Time since last vitals check
  if (logData.type === 'vitals' && logData.lastVitalsCheck) {
    const hoursSince = (Date.now() - new Date(logData.lastVitalsCheck).getTime()) / (1000 * 60 * 60)

    if (hoursSince < 0.5) {
      checks.push({
        passed: false,
        message: 'Vitals were already logged less than 30 minutes ago',
        severity: 'warning',
        suggestion: 'Are you sure you need to log again? Check if another caregiver already logged this.'
      })
    }
  }

  // Check 2: Missing notes on abnormal readings
  if (logData.type === 'vitals' && logData.hasAbnormalReading && !logData.notes) {
    checks.push({
      passed: false,
      message: 'Notes are required when vital signs are abnormal',
      severity: 'error',
      suggestion: 'Please add notes explaining the abnormal reading, any symptoms observed, and actions taken.'
    })
  }

  // Check 3: Medication timing
  if (logData.type === 'medication' && logData.scheduledTime) {
    const scheduledTime = new Date(logData.scheduledTime)
    const actualTime = new Date(logData.actualTime || Date.now())
    const diffMinutes = Math.abs((actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60))

    if (diffMinutes > 60) {
      checks.push({
        passed: false,
        message: `Medication is ${Math.round(diffMinutes)} minutes ${actualTime > scheduledTime ? 'late' : 'early'}`,
        severity: 'warning',
        suggestion: 'Add a note explaining why the medication timing was different. This helps track adherence patterns.'
      })
    }
  }

  // Check 4: Photo documentation for wounds/skin issues
  if (logData.type === 'skin_assessment' && !logData.photo) {
    checks.push({
      passed: true,
      message: 'Consider taking a photo for documentation',
      severity: 'normal',
      suggestion: 'Photos help track healing progress and are valuable for healthcare providers.'
    })
  }

  // Check 5: Caregiver has been on shift too long
  if (logData.caregiverShiftStart) {
    const hoursOnShift = (Date.now() - new Date(logData.caregiverShiftStart).getTime()) / (1000 * 60 * 60)

    if (hoursOnShift > 12) {
      checks.push({
        passed: true,
        message: `You've been on shift for ${Math.round(hoursOnShift)} hours`,
        severity: 'warning',
        suggestion: 'Long shifts can lead to fatigue. Consider taking a break or checking if relief is scheduled.'
      })
    }
  }

  return checks
}

// ============================================================================
// AI-POWERED ANOMALY DETECTION
// ============================================================================

export interface AnomalyDetectionResult {
  isAnomaly: boolean
  confidence: number // 0-1
  reasons: string[]
  recommendation: string
}

/**
 * Uses AI to detect patterns that might indicate health changes
 */
export async function detectAnomalies(
  recentReadings: VitalReading[],
  newReading: VitalReading
): Promise<AnomalyDetectionResult> {
  // Simple rule-based detection for now (can be enhanced with actual AI model)
  const reasons: string[] = []
  let isAnomaly = false

  if (recentReadings.length < 3) {
    return {
      isAnomaly: false,
      confidence: 0,
      reasons: ['Not enough historical data'],
      recommendation: 'Continue monitoring to establish baseline'
    }
  }

  // Check for sudden changes (example: blood pressure)
  if (newReading.type === 'blood_pressure') {
    const newBP = newReading.value as { systolic: number; diastolic: number }
    const recentBPs = recentReadings
      .filter(r => r.type === 'blood_pressure')
      .slice(0, 5)
      .map(r => r.value as { systolic: number; diastolic: number })

    if (recentBPs.length > 0) {
      const avgSystolic = recentBPs.reduce((sum, bp) => sum + bp.systolic, 0) / recentBPs.length
      const systolicDiff = Math.abs(newBP.systolic - avgSystolic)

      if (systolicDiff > 20) {
        isAnomaly = true
        reasons.push(`Systolic pressure changed by ${systolicDiff} mmHg from recent average`)
      }
    }
  }

  // Check for trending patterns
  if (newReading.type === 'weight') {
    const recentWeights = recentReadings
      .filter(r => r.type === 'weight')
      .slice(0, 7)
      .map(r => r.value as number)

    if (recentWeights.length >= 3) {
      const avgWeight = recentWeights.reduce((sum, w) => sum + w, 0) / recentWeights.length
      const newWeight = newReading.value as number
      const percentChange = ((newWeight - avgWeight) / avgWeight) * 100

      if (Math.abs(percentChange) > 5) {
        isAnomaly = true
        reasons.push(`Weight changed by ${percentChange.toFixed(1)}% in recent days`)
      }
    }
  }

  const confidence = isAnomaly ? 0.7 : 0.3

  return {
    isAnomaly,
    confidence,
    reasons,
    recommendation: isAnomaly
      ? 'This reading differs significantly from recent patterns. Consider notifying the healthcare provider if pattern continues.'
      : 'Reading is consistent with recent measurements'
  }
}

// ============================================================================
// INTELLIGENT GUIDANCE
// ============================================================================

/**
 * Provides step-by-step guidance for care tasks
 */
export function getTaskGuidance(taskType: string): string[] {
  const guidance: Record<string, string[]> = {
    'blood_pressure': [
      '1. Have them sit comfortably with feet flat on the floor',
      '2. Rest their arm on a table at heart level',
      '3. Wait 5 minutes in quiet rest before measuring',
      '4. Place cuff on bare arm, 1 inch above elbow bend',
      '5. Press start and remain still and quiet',
      '6. Record both numbers (systolic/diastolic)'
    ],
    'medication_administration': [
      '1. Wash your hands thoroughly',
      '2. Check the medication label: right person, right medication, right dose, right time',
      '3. If pill: help them sit upright',
      '4. Give medication with a full glass of water (unless contraindicated)',
      '5. Watch them swallow the medication',
      '6. Mark as given in the system AFTER they swallow',
      '7. Note any side effects or refusal'
    ],
    'wound_dressing_change': [
      '1. Gather supplies: gloves, gauze, tape, cleaning solution, new dressing',
      '2. Wash hands and put on gloves',
      '3. Take a "before" photo if tracking healing',
      '4. Gently remove old dressing',
      '5. Clean wound as instructed (usually saline or wound cleanser)',
      '6. Pat dry with sterile gauze',
      '7. Apply new dressing as instructed',
      '8. Take an "after" photo',
      '9. Dispose of used materials properly',
      '10. Wash hands again'
    ]
  }

  return guidance[taskType] || []
}
