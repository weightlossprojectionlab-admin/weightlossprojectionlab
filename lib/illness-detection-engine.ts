/**
 * Illness Detection Engine
 *
 * Automatically detects when family members (including pets) may be getting sick
 * based on vital signs, mood changes, and behavioral patterns.
 *
 * Triggers:
 * - Abnormal vital signs (fever, low O2, etc.)
 * - Mood/behavior decline
 * - Pattern changes (skipped meals, reduced activity)
 */

import { logger } from '@/lib/logger'
import { PatientProfile, VitalSign, VitalType, MoodValue, PetBehaviorValue } from '@/types/medical'
import { medicalOperations } from '@/lib/medical-operations'

// ==================== TYPES ====================

export type IllnessSignalType = 'vital_abnormal' | 'mood_decline' | 'pattern_change' | 'symptom_report'

export type IllnessSignalSeverity = 'low' | 'medium' | 'high' | 'critical'

export type RecommendedAction = 'monitor' | 'create_episode' | 'contact_doctor' | 'emergency'

export interface IllnessSignal {
  type: IllnessSignalType
  severity: IllnessSignalSeverity
  patientId: string
  patientName: string
  patientType: 'human' | 'pet'
  species?: string // For pets
  detectedAt: string // ISO 8601

  // What triggered detection
  trigger: {
    vitalType?: VitalType
    currentValue?: any
    normalRange?: { min: number; max: number }
    deviation?: number // How far from normal (percentage or absolute)

    moodChange?: {
      energy: number // Change from baseline (-4 to +4)
      appetite: number
      pain: number
      overall: number
    }

    patternChange?: {
      type: 'meal_skipped' | 'activity_drop' | 'weight_loss' | 'sleep_disruption'
      description: string
      severity: number // 0-1
    }

    symptoms?: string[] // User-reported symptoms
  }

  // Suggested action
  recommendation: {
    action: RecommendedAction
    confidence: number // 0-1
    reasoning: string
    suggestedIllnesses?: string[] // Pre-fill suggestions: ['Flu', 'Cold', ...]
    requiresPhotos?: boolean // Suggest visual documentation
  }

  // Linked data
  linkedVitalId?: string // Vital sign that triggered detection
}

// ==================== THRESHOLDS ====================

/**
 * Vital sign thresholds for illness detection
 * Different thresholds for humans vs pets
 */
export const VITAL_THRESHOLDS = {
  human: {
    temperature: {
      fever: 100.4, // °F
      high_fever: 103.0,
      hypothermia: 95.0,
    },
    blood_sugar: {
      hypoglycemia: 70, // mg/dL
      hyperglycemia: 180,
      critical_low: 54,
      critical_high: 250,
    },
    pulse_ox: {
      low: 92, // % SpO2
      critical: 88,
    },
    heart_rate: {
      low: 50, // bpm
      high: 120,
      critical_low: 40,
      critical_high: 150,
    },
    blood_pressure: {
      systolic_high: 140, // mmHg
      systolic_critical: 180,
      diastolic_high: 90,
      diastolic_critical: 120,
    },
  },

  pet: {
    // Dogs
    dog: {
      temperature: {
        fever: 103.0,
        high_fever: 105.0,
        hypothermia: 99.0,
      },
      heart_rate: {
        low: 60, // Small dogs higher, large dogs lower
        high: 140,
      },
    },

    // Cats
    cat: {
      temperature: {
        fever: 103.5,
        high_fever: 105.5,
        hypothermia: 99.5,
      },
      heart_rate: {
        low: 120,
        high: 200,
      },
    },

    // Generic (for other animals - birds, rabbits, etc.)
    generic: {
      // Use behavioral changes as primary indicator
      // Since normal vitals vary widely by species
    },
  },
} as const

/**
 * Mood/behavior decline threshold
 * A drop of 2+ points in energy, appetite, or overall triggers detection
 */
export const MOOD_DECLINE_THRESHOLD = -2

/**
 * Pain threshold - any pain ≥ 3 triggers detection
 */
export const PAIN_THRESHOLD = 3

// ==================== DETECTION FUNCTIONS ====================

/**
 * Main detection entry point
 * Analyzes all signals for a patient and returns detected illness indicators
 */
export async function detectIllnessSignals(patientId: string): Promise<IllnessSignal[]> {
  try {
    logger.info('[IllnessDetection] Running detection for patient', { patientId })

    const signals: IllnessSignal[] = []

    // Get patient profile
    const patient = await medicalOperations.patients.getPatient(patientId)

    // 1. Check recent vitals for abnormalities
    const recentVitals = await medicalOperations.vitals.getVitals(patientId)
    const vitalSignals = await analyzeRecentVitals(recentVitals, patient)
    signals.push(...vitalSignals)

    // 2. Check mood/behavior changes
    const moodSignals = await analyzeMoodChanges(patientId, patient)
    if (moodSignals) signals.push(moodSignals)

    // 3. Check pattern changes (meals, activity, weight)
    // TODO: Implement pattern analysis

    logger.info('[IllnessDetection] Detection complete', { patientId, signalsFound: signals.length })

    return signals
  } catch (error) {
    logger.error('[IllnessDetection] Error during detection', error as Error, { patientId })
    return []
  }
}

