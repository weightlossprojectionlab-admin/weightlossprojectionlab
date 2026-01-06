/**
 * Veterinary Reference Ranges Database
 * Species-specific normal vital sign ranges based on veterinary medical standards
 */

import { PetSpeciesCategory, VitalSignReferenceRange } from '@/types/pet-health';

// ============================================
// REFERENCE RANGE DATABASES BY SPECIES
// ============================================

export const CANINE_REFERENCE_RANGES = {
  temperature: {
    normal: { min: 101.0, max: 102.5 },
    unit: '°F',
    criticalLow: 99.0,
    criticalHigh: 104.0,
    warningLow: 100.0,
    warningHigh: 103.0,
    ageAdjustments: {
      puppy: { min: 100.0, max: 102.5 }
    }
  } as VitalSignReferenceRange,
  heartRate: {
    normal: { min: 60, max: 140 },
    unit: 'bpm',
    criticalLow: 40,
    criticalHigh: 180,
    warningLow: 50,
    warningHigh: 160,
    ageAdjustments: {
      puppy: { min: 120, max: 160 },
      smallBreed: { min: 70, max: 160 }
    }
  } as VitalSignReferenceRange,
  respiratoryRate: {
    normal: { min: 10, max: 30 },
    unit: 'breaths/min',
    criticalLow: 5,
    criticalHigh: 50,
    warningLow: 8,
    warningHigh: 40
  } as VitalSignReferenceRange
};

export const FELINE_REFERENCE_RANGES = {
  temperature: {
    normal: { min: 100.5, max: 102.5 },
    unit: '°F',
    criticalLow: 99.0,
    criticalHigh: 104.0,
    warningLow: 100.0,
    warningHigh: 103.0,
    ageAdjustments: {
      kitten: { min: 100.0, max: 102.5 }
    }
  } as VitalSignReferenceRange,
  heartRate: {
    normal: { min: 140, max: 220 },
    unit: 'bpm',
    criticalLow: 100,
    criticalHigh: 280,
    warningLow: 120,
    warningHigh: 260,
    ageAdjustments: {
      kitten: { min: 200, max: 260 }
    }
  } as VitalSignReferenceRange,
  respiratoryRate: {
    normal: { min: 20, max: 30 },
    unit: 'breaths/min',
    criticalLow: 10,
    criticalHigh: 50,
    warningLow: 15,
    warningHigh: 40
  } as VitalSignReferenceRange
};

export const AVIAN_REFERENCE_RANGES = {
  temperature: {
    normal: { min: 102.0, max: 112.0 },
    unit: '°F',
    criticalLow: 100.0,
    criticalHigh: 114.0,
    warningLow: 101.0,
    warningHigh: 113.0,
    speciesAdjustments: {
      'Small Birds (Finch, Canary)': { min: 105.0, max: 112.0 },
      'Medium Birds (Cockatiel, Conure)': { min: 104.0, max: 110.0 },
      'Large Birds (Macaw, Cockatoo)': { min: 102.0, max: 108.0 }
    }
  } as VitalSignReferenceRange,
  heartRate: {
    normal: { min: 150, max: 600 },
    unit: 'bpm',
    speciesAdjustments: {
      'Small Birds': { min: 400, max: 600 },
      'Medium Birds': { min: 250, max: 450 },
      'Large Birds': { min: 150, max: 300 }
    }
  } as VitalSignReferenceRange,
  respiratoryRate: {
    normal: { min: 15, max: 45 },
    unit: 'breaths/min',
    criticalHigh: 60,
    warningHigh: 50
  } as VitalSignReferenceRange
};

