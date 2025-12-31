/**
 * Veterinary Vital Recommendation Engine
 *
 * Intelligently recommends which vitals to track based on:
 * - Species
 * - Breed
 * - Age
 * - Health conditions
 * - Size/weight class
 *
 * DISCLAIMER: This is not veterinary medical advice.
 * Always consult with a licensed veterinarian.
 */

import { VitalType, getVitalRanges } from './vital-ranges'

export type VitalPriority = 'essential' | 'recommended' | 'optional' | 'advanced'

export interface VitalRecommendation {
  vitalType: VitalType
  priority: VitalPriority
  reason: string
  userFriendlyName: string
  canMeasureAtHome: boolean
  requiresEquipment?: string
  veterinaryAdvice?: string
}

export interface PatientProfile {
  species: string
  breed?: string
  age?: number // in years
  weight?: number // in lbs
  healthConditions?: string[]
}

/**
 * Calculate age category
 */
function getAgeCategory(species: string, age: number): 'puppy' | 'adult' | 'senior' {
  if (species === 'Dog') {
    if (age < 1) return 'puppy'
    if (age >= 7) return 'senior'
    return 'adult'
  }
  if (species === 'Cat') {
    if (age < 1) return 'puppy' // "kitten"
    if (age >= 10) return 'senior'
    return 'adult'
  }
  if (species === 'Bird') {
    if (age < 1) return 'puppy'
    if (age >= 15) return 'senior'
    return 'adult'
  }
  if (species === 'Rabbit') {
    if (age < 1) return 'puppy'
    if (age >= 5) return 'senior'
    return 'adult'
  }
  return 'adult'
}

/**
 * Determine size category for dogs
 */
function getDogSizeCategory(breed?: string, weight?: number): 'toy' | 'small' | 'medium' | 'large' | 'giant' | 'unknown' {
  // Weight-based classification
  if (weight !== undefined) {
    if (weight < 10) return 'toy'
    if (weight < 25) return 'small'
    if (weight < 60) return 'medium'
    if (weight < 100) return 'large'
    return 'giant'
  }

  // Breed-based classification (if weight not available)
  const breed_lower = breed?.toLowerCase() || ''

  if (breed_lower.includes('chihuahua') || breed_lower.includes('yorkie') || breed_lower.includes('pomeranian')) {
    return 'toy'
  }
  if (breed_lower.includes('beagle') || breed_lower.includes('cocker spaniel') || breed_lower.includes('pug')) {
    return 'small'
  }
  if (breed_lower.includes('bulldog') || breed_lower.includes('border collie') || breed_lower.includes('australian shepherd')) {
    return 'medium'
  }
  if (breed_lower.includes('labrador') || breed_lower.includes('golden retriever') || breed_lower.includes('german shepherd')) {
    return 'large'
  }
  if (breed_lower.includes('great dane') || breed_lower.includes('mastiff') || breed_lower.includes('st. bernard')) {
    return 'giant'
  }

  return 'unknown'
}

/**
 * Check if breed is brachycephalic (flat-faced)
 */
function isBrachycephalicBreed(species: string, breed?: string): boolean {
  if (!breed) return false
  const breed_lower = breed.toLowerCase()

  if (species === 'Dog') {
    return breed_lower.includes('bulldog') ||
           breed_lower.includes('pug') ||
           breed_lower.includes('boxer') ||
           breed_lower.includes('boston terrier') ||
           breed_lower.includes('french bulldog') ||
           breed_lower.includes('shih tzu') ||
           breed_lower.includes('pekingese')
  }

  if (species === 'Cat') {
    return breed_lower.includes('persian') ||
           breed_lower.includes('himalayan') ||
           breed_lower.includes('exotic shorthair')
  }

  return false
}

/**
 * Main Recommendation Engine
 */