/**
 * Analyze a single vital sign for abnormalities
 * Called immediately after logging a vital
 */
export async function analyzeVitalAbnormality(
  vital: VitalSign,
  patient: PatientProfile
): Promise<IllnessSignal | null> {
  try {
    const { type, value } = vital

    // Skip weight and mood for this analysis (handled separately)
    if (type === 'weight' || type === 'mood') return null

    const thresholds = getThresholdsForPatient(patient, type)
    if (!thresholds) return null

    // Extract numeric value from vital
    const numericValue = extractNumericValue(value, type)
    if (numericValue === null) return null

    // Check against thresholds
    const abnormality = checkAbnormality(numericValue, thresholds, type)
    if (!abnormality) return null

    // Build illness signal
    const signal: IllnessSignal = {
      type: 'vital_abnormal',
      severity: abnormality.severity,
      patientId: patient.id,
      patientName: patient.name,
      patientType: patient.type,
      species: patient.species,
      detectedAt: new Date().toISOString(),

      trigger: {
        vitalType: type,
        currentValue: value,
        normalRange: abnormality.normalRange,
        deviation: abnormality.deviation,
      },

      recommendation: {
        action: abnormality.action,
        confidence: abnormality.confidence,
        reasoning: abnormality.reasoning,
        suggestedIllnesses: getSuggestedIllnesses(type, patient.type, abnormality.direction),
        requiresPhotos: false,
      },

      linkedVitalId: vital.id,
    }

    logger.info('[IllnessDetection] Abnormal vital detected', {
      patientId: patient.id,
      vitalType: type,
      severity: signal.severity,
    })

    return signal
  } catch (error) {
    logger.error('[IllnessDetection] Error analyzing vital', error as Error)
    return null
  }
}

/**
 * Analyze mood changes from baseline
 */
async function analyzeMoodChanges(
  patientId: string,
  patient: PatientProfile
): Promise<IllnessSignal | null> {
  try {
    // Get recent mood vitals (last 7 days for baseline, most recent for current)
    const vitals = await medicalOperations.vitals.getVitals(patientId)
    const moodVitals = vitals.filter(v => v.type === 'mood')

    if (moodVitals.length < 2) return null // Need at least 2 data points

    // Most recent mood
    const currentMood = moodVitals[0].value as MoodValue | PetBehaviorValue

    // Baseline (average of previous 7 days, excluding today)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const baselineVitals = moodVitals
      .slice(1) // Skip most recent
      .filter(v => new Date(v.recordedAt) >= oneWeekAgo)

    if (baselineVitals.length === 0) return null

    // Calculate baseline averages
    const baseline = calculateMoodBaseline(baselineVitals)

    // Calculate changes
    const changes = {
      energy: currentMood.energy - baseline.energy,
      appetite: currentMood.appetite - baseline.appetite,
      pain: currentMood.pain - baseline.pain,
      overall: currentMood.overall - baseline.overall,
    }

    // Check for significant decline
    const hasSignificantDecline =
      changes.energy <= MOOD_DECLINE_THRESHOLD ||
      changes.appetite <= MOOD_DECLINE_THRESHOLD ||
      changes.overall <= MOOD_DECLINE_THRESHOLD ||
      currentMood.pain >= PAIN_THRESHOLD

    if (!hasSignificantDecline) return null

    // Determine severity
    const severity = determineMoodSeverity(changes, currentMood.pain)

    const signal: IllnessSignal = {
      type: 'mood_decline',
      severity,
      patientId: patient.id,
      patientName: patient.name,
      patientType: patient.type,
      species: patient.species,
      detectedAt: new Date().toISOString(),

      trigger: {
        moodChange: changes,
      },

      recommendation: {
        action: severity === 'critical' || severity === 'high' ? 'create_episode' : 'monitor',
        confidence: 0.75,
        reasoning: buildMoodReasoningText(changes, currentMood.pain, patient.type),
        suggestedIllnesses: getMoodBasedSuggestions(patient.type, currentMood),
        requiresPhotos: patient.type === 'pet', // Always suggest photos for pets
      },
    }

    logger.info('[IllnessDetection] Mood decline detected', {
      patientId: patient.id,
      changes,
      severity,
    })

    return signal
  } catch (error) {
    logger.error('[IllnessDetection] Error analyzing mood', error as Error)
    return null
  }
}

