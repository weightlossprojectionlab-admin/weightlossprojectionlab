/**
 * Veterinary Vital Ranges Database
 *
 * Sources:
 * - American Veterinary Medical Association (AVMA)
 * - Cornell University College of Veterinary Medicine
 * - Merck Veterinary Manual
 *
 * DISCLAIMER: This data is for informational purposes only.
 * Always consult with a licensed veterinarian for medical advice.
 */

export type VitalType =
  | 'weight'
  | 'temperature'
  | 'heart_rate'
  | 'respiratory_rate'
  | 'blood_pressure'
  | 'blood_glucose'
  | 'pulse_oximetry'
  | 'urine_specific_gravity'
  | 'body_condition_score'

export interface VitalRange {
  vitalType: VitalType
  normalMin: number
  normalMax: number
  unit: string
  criticalLow?: number
  criticalHigh?: number
  measurementNotes?: string
}

export interface SpeciesVitalRanges {
  species: string
  baseVitals: VitalRange[]
  breedSpecificOverrides?: {
    [breedName: string]: Partial<VitalRange>[]
  }
  ageSpecificOverrides?: {
    puppy?: Partial<VitalRange>[]
    adult?: Partial<VitalRange>[]
    senior?: Partial<VitalRange>[]
  }
}

/**
 * DOG Vital Ranges
 */
export const DOG_VITAL_RANGES: SpeciesVitalRanges = {
  species: 'Dog',
  baseVitals: [
    {
      vitalType: 'weight',
      normalMin: 0,
      normalMax: 200, // lbs, breed-dependent
      unit: 'lbs',
      measurementNotes: 'Normal weight varies greatly by breed. Use body condition score.'
    },
    {
      vitalType: 'temperature',
      normalMin: 101.0,
      normalMax: 102.5,
      unit: '°F',
      criticalLow: 99.0,
      criticalHigh: 104.0,
      measurementNotes: 'Rectal temperature is most accurate'
    },
    {
      vitalType: 'heart_rate',
      normalMin: 60,
      normalMax: 140,
      unit: 'bpm',
      criticalLow: 40,
      criticalHigh: 180,
      measurementNotes: 'Smaller breeds typically have higher heart rates'
    },
    {
      vitalType: 'respiratory_rate',
      normalMin: 10,
      normalMax: 35,
      unit: 'breaths/min',
      criticalLow: 6,
      criticalHigh: 40,
      measurementNotes: 'Count breaths at rest'
    },
    {
      vitalType: 'blood_pressure',
      normalMin: 110, // systolic
      normalMax: 160,
      unit: 'mmHg',
      criticalLow: 90,
      criticalHigh: 180,
      measurementNotes: 'Systolic blood pressure. Requires veterinary equipment.'
    },
    {
      vitalType: 'pulse_oximetry',
      normalMin: 95,
      normalMax: 100,
      unit: '%',
      criticalLow: 90,
      measurementNotes: 'Oxygen saturation. May be difficult to measure at home.'
    },
    {
      vitalType: 'body_condition_score',
      normalMin: 4,
      normalMax: 5,
      unit: 'BCS (1-9 scale)',
      measurementNotes: '1=emaciated, 5=ideal, 9=obese'
    }
  ],
  breedSpecificOverrides: {
    // Brachycephalic breeds (flat-faced)
    'Bulldog': [
      {
        vitalType: 'respiratory_rate',
        normalMin: 15,
        normalMax: 40, // Higher due to airway obstruction
        measurementNotes: 'Brachycephalic breeds often have elevated resting respiratory rates'
      }
    ],
    'Pug': [
      {
        vitalType: 'respiratory_rate',
        normalMin: 15,
        normalMax: 40
      }
    ],
    'French Bulldog': [
      {
        vitalType: 'respiratory_rate',
        normalMin: 15,
        normalMax: 40
      }
    ],
    // Large/Giant breeds (prone to heart disease)
    'Great Dane': [
      {
        vitalType: 'heart_rate',
        normalMin: 60,
        normalMax: 100, // Lower due to larger heart
        measurementNotes: 'Giant breeds typically have slower heart rates'
      }
    ],
    'Doberman': [
      {
        vitalType: 'heart_rate',
        normalMin: 60,
        normalMax: 100
      }
    ],
    // Small breeds
    'Chihuahua': [
      {
        vitalType: 'heart_rate',
        normalMin: 100,
        normalMax: 160, // Higher due to smaller heart
        measurementNotes: 'Small breeds typically have faster heart rates'
      }
    ]
  },
  ageSpecificOverrides: {
    puppy: [
      {
        vitalType: 'heart_rate',
        normalMin: 120,
        normalMax: 160,
        measurementNotes: 'Puppies have faster heart rates than adults'
      },
      {
        vitalType: 'respiratory_rate',
        normalMin: 15,
        normalMax: 40
      }
    ],
    senior: [
      {
        vitalType: 'heart_rate',
        normalMin: 60,
        normalMax: 120,
        measurementNotes: 'Senior dogs may have slightly slower heart rates'
      }
    ]
  }
}