export function getVitalRecommendations(profile: PatientProfile): VitalRecommendation[] {
  const recommendations: VitalRecommendation[] = []
  const { species, breed, age, weight, healthConditions = [] } = profile

  const ageCategory = age ? getAgeCategory(species, age) : 'adult'
  const isBrachycephalic = isBrachycephalicBreed(species, breed)

  // ========================================
  // ESSENTIAL VITALS (All pets)
  // ========================================

  // Weight - ALWAYS essential
  recommendations.push({
    vitalType: 'weight',
    priority: 'essential',
    reason: 'Weight tracking is fundamental for all pets to monitor health trends',
    userFriendlyName: 'Weight',
    canMeasureAtHome: true,
    requiresEquipment: 'Pet scale or bathroom scale',
    veterinaryAdvice: 'Weigh your pet weekly at the same time of day. Sudden weight loss or gain requires veterinary attention.'
  })

  // Temperature - Essential for illness monitoring
  recommendations.push({
    vitalType: 'temperature',
    priority: 'essential',
    reason: 'Temperature helps detect infections, fever, and illness',
    userFriendlyName: 'Body Temperature',
    canMeasureAtHome: true,
    requiresEquipment: 'Digital rectal thermometer',
    veterinaryAdvice: `Normal temperature for ${species}: ${getTemperatureRange(species)}. Fever above 103°F requires immediate veterinary care.`
  })

  // ========================================
  // SPECIES-SPECIFIC RECOMMENDATIONS
  // ========================================

  if (species === 'Dog' || species === 'Cat') {
    // Heart rate - Recommended for dogs and cats
    recommendations.push({
      vitalType: 'heart_rate',
      priority: 'recommended',
      reason: 'Heart rate monitoring helps detect cardiovascular issues',
      userFriendlyName: 'Heart Rate',
      canMeasureAtHome: true,
      requiresEquipment: 'Stethoscope or pulse palpation',
      veterinaryAdvice: `Normal heart rate for ${species}: ${getHeartRateRange(species)}. Measure at rest.`
    })

    // Respiratory rate - Essential for brachycephalic, recommended for others
    recommendations.push({
      vitalType: 'respiratory_rate',
      priority: isBrachycephalic ? 'essential' : 'recommended',
      reason: isBrachycephalic
        ? `${breed} is a brachycephalic (flat-faced) breed with increased respiratory disease risk`
        : 'Respiratory rate helps detect breathing problems and stress',
      userFriendlyName: 'Breathing Rate',
      canMeasureAtHome: true,
      requiresEquipment: 'Just watch chest rise and fall',
      veterinaryAdvice: `Normal breathing rate for ${species}: ${getRespiratoryRateRange(species)}. Count breaths for 15 seconds and multiply by 4.`
    })
  }

  if (species === 'Bird') {
    // Birds need daily weight monitoring
    recommendations.find(r => r.vitalType === 'weight')!.veterinaryAdvice =
      'Birds should be weighed DAILY. Even small weight loss (5-10%) is a medical emergency.'
  }

  if (species === 'Rabbit') {
    // Rabbits need heart rate and respiratory due to fragile health
    recommendations.push({
      vitalType: 'heart_rate',
      priority: 'recommended',
      reason: 'Rabbits are prey animals that hide illness. Heart rate helps detect stress and disease.',
      userFriendlyName: 'Heart Rate',
      canMeasureAtHome: true,
      requiresEquipment: 'Stethoscope',
      veterinaryAdvice: 'Normal heart rate for rabbits: 180-250 bpm. Much faster than dogs/cats.'
    })

    recommendations.push({
      vitalType: 'respiratory_rate',
      priority: 'recommended',
      reason: 'Respiratory monitoring helps detect respiratory infections common in rabbits',
      userFriendlyName: 'Breathing Rate',
      canMeasureAtHome: true,
      veterinaryAdvice: 'Normal breathing rate for rabbits: 30-60 breaths/min.'
    })
  }

  // ========================================
  // CONDITION-BASED RECOMMENDATIONS
  // ========================================

  const conditions_lower = healthConditions.map(c => c.toLowerCase())

  // Diabetes
  if (conditions_lower.some(c => c.includes('diabetes'))) {
    recommendations.push({
      vitalType: 'blood_glucose',
      priority: 'essential',
      reason: 'Blood glucose monitoring is critical for managing diabetes',
      userFriendlyName: 'Blood Sugar',
      canMeasureAtHome: true,
      requiresEquipment: 'Pet glucometer and test strips',
      veterinaryAdvice: 'Monitor blood glucose 2-3 times per day during insulin regulation. Target range: 100-250 mg/dL.'
    })
  }

  // Heart disease / Cardiomyopathy
  if (conditions_lower.some(c => c.includes('heart') || c.includes('cardio') || c.includes('murmur'))) {
    // Upgrade heart rate to essential
    const heartRateRec = recommendations.find(r => r.vitalType === 'heart_rate')
    if (heartRateRec) {
      heartRateRec.priority = 'essential'
      heartRateRec.reason = 'Heart rate monitoring is critical for managing heart disease'
      heartRateRec.veterinaryAdvice = 'Monitor resting heart rate daily. Report sudden changes to your veterinarian immediately.'
    } else {
      recommendations.push({
        vitalType: 'heart_rate',
        priority: 'essential',
        reason: 'Heart rate monitoring is critical for managing heart disease',
        userFriendlyName: 'Heart Rate',
        canMeasureAtHome: true,
        requiresEquipment: 'Stethoscope',
        veterinaryAdvice: 'Monitor resting heart rate daily. Report sudden changes to your veterinarian.'
      })
    }

    // Add respiratory rate if not already added
    const respRateRec = recommendations.find(r => r.vitalType === 'respiratory_rate')
    if (respRateRec) {
      respRateRec.priority = 'essential'
      respRateRec.reason = 'Increased respiratory rate can indicate heart failure (congestive heart failure)'
    } else {
      recommendations.push({
        vitalType: 'respiratory_rate',
        priority: 'essential',
        reason: 'Increased respiratory rate can indicate heart failure',
        userFriendlyName: 'Breathing Rate',
        canMeasureAtHome: true,
        veterinaryAdvice: 'Respiratory rate > 40 at rest may indicate heart failure. Seek emergency care.'
      })
    }

    // Add blood pressure as advanced
    recommendations.push({
      vitalType: 'blood_pressure',
      priority: 'advanced',
      reason: 'Blood pressure monitoring helps assess heart disease severity',
      userFriendlyName: 'Blood Pressure',
      canMeasureAtHome: false,
      requiresEquipment: 'Veterinary-grade blood pressure monitor',
      veterinaryAdvice: 'Blood pressure should be measured by your veterinarian. Home monitoring requires specialized equipment.'
    })
  }

  // Kidney disease
  if (conditions_lower.some(c => c.includes('kidney') || c.includes('renal'))) {
    recommendations.push({
      vitalType: 'blood_pressure',
      priority: 'essential',
      reason: 'High blood pressure is common with kidney disease and can cause blindness',
      userFriendlyName: 'Blood Pressure',
      canMeasureAtHome: false,
      requiresEquipment: 'Veterinary blood pressure monitor',
      veterinaryAdvice: 'Blood pressure should be checked at every vet visit. Hypertension can cause sudden blindness in cats.'
    })

    // Upgrade weight to more critical
    const weightRec = recommendations.find(r => r.vitalType === 'weight')
    if (weightRec) {
      weightRec.reason = 'Weight loss is an early sign of kidney disease progression'
      weightRec.veterinaryAdvice = 'Weigh daily if possible. Even small weight loss can indicate worsening kidney function.'
    }
  }

  // Respiratory disease (asthma, chronic bronchitis)
  if (conditions_lower.some(c => c.includes('asthma') || c.includes('bronchitis') || c.includes('respiratory'))) {
    const respRateRec = recommendations.find(r => r.vitalType === 'respiratory_rate')
    if (respRateRec) {
      respRateRec.priority = 'essential'
      respRateRec.reason = 'Respiratory rate monitoring helps detect asthma attacks and breathing difficulty'
    } else {
      recommendations.push({
        vitalType: 'respiratory_rate',
        priority: 'essential',
        reason: 'Respiratory rate monitoring helps detect asthma attacks',
        userFriendlyName: 'Breathing Rate',
        canMeasureAtHome: true,
        veterinaryAdvice: 'Monitor resting respiratory rate daily. Increased rate may indicate asthma flare-up.'
      })
    }

    recommendations.push({
      vitalType: 'pulse_oximetry',
      priority: 'advanced',
      reason: 'Oxygen saturation monitoring helps assess breathing adequacy',
      userFriendlyName: 'Oxygen Level',
      canMeasureAtHome: true,
      requiresEquipment: 'Pet pulse oximeter',
      veterinaryAdvice: 'Oxygen saturation < 95% requires emergency veterinary care.'
    })
  }

  // ========================================
  // SIZE/BREED-BASED RECOMMENDATIONS
  // ========================================

  if (species === 'Dog') {
    const sizeCategory = getDogSizeCategory(breed, weight)

    // Giant breeds prone to heart disease
    if (sizeCategory === 'giant' || sizeCategory === 'large') {
      const heartRateRec = recommendations.find(r => r.vitalType === 'heart_rate')
      if (heartRateRec && heartRateRec.priority === 'recommended') {
        heartRateRec.priority = 'essential'
        heartRateRec.reason = 'Large and giant breeds are prone to dilated cardiomyopathy (DCM)'
      }
    }
  }

  // ========================================
  // AGE-BASED RECOMMENDATIONS
  // ========================================

  if (ageCategory === 'senior') {
    // Upgrade heart rate for senior pets
    const heartRateRec = recommendations.find(r => r.vitalType === 'heart_rate')
    if (heartRateRec && heartRateRec.priority === 'recommended') {
      heartRateRec.priority = 'essential'
      heartRateRec.reason = 'Senior pets are at higher risk for heart disease'
    }
  }

  // ========================================
  // BODY CONDITION SCORE (All pets)
  // ========================================

  recommendations.push({
    vitalType: 'body_condition_score',
    priority: 'recommended',
    reason: 'Body condition score assesses whether your pet is underweight, ideal, or overweight',
    userFriendlyName: 'Body Condition',
    canMeasureAtHome: true,
    requiresEquipment: 'Visual and palpation assessment',
    veterinaryAdvice: 'Score 1-9: 1=emaciated, 5=ideal, 9=obese. You should be able to feel ribs with light pressure.'
  })

  // ========================================
  // SORT BY PRIORITY
  // ========================================

  const priorityOrder: Record<VitalPriority, number> = {
    'essential': 1,
    'recommended': 2,
    'optional': 3,
    'advanced': 4
  }

  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

// Helper functions for normal ranges
function getTemperatureRange(species: string): string {
  const ranges: Record<string, string> = {
    'Dog': '101-102.5°F',
    'Cat': '100.5-102.5°F',
    'Bird': '102-112°F',
    'Rabbit': '101-103°F'
  }
  return ranges[species] || '101-103°F'
}

function getHeartRateRange(species: string): string {
  const ranges: Record<string, string> = {
    'Dog': '60-140 bpm',
    'Cat': '140-220 bpm',
    'Rabbit': '180-250 bpm'
  }
  return ranges[species] || '60-140 bpm'
}

function getRespiratoryRateRange(species: string): string {
  const ranges: Record<string, string> = {
    'Dog': '10-35 breaths/min',
    'Cat': '20-30 breaths/min',
    'Bird': '15-45 breaths/min',
    'Rabbit': '30-60 breaths/min'
  }
  return ranges[species] || '10-35 breaths/min'
}

/**
 * Get human-readable explanation of why vitals are recommended
 */
export function getRecommendationSummary(profile: PatientProfile): string {
  const recs = getVitalRecommendations(profile)
  const essential = recs.filter(r => r.priority === 'essential')
  const recommended = recs.filter(r => r.priority === 'recommended')

  let summary = `For your ${profile.species}${profile.breed ? ` (${profile.breed})` : ''}, we recommend tracking:\n\n`

  if (essential.length > 0) {
    summary += `**Essential vitals:**\n`
    essential.forEach(r => {
      summary += `- ${r.userFriendlyName}: ${r.reason}\n`
    })
  }

  if (recommended.length > 0) {
    summary += `\n**Recommended vitals:**\n`
    recommended.forEach(r => {
      summary += `- ${r.userFriendlyName}: ${r.reason}\n`
    })
  }

  return summary
}