export const SMALL_MAMMAL_REFERENCE_RANGES = {
  rabbit: {
    temperature: {
      normal: { min: 101.0, max: 103.0 },
      unit: '°F',
      criticalLow: 99.0,
      criticalHigh: 105.0
    } as VitalSignReferenceRange,
    heartRate: {
      normal: { min: 180, max: 250 },
      unit: 'bpm',
      criticalLow: 150,
      criticalHigh: 300
    } as VitalSignReferenceRange,
    respiratoryRate: {
      normal: { min: 30, max: 60 },
      unit: 'breaths/min',
      criticalHigh: 80
    } as VitalSignReferenceRange
  },
  guineaPig: {
    temperature: {
      normal: { min: 99.0, max: 103.0 },
      unit: '°F',
      criticalLow: 97.0,
      criticalHigh: 105.0
    } as VitalSignReferenceRange,
    heartRate: {
      normal: { min: 230, max: 380 },
      unit: 'bpm',
      criticalLow: 200,
      criticalHigh: 450
    } as VitalSignReferenceRange,
    respiratoryRate: {
      normal: { min: 42, max: 104 },
      unit: 'breaths/min',
      criticalHigh: 120
    } as VitalSignReferenceRange,
    weight: {
      normal: { min: 700, max: 1200 },
      unit: 'g',
      speciesAdjustments: {
        male: { min: 900, max: 1200 },
        female: { min: 700, max: 900 }
      }
    } as VitalSignReferenceRange
  },
  hamster: {
    temperature: {
      normal: { min: 98.0, max: 102.0 },
      unit: '°F',
      criticalLow: 96.0,
      criticalHigh: 104.0
    } as VitalSignReferenceRange,
    heartRate: {
      normal: { min: 250, max: 500 },
      unit: 'bpm',
      speciesAdjustments: {
        syrian: { min: 310, max: 471 },
        dwarf: { min: 400, max: 600 }
      }
    } as VitalSignReferenceRange,
    respiratoryRate: {
      normal: { min: 35, max: 135 },
      unit: 'breaths/min'
    } as VitalSignReferenceRange,
    weight: {
      normal: { min: 20, max: 150 },
      unit: 'g',
      speciesAdjustments: {
        syrian: { min: 85, max: 150 },
        dwarf: { min: 20, max: 50 }
      }
    } as VitalSignReferenceRange
  }
};

export const REPTILE_REFERENCE_RANGES = {
  // Note: Reptile vitals are highly temperature-dependent (ectothermic)
  general: {
    heartRate: {
      normal: { min: 10, max: 40 },
      unit: 'bpm',
      speciesAdjustments: {
        'Bearded Dragon': { min: 20, max: 40 },
        'Ball Python': { min: 10, max: 25 },
        'Red-Eared Slider': { min: 15, max: 35 }
      }
    } as VitalSignReferenceRange,
    respiratoryRate: {
      normal: { min: 5, max: 30 },
      unit: 'breaths/min'
    } as VitalSignReferenceRange
  },
  environmentalTemperature: {
    beardedDragon: {
      baskingSpot: { min: 95, max: 105, unit: '°F' },
      coolSide: { min: 75, max: 85, unit: '°F' },
      nighttime: { min: 65, max: 75, unit: '°F' }
    },
    ballPython: {
      baskingSpot: { min: 88, max: 92, unit: '°F' },
      coolSide: { min: 78, max: 82, unit: '°F' },
      nighttime: { min: 75, max: 80, unit: '°F' }
    },
    leopardGecko: {
      baskingSpot: { min: 88, max: 92, unit: '°F' },
      coolSide: { min: 75, max: 80, unit: '°F' },
      nighttime: { min: 70, max: 75, unit: '°F' }
    }
  },
  humidity: {
    beardedDragon: { min: 30, max: 40, unit: '%' },
    ballPython: { min: 50, max: 60, unit: '%' },
    leopardGecko: { min: 30, max: 40, unit: '%' },
    redEaredSlider: { min: 60, max: 80, unit: '%' }
  }
};