/**
 * Analyze recent vitals in batch
 */
async function analyzeRecentVitals(
  vitals: VitalSign[],
  patient: PatientProfile
): Promise<IllnessSignal[]> {
  const signals: IllnessSignal[] = []

  // Check last 24 hours of vitals
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const recentVitals = vitals.filter(v => new Date(v.recordedAt) >= oneDayAgo)

  for (const vital of recentVitals) {
    const signal = await analyzeVitalAbnormality(vital, patient)
    if (signal) signals.push(signal)
  }

  return signals
}

// ==================== HELPER FUNCTIONS ====================

function getThresholdsForPatient(patient: PatientProfile, vitalType: VitalType): any {
  if (patient.type === 'human') {
    return VITAL_THRESHOLDS.human[vitalType as keyof typeof VITAL_THRESHOLDS.human]
  } else {
    // Pet
    const species = patient.species?.toLowerCase()
    if (species === 'dog') {
      return VITAL_THRESHOLDS.pet.dog[vitalType as keyof typeof VITAL_THRESHOLDS.pet.dog]
    } else if (species === 'cat') {
      return VITAL_THRESHOLDS.pet.cat[vitalType as keyof typeof VITAL_THRESHOLDS.pet.cat]
    }
    return null // Generic - use behavioral tracking
  }
}

function extractNumericValue(value: any, type: VitalType): number | null {
  if (typeof value === 'number') return value

  if (type === 'blood_pressure' && typeof value === 'object') {
    return value.systolic // Use systolic for comparison
  }

  if (type === 'pulse_oximeter' && typeof value === 'object') {
    return value.spo2 // Use SpO2 for comparison
  }

  return null
}

function checkAbnormality(
  value: number,
  thresholds: any,
  type: VitalType
): {
  severity: IllnessSignalSeverity
  action: RecommendedAction
  confidence: number
  reasoning: string
  normalRange?: { min: number; max: number }
  deviation: number
  direction: 'high' | 'low'
} | null {
  // Temperature checks
  if ('fever' in thresholds) {
    if (value >= thresholds.high_fever) {
      return {
        severity: 'critical',
        action: 'contact_doctor',
        confidence: 0.95,
        reasoning: `High fever detected (${value}°F). Medical attention recommended.`,
        normalRange: { min: 97.0, max: 99.5 },
        deviation: value - thresholds.fever,
        direction: 'high',
      }
    } else if (value >= thresholds.fever) {
      return {
        severity: 'high',
        action: 'create_episode',
        confidence: 0.9,
        reasoning: `Fever detected (${value}°F). Consider tracking illness.`,
        normalRange: { min: 97.0, max: 99.5 },
        deviation: value - thresholds.fever,
        direction: 'high',
      }
    } else if (value <= thresholds.hypothermia) {
      return {
        severity: 'critical',
        action: 'emergency',
        confidence: 0.95,
        reasoning: `Hypothermia detected (${value}°F). Seek immediate medical help.`,
        normalRange: { min: 97.0, max: 99.5 },
        deviation: thresholds.hypothermia - value,
        direction: 'low',
      }
    }
  }

  // Blood sugar checks
  if ('hypoglycemia' in thresholds) {
    if (value <= thresholds.critical_low) {
      return {
        severity: 'critical',
        action: 'emergency',
        confidence: 0.95,
        reasoning: `Critical low blood sugar (${value} mg/dL). Immediate action required.`,
        normalRange: { min: 70, max: 140 },
        deviation: thresholds.critical_low - value,
        direction: 'low',
      }
    } else if (value <= thresholds.hypoglycemia) {
      return {
        severity: 'high',
        action: 'monitor',
        confidence: 0.8,
        reasoning: `Low blood sugar detected (${value} mg/dL). Monitor closely.`,
        normalRange: { min: 70, max: 140 },
        deviation: thresholds.hypoglycemia - value,
        direction: 'low',
      }
    } else if (value >= thresholds.critical_high) {
      return {
        severity: 'critical',
        action: 'contact_doctor',
        confidence: 0.95,
        reasoning: `Critical high blood sugar (${value} mg/dL). Contact doctor.`,
        normalRange: { min: 70, max: 140 },
        deviation: value - thresholds.critical_high,
        direction: 'high',
      }
    } else if (value >= thresholds.hyperglycemia) {
      return {
        severity: 'medium',
        action: 'monitor',
        confidence: 0.75,
        reasoning: `Elevated blood sugar (${value} mg/dL). Monitor closely.`,
        normalRange: { min: 70, max: 140 },
        deviation: value - thresholds.hyperglycemia,
        direction: 'high',
      }
    }
  }

  // Pulse ox checks
  if ('low' in thresholds && type === 'pulse_oximeter') {
    if (value <= thresholds.critical) {
      return {
        severity: 'critical',
        action: 'emergency',
        confidence: 0.95,
        reasoning: `Critical low oxygen saturation (${value}%). Seek immediate help.`,
        normalRange: { min: 95, max: 100 },
        deviation: thresholds.critical - value,
        direction: 'low',
      }
    } else if (value <= thresholds.low) {
      return {
        severity: 'high',
        action: 'contact_doctor',
        confidence: 0.9,
        reasoning: `Low oxygen saturation (${value}%). Contact doctor.`,
        normalRange: { min: 95, max: 100 },
        deviation: thresholds.low - value,
        direction: 'low',
      }
    }
  }

  return null
}