/**
 * CAT Vital Ranges
 */
export const CAT_VITAL_RANGES: SpeciesVitalRanges = {
  species: 'Cat',
  baseVitals: [
    {
      vitalType: 'weight',
      normalMin: 5,
      normalMax: 20,
      unit: 'lbs',
      measurementNotes: 'Most domestic cats weigh 8-12 lbs'
    },
    {
      vitalType: 'temperature',
      normalMin: 100.5,
      normalMax: 102.5,
      unit: '°F',
      criticalLow: 99.0,
      criticalHigh: 104.0,
      measurementNotes: 'Rectal temperature is most accurate'
    },
    {
      vitalType: 'heart_rate',
      normalMin: 140,
      normalMax: 220,
      unit: 'bpm',
      criticalLow: 120,
      criticalHigh: 260,
      measurementNotes: 'Cats have faster heart rates than dogs'
    },
    {
      vitalType: 'respiratory_rate',
      normalMin: 20,
      normalMax: 30,
      unit: 'breaths/min',
      criticalLow: 15,
      criticalHigh: 40,
      measurementNotes: 'Count breaths at rest'
    },
    {
      vitalType: 'blood_pressure',
      normalMin: 120,
      normalMax: 170,
      unit: 'mmHg',
      criticalLow: 100,
      criticalHigh: 180,
      measurementNotes: 'Systolic blood pressure. Requires veterinary equipment.'
    },
    {
      vitalType: 'pulse_oximetry',
      normalMin: 95,
      normalMax: 100,
      unit: '%',
      criticalLow: 90,
      measurementNotes: 'Oxygen saturation'
    },
    {
      vitalType: 'body_condition_score',
      normalMin: 4,
      normalMax: 5,
      unit: 'BCS (1-9 scale)',
      measurementNotes: '1=emaciated, 5=ideal, 9=obese'
    }
  ],
  breedSpecificOverrides: {
    'Persian': [
      {
        vitalType: 'respiratory_rate',
        normalMin: 20,
        normalMax: 35,
        measurementNotes: 'Brachycephalic breed with potential airway issues'
      }
    ],
    'Maine Coon': [
      {
        vitalType: 'weight',
        normalMin: 10,
        normalMax: 25,
        measurementNotes: 'Large breed, males can weigh 15-25 lbs'
      }
    ]
  },
  ageSpecificOverrides: {
    puppy: [ // "kitten" in cats
      {
        vitalType: 'heart_rate',
        normalMin: 160,
        normalMax: 240,
        measurementNotes: 'Kittens have faster heart rates'
      }
    ]
  }
}

/**
 * BIRD Vital Ranges
 */
export const BIRD_VITAL_RANGES: SpeciesVitalRanges = {
  species: 'Bird',
  baseVitals: [
    {
      vitalType: 'weight',
      normalMin: 0.5,
      normalMax: 100,
      unit: 'oz',
      measurementNotes: 'Varies greatly by species. Daily weighing recommended.'
    },
    {
      vitalType: 'temperature',
      normalMin: 102.0,
      normalMax: 112.0,
      unit: '°F',
      criticalLow: 100.0,
      criticalHigh: 115.0,
      measurementNotes: 'Birds have higher body temperatures than mammals'
    },
    {
      vitalType: 'respiratory_rate',
      normalMin: 15,
      normalMax: 45,
      unit: 'breaths/min',
      measurementNotes: 'Varies by species size. Smaller birds breathe faster.'
    },
    {
      vitalType: 'body_condition_score',
      normalMin: 4,
      normalMax: 5,
      unit: 'BCS (1-9 scale)',
      measurementNotes: 'Assess keel bone prominence'
    }
  ],
  breedSpecificOverrides: {
    'African Grey': [
      {
        vitalType: 'weight',
        normalMin: 14,
        normalMax: 18,
        unit: 'oz'
      }
    ],
    'Cockatiel': [
      {
        vitalType: 'weight',
        normalMin: 2.5,
        normalMax: 4,
        unit: 'oz'
      }
    ],
    'Budgie': [
      {
        vitalType: 'weight',
        normalMin: 1,
        normalMax: 1.5,
        unit: 'oz'
      }
    ]
  }
}