export const FISH_REFERENCE_RANGES = {
  freshwater: {
    temperature: {
      tropical: { min: 74, max: 82, unit: '°F' },
      coldwater: { min: 50, max: 70, unit: '°F' }
    },
    pH: {
      normal: { min: 6.5, max: 7.5 },
      unit: 'pH',
      criticalLow: 6.0,
      criticalHigh: 8.0
    } as VitalSignReferenceRange,
    ammonia: {
      normal: { min: 0, max: 0 },
      unit: 'ppm',
      criticalHigh: 0.25,
      warningHigh: 0.1
    } as VitalSignReferenceRange,
    nitrite: {
      normal: { min: 0, max: 0 },
      unit: 'ppm',
      criticalHigh: 0.25,
      warningHigh: 0.1
    } as VitalSignReferenceRange,
    nitrate: {
      normal: { min: 0, max: 20 },
      unit: 'ppm',
      criticalHigh: 80,
      warningHigh: 40
    } as VitalSignReferenceRange
  },
  saltwater: {
    temperature: {
      normal: { min: 75, max: 82 },
      unit: '°F',
      criticalLow: 72,
      criticalHigh: 85
    } as VitalSignReferenceRange,
    pH: {
      normal: { min: 8.0, max: 8.4 },
      unit: 'pH',
      criticalLow: 7.8,
      criticalHigh: 8.6
    } as VitalSignReferenceRange,
    salinity: {
      normal: { min: 1.020, max: 1.026 },
      unit: 'specific gravity',
      criticalLow: 1.018,
      criticalHigh: 1.028
    } as VitalSignReferenceRange
  },
  gillMovementRate: {
    normal: { min: 60, max: 150 },
    unit: 'beats/min',
    criticalLow: 30,
    criticalHigh: 200
  } as VitalSignReferenceRange
};

// ============================================
// BODY CONDITION SCORE DEFINITIONS
// ============================================