function getSuggestedIllnesses(vitalType: VitalType, patientType: 'human' | 'pet', direction: 'high' | 'low'): string[] {
  const suggestions: Record<string, Record<string, string[]>> = {
    temperature: {
      high: patientType === 'human'
        ? ['Flu', 'COVID-19', 'Cold', 'Infection', 'Strep throat']
        : ['Infection', 'Heat stroke', 'Fever of unknown origin'],
      low: ['Hypothermia'],
    },
    blood_sugar: {
      high: ['Diabetes', 'Pre-diabetes'],
      low: ['Hypoglycemia', 'Diabetes medication issue'],
    },
    pulse_oximeter: {
      low: patientType === 'human'
        ? ['Respiratory infection', 'COVID-19', 'Pneumonia', 'Asthma attack']
        : ['Respiratory distress', 'Heart condition'],
    },
  }

  return suggestions[vitalType]?.[direction] || []
}

function calculateMoodBaseline(vitals: VitalSign[]): MoodValue {
  const values = vitals.map(v => v.value as MoodValue | PetBehaviorValue)

  return {
    energy: Math.round(values.reduce((sum, v) => sum + v.energy, 0) / values.length),
    appetite: Math.round(values.reduce((sum, v) => sum + v.appetite, 0) / values.length),
    pain: Math.round(values.reduce((sum, v) => sum + v.pain, 0) / values.length),
    overall: Math.round(values.reduce((sum, v) => sum + v.overall, 0) / values.length),
  } as MoodValue
}

function determineMoodSeverity(changes: any, pain: number): IllnessSignalSeverity {
  if (pain >= 5 || changes.overall <= -4) return 'critical'
  if (pain >= 4 || changes.overall <= -3) return 'high'
  if (pain >= 3 || changes.overall <= -2) return 'medium'
  return 'low'
}

function buildMoodReasoningText(changes: any, pain: number, patientType: 'human' | 'pet'): string {
  const parts: string[] = []

  if (changes.energy <= MOOD_DECLINE_THRESHOLD) {
    parts.push(`Low energy (${changes.energy > 0 ? '+' : ''}${changes.energy} from baseline)`)
  }
  if (changes.appetite <= MOOD_DECLINE_THRESHOLD) {
    parts.push(`Poor appetite (${changes.appetite > 0 ? '+' : ''}${changes.appetite} from baseline)`)
  }
  if (pain >= PAIN_THRESHOLD) {
    parts.push(`Pain reported (${pain}/5)`)
  }
  if (changes.overall <= MOOD_DECLINE_THRESHOLD) {
    parts.push(`Overall condition declined (${changes.overall > 0 ? '+' : ''}${changes.overall} from baseline)`)
  }

  if (parts.length === 0) return 'Behavioral changes detected'

  return parts.join('. ') + '.'
}

function getMoodBasedSuggestions(patientType: 'human' | 'pet', mood: MoodValue | PetBehaviorValue): string[] {
  if (patientType === 'human') {
    const humanMood = mood as MoodValue
    if (humanMood.symptoms && humanMood.symptoms.length > 0) {
      // Return suggestions based on symptoms
      return [] // Let wizard handle this
    }
    return ['General illness', 'Flu', 'Cold', 'Fatigue']
  } else {
    const petBehavior = mood as PetBehaviorValue
    const suggestions: string[] = []

    if (petBehavior.behavior === 'hiding' || petBehavior.behavior === 'withdrawn') {
      suggestions.push('Illness', 'Pain', 'Stress')
    }
    if (petBehavior.mobility && petBehavior.mobility.includes('limping')) {
      suggestions.push('Injury', 'Arthritis')
    }
    if (petBehavior.vocalizations === 'distressed' || petBehavior.vocalizations === 'excessive') {
      suggestions.push('Pain', 'Distress', 'Anxiety')
    }

    return suggestions.length > 0 ? suggestions : ['General illness', 'Behavioral issue']
  }
}