/**
 * RABBIT Vital Ranges
 */
export const RABBIT_VITAL_RANGES: SpeciesVitalRanges = {
  species: 'Rabbit',
  baseVitals: [
    {
      vitalType: 'weight',
      normalMin: 2,
      normalMax: 12,
      unit: 'lbs',
      measurementNotes: 'Varies by breed. Dwarf breeds 2-4 lbs, larger breeds 8-12 lbs.'
    },
    {
      vitalType: 'temperature',
      normalMin: 101.0,
      normalMax: 103.0,
      unit: '°F',
      criticalLow: 100.0,
      criticalHigh: 105.0,
      measurementNotes: 'Rectal temperature'
    },
    {
      vitalType: 'heart_rate',
      normalMin: 180,
      normalMax: 250,
      unit: 'bpm',
      criticalLow: 150,
      criticalHigh: 300,
      measurementNotes: 'Rabbits have very fast heart rates'
    },
    {
      vitalType: 'respiratory_rate',
      normalMin: 30,
      normalMax: 60,
      unit: 'breaths/min',
      criticalLow: 20,
      criticalHigh: 80,
      measurementNotes: 'Rabbits breathe faster than dogs/cats'
    },
    {
      vitalType: 'body_condition_score',
      normalMin: 4,
      normalMax: 5,
      unit: 'BCS (1-9 scale)',
      measurementNotes: 'Assess spine and ribs palpation'
    }
  ]
}

/**
 * Master lookup by species
 */
export const SPECIES_VITAL_RANGES: Record<string, SpeciesVitalRanges> = {
  'Dog': DOG_VITAL_RANGES,
  'Cat': CAT_VITAL_RANGES,
  'Bird': BIRD_VITAL_RANGES,
  'Rabbit': RABBIT_VITAL_RANGES,
}

/**
 * Get vital ranges for a specific patient
 */
export function getVitalRanges(
  species: string,
  breed?: string,
  ageCategory?: 'puppy' | 'adult' | 'senior'
): VitalRange[] {
  const speciesRanges = SPECIES_VITAL_RANGES[species]
  if (!speciesRanges) {
    console.warn(`No vital ranges found for species: ${species}`)
    return []
  }

  let ranges = [...speciesRanges.baseVitals]

  // Apply breed-specific overrides
  if (breed && speciesRanges.breedSpecificOverrides?.[breed]) {
    const overrides = speciesRanges.breedSpecificOverrides[breed]
    overrides.forEach(override => {
      const index = ranges.findIndex(r => r.vitalType === override.vitalType)
      if (index >= 0) {
        ranges[index] = { ...ranges[index], ...override }
      }
    })
  }

  // Apply age-specific overrides
  if (ageCategory && speciesRanges.ageSpecificOverrides?.[ageCategory]) {
    const overrides = speciesRanges.ageSpecificOverrides[ageCategory]
    overrides.forEach(override => {
      const index = ranges.findIndex(r => r.vitalType === override.vitalType)
      if (index >= 0) {
        ranges[index] = { ...ranges[index], ...override }
      }
    })
  }

  return ranges
}

/**
 * Check if a vital reading is within normal range
 */
export function isVitalNormal(
  vitalType: VitalType,
  value: number,
  species: string,
  breed?: string,
  ageCategory?: 'puppy' | 'adult' | 'senior'
): {
  isNormal: boolean
  isCritical: boolean
  status: 'normal' | 'abnormal' | 'critical-low' | 'critical-high'
  range?: VitalRange
} {
  const ranges = getVitalRanges(species, breed, ageCategory)
  const range = ranges.find(r => r.vitalType === vitalType)

  if (!range) {
    return { isNormal: true, isCritical: false, status: 'normal' }
  }

  // Check critical ranges first
  if (range.criticalLow !== undefined && value < range.criticalLow) {
    return { isNormal: false, isCritical: true, status: 'critical-low', range }
  }
  if (range.criticalHigh !== undefined && value > range.criticalHigh) {
    return { isNormal: false, isCritical: true, status: 'critical-high', range }
  }

  // Check normal ranges
  const isNormal = value >= range.normalMin && value <= range.normalMax

  return {
    isNormal,
    isCritical: false,
    status: isNormal ? 'normal' : 'abnormal',
    range
  }
}