export const BODY_CONDITION_SCORES = {
  canine9Point: [
    {
      score: 1,
      scale: '1-9' as const,
      description: 'Emaciated',
      visualIndicators: ['Ribs, lumbar vertebrae, pelvic bones easily visible', 'No discernible body fat', 'Obvious loss of muscle mass'],
      palpationIndicators: ['Bones easily palpable with no fat covering'],
      healthImplications: 'Critical malnutrition - immediate veterinary attention required'
    },
    {
      score: 3,
      scale: '1-9' as const,
      description: 'Underweight',
      visualIndicators: ['Ribs easily visible', 'Tops of lumbar vertebrae visible', 'Pelvic bones becoming prominent', 'Obvious waist and abdominal tuck'],
      palpationIndicators: ['Ribs easily palpable with minimal fat covering'],
      healthImplications: 'Below ideal weight - increase caloric intake'
    },
    {
      score: 5,
      scale: '1-9' as const,
      description: 'Ideal',
      visualIndicators: ['Ribs not visible but easily palpable', 'Waist observed behind ribs', 'Abdomen tucked up when viewed from side'],
      palpationIndicators: ['Ribs palpable with slight fat covering', 'Smooth, well-proportioned'],
      healthImplications: 'Optimal body condition - maintain current diet and exercise'
    },
    {
      score: 7,
      scale: '1-9' as const,
      description: 'Overweight',
      visualIndicators: ['Ribs difficult to feel under fat', 'Waist barely visible or absent', 'Abdominal tuck may be absent'],
      palpationIndicators: ['Heavy fat cover over ribs', 'Fat deposits on lumbar area and tail base'],
      healthImplications: 'Above ideal weight - reduce calories and increase exercise'
    },
    {
      score: 9,
      scale: '1-9' as const,
      description: 'Obese',
      visualIndicators: ['Massive fat deposits over thorax, spine, and tail base', 'Waist absent', 'No abdominal tuck', 'Abdominal distension'],
      palpationIndicators: ['Ribs cannot be felt under very heavy fat cover', 'Heavy fat deposits on neck and limbs'],
      healthImplications: 'Severe obesity - veterinary weight loss plan required immediately'
    }
  ],
  feline9Point: [
    {
      score: 1,
      scale: '1-9' as const,
      description: 'Emaciated',
      visualIndicators: ['Ribs visible on short-haired cats', 'No palpable fat', 'Severe abdominal tuck', 'Lumbar vertebrae and wings of ilia easily palpated'],
      palpationIndicators: ['Bones easily palpable with no fat covering'],
      healthImplications: 'Critical malnutrition - immediate veterinary attention required'
    },
    {
      score: 5,
      scale: '1-9' as const,
      description: 'Ideal',
      visualIndicators: ['Well-proportioned', 'Observe waist behind ribs', 'Ribs palpable with slight fat covering', 'Abdominal fat pad minimal'],
      palpationIndicators: ['Ribs easily palpable with minimal fat covering', 'Lumbar vertebrae palpable'],
      healthImplications: 'Optimal body condition - maintain current diet'
    },
    {
      score: 9,
      scale: '1-9' as const,
      description: 'Obese',
      visualIndicators: ['Ribs not palpable under heavy fat cover', 'Heavy abdominal fat pad', 'Fat deposits on limbs and face', 'Marked abdominal distension'],
      palpationIndicators: ['Massive fat deposits over thorax, abdomen, and pelvis'],
      healthImplications: 'Severe obesity - high risk for diabetes, hepatic lipidosis - immediate intervention required'
    }
  ],
  avianKeelBone: [
    {
      score: 1,
      scale: 'keel-bone' as const,
      description: 'Severely Underconditioned',
      visualIndicators: ['Keel bone extremely prominent and sharp', 'Breast muscle severely depleted', 'Concave or flat breast appearance'],
      palpationIndicators: ['No muscle coverage over keel', 'Keel feels like a sharp blade'],
      healthImplications: 'Critical starvation - emergency veterinary care required'
    },
    {
      score: 3,
      scale: 'keel-bone' as const,
      description: 'Ideal',
      visualIndicators: ['Slight muscle coverage over keel bone', 'Rounded breast appearance', 'Keel palpable but not sharp'],
      palpationIndicators: ['Smooth muscle on either side of keel', 'Keel slightly rounded'],
      healthImplications: 'Optimal body condition'
    },
    {
      score: 5,
      scale: 'keel-bone' as const,
      description: 'Overconditioned',
      visualIndicators: ['Keel difficult or impossible to palpate', 'Excessive fat deposits', 'Very rounded or bulging breast'],
      palpationIndicators: ['Thick fat layer covering keel', 'Fat deposits visible on abdomen'],
      healthImplications: 'Obesity - risk for fatty liver disease, decreased flight ability'
    }
  ],
  smallMammal5Point: [
    {
      score: 1,
      scale: '1-5' as const,
      description: 'Very Thin',
      visualIndicators: ['Spine, ribs, and pelvis sharply defined', 'Little to no muscle or fat coverage'],
      palpationIndicators: ['Bones easily palpable with no fat'],
      healthImplications: 'Severely underweight - veterinary examination needed'
    },
    {
      score: 3,
      scale: '1-5' as const,
      description: 'Ideal',
      visualIndicators: ['Well-proportioned appearance', 'Smooth body contours'],
      palpationIndicators: ['Spine and ribs easily palpable but rounded', 'Thin fat layer present', 'Good muscle tone'],
      healthImplications: 'Optimal body condition'
    },
    {
      score: 5,
      scale: '1-5' as const,
      description: 'Obese',
      visualIndicators: ['Rounded body with no definition', 'Fat deposits visible'],
      palpationIndicators: ['Spine and ribs difficult to feel under thick fat', 'Heavy fat deposits'],
      healthImplications: 'Obesity - reduce food intake and increase exercise'
    }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get reference ranges for a specific species
 */
export function getReferenceRanges(speciesCategory: PetSpeciesCategory, speciesDetail?: string): Record<string, VitalSignReferenceRange> {
  switch (speciesCategory) {
    case PetSpeciesCategory.MAMMAL_CANINE:
      return CANINE_REFERENCE_RANGES;

    case PetSpeciesCategory.MAMMAL_FELINE:
      return FELINE_REFERENCE_RANGES;

    case PetSpeciesCategory.AVIAN:
      return AVIAN_REFERENCE_RANGES;

    case PetSpeciesCategory.MAMMAL_SMALL:
      // Determine specific small mammal type from speciesDetail
      if (speciesDetail?.toLowerCase().includes('rabbit')) {
        return SMALL_MAMMAL_REFERENCE_RANGES.rabbit;
      } else if (speciesDetail?.toLowerCase().includes('guinea')) {
        return SMALL_MAMMAL_REFERENCE_RANGES.guineaPig;
      } else if (speciesDetail?.toLowerCase().includes('hamster')) {
        return SMALL_MAMMAL_REFERENCE_RANGES.hamster;
      }
      // Default to rabbit ranges for other small mammals
      return SMALL_MAMMAL_REFERENCE_RANGES.rabbit;

    case PetSpeciesCategory.REPTILE:
      return REPTILE_REFERENCE_RANGES.general;

    case PetSpeciesCategory.FISH:
      // Exclude temperature as it has a different structure for fish (tropical/coldwater)
      const { temperature, ...fishRanges } = FISH_REFERENCE_RANGES.freshwater;
      return {
        ...fishRanges,
        gillMovementRate: FISH_REFERENCE_RANGES.gillMovementRate
      };

    default:
      return {};
  }
}

/**
 * Get body condition score definitions for a species
 */
export function getBodyConditionScoreDefinitions(speciesCategory: PetSpeciesCategory) {
  switch (speciesCategory) {
    case PetSpeciesCategory.MAMMAL_CANINE:
      return BODY_CONDITION_SCORES.canine9Point;

    case PetSpeciesCategory.MAMMAL_FELINE:
      return BODY_CONDITION_SCORES.feline9Point;

    case PetSpeciesCategory.AVIAN:
      return BODY_CONDITION_SCORES.avianKeelBone;

    case PetSpeciesCategory.MAMMAL_SMALL:
      return BODY_CONDITION_SCORES.smallMammal5Point;

    default:
      return BODY_CONDITION_SCORES.smallMammal5Point; // Generic fallback
  }
}

/**
 * Evaluate if a vital sign is within normal range
 */
export function evaluateVitalSign(
  value: number,
  referenceRange: VitalSignReferenceRange
): 'critical-low' | 'warning-low' | 'normal' | 'warning-high' | 'critical-high' {
  if (referenceRange.criticalLow && value < referenceRange.criticalLow) {
    return 'critical-low';
  }
  if (referenceRange.criticalHigh && value > referenceRange.criticalHigh) {
    return 'critical-high';
  }
  if (referenceRange.warningLow && value < referenceRange.warningLow) {
    return 'warning-low';
  }
  if (referenceRange.warningHigh && value > referenceRange.warningHigh) {
    return 'warning-high';
  }
  if (value < referenceRange.normal.min || value > referenceRange.normal.max) {
    return value < referenceRange.normal.min ? 'warning-low' : 'warning-high';
  }
  return 'normal';
}

/**
 * Get alert message for vital sign evaluation
 */
export function getVitalSignAlertMessage(
  metricName: string,
  value: number,
  unit: string,
  evaluation: ReturnType<typeof evaluateVitalSign>,
  speciesCategory: PetSpeciesCategory
): { message: string; severity: 'critical' | 'warning' | 'info'; recommendedAction: string } {
  const speciesName = speciesCategory.replace('mammal_', '').replace('_', ' ');

  switch (evaluation) {
    case 'critical-low':
      return {
        message: `${metricName} critically low: ${value}${unit}`,
        severity: 'critical',
        recommendedAction: `EMERGENCY: Contact veterinarian immediately. This ${metricName} is life-threatening for ${speciesName}s.`
      };

    case 'critical-high':
      return {
        message: `${metricName} critically high: ${value}${unit}`,
        severity: 'critical',
        recommendedAction: `EMERGENCY: Contact veterinarian immediately. This ${metricName} is life-threatening for ${speciesName}s.`
      };

    case 'warning-low':
      return {
        message: `${metricName} below normal: ${value}${unit}`,
        severity: 'warning',
        recommendedAction: `Monitor closely and contact veterinarian if symptoms worsen or ${metricName} continues to drop.`
      };

    case 'warning-high':
      return {
        message: `${metricName} above normal: ${value}${unit}`,
        severity: 'warning',
        recommendedAction: `Monitor closely and contact veterinarian if symptoms worsen or ${metricName} continues to rise.`
      };

    case 'normal':
    default:
      return {
        message: `${metricName} within normal range: ${value}${unit}`,
        severity: 'info',
        recommendedAction: 'Continue routine monitoring.'
      };
  }
}
