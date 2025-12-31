/**
 * Pet Weight Range Data
 * Species and breed-specific healthy weight ranges
 * Used for real-time validation during onboarding
 */

export interface WeightRange {
  min: number // in lbs
  max: number // in lbs
  unit: 'lbs'
}

export interface BreedWeightData {
  [breed: string]: WeightRange
}

export interface SpeciesWeightData {
  [species: string]: {
    default?: WeightRange // Fallback if breed not specified
    breeds?: BreedWeightData
  }
}

/**
 * Comprehensive weight ranges by species and breed
 */
export const PET_WEIGHT_RANGES: SpeciesWeightData = {
  Dog: {
    default: { min: 5, max: 200, unit: 'lbs' },
    breeds: {
      'Labrador Retriever': { min: 55, max: 80, unit: 'lbs' },
      'German Shepherd': { min: 50, max: 90, unit: 'lbs' },
      'Golden Retriever': { min: 55, max: 75, unit: 'lbs' },
      'French Bulldog': { min: 16, max: 28, unit: 'lbs' },
      'Bulldog': { min: 40, max: 50, unit: 'lbs' },
      'Poodle': { min: 6, max: 70, unit: 'lbs' }, // Varies by size
      'Beagle': { min: 20, max: 30, unit: 'lbs' },
      'Rottweiler': { min: 80, max: 135, unit: 'lbs' },
      'German Shorthaired Pointer': { min: 45, max: 70, unit: 'lbs' },
      'Yorkshire Terrier': { min: 4, max: 7, unit: 'lbs' },
      'Boxer': { min: 50, max: 80, unit: 'lbs' },
      'Dachshund': { min: 16, max: 32, unit: 'lbs' },
      'Siberian Husky': { min: 35, max: 60, unit: 'lbs' },
      'Great Dane': { min: 110, max: 175, unit: 'lbs' },
      'Doberman Pinscher': { min: 60, max: 100, unit: 'lbs' },
      'Australian Shepherd': { min: 40, max: 65, unit: 'lbs' },
      'Miniature Schnauzer': { min: 11, max: 20, unit: 'lbs' },
      'Cavalier King Charles Spaniel': { min: 13, max: 18, unit: 'lbs' },
      'Shih Tzu': { min: 9, max: 16, unit: 'lbs' },
      'Boston Terrier': { min: 12, max: 25, unit: 'lbs' },
      'Pomeranian': { min: 3, max: 7, unit: 'lbs' },
      'Havanese': { min: 7, max: 13, unit: 'lbs' },
      'Shetland Sheepdog': { min: 15, max: 25, unit: 'lbs' },
      'Brittany': { min: 30, max: 40, unit: 'lbs' },
      'Pembroke Welsh Corgi': { min: 25, max: 30, unit: 'lbs' }
    }
  },
  Cat: {
    default: { min: 6, max: 15, unit: 'lbs' },
    breeds: {
      'Domestic Shorthair': { min: 8, max: 12, unit: 'lbs' },
      'Domestic Longhair': { min: 8, max: 12, unit: 'lbs' },
      'Siamese': { min: 8, max: 12, unit: 'lbs' },
      'Persian': { min: 7, max: 12, unit: 'lbs' },
      'Maine Coon': { min: 10, max: 25, unit: 'lbs' },
      'Ragdoll': { min: 10, max: 20, unit: 'lbs' },
      'Bengal': { min: 8, max: 15, unit: 'lbs' },
      'Abyssinian': { min: 6, max: 10, unit: 'lbs' },
      'Birman': { min: 6, max: 12, unit: 'lbs' },
      'Oriental Shorthair': { min: 5, max: 10, unit: 'lbs' },
      'Sphynx': { min: 6, max: 12, unit: 'lbs' },
      'Devon Rex': { min: 5, max: 10, unit: 'lbs' },
      'American Shorthair': { min: 7, max: 12, unit: 'lbs' },
      'British Shorthair': { min: 9, max: 18, unit: 'lbs' },
      'Scottish Fold': { min: 6, max: 13, unit: 'lbs' },
      'Exotic Shorthair': { min: 7, max: 12, unit: 'lbs' },
      'Burmese': { min: 6, max: 12, unit: 'lbs' },
      'Himalayan': { min: 7, max: 12, unit: 'lbs' },
      'Russian Blue': { min: 7, max: 12, unit: 'lbs' },
      'Norwegian Forest Cat': { min: 12, max: 16, unit: 'lbs' }
    }
  },
  Rabbit: {
    default: { min: 2, max: 12, unit: 'lbs' },
    breeds: {
      'Holland Lop': { min: 2, max: 4, unit: 'lbs' },
      'Netherland Dwarf': { min: 1.5, max: 2.5, unit: 'lbs' },
      'Mini Rex': { min: 3, max: 4.5, unit: 'lbs' },
      'Lionhead': { min: 2.5, max: 3.75, unit: 'lbs' },
      'Flemish Giant': { min: 13, max: 22, unit: 'lbs' },
      'Dutch': { min: 3.5, max: 5.5, unit: 'lbs' },
      'English Lop': { min: 9, max: 11, unit: 'lbs' },
      'Mini Lop': { min: 4.5, max: 6.5, unit: 'lbs' },
      'Rex': { min: 7.5, max: 10.5, unit: 'lbs' },
      'Angora': { min: 5, max: 12, unit: 'lbs' }
    }
  },
  'Guinea Pig': {
    default: { min: 1.5, max: 3, unit: 'lbs' },
    breeds: {
      'American': { min: 1.5, max: 2.5, unit: 'lbs' },
      'Abyssinian': { min: 1.5, max: 2.5, unit: 'lbs' },
      'Peruvian': { min: 1.5, max: 3, unit: 'lbs' },
      'Silkie': { min: 1.5, max: 2.5, unit: 'lbs' },
      'Teddy': { min: 1.5, max: 2.5, unit: 'lbs' },
      'Texel': { min: 1.5, max: 2.5, unit: 'lbs' },
      'Skinny Pig': { min: 1.5, max: 2.5, unit: 'lbs' }
    }
  },
  Hamster: {
    default: { min: 0.05, max: 0.3, unit: 'lbs' },
    breeds: {
      'Syrian (Golden)': { min: 0.1, max: 0.3, unit: 'lbs' },
      'Dwarf Campbell Russian': { min: 0.05, max: 0.1, unit: 'lbs' },
      'Dwarf Winter White Russian': { min: 0.05, max: 0.1, unit: 'lbs' },
      'Roborovski': { min: 0.04, max: 0.06, unit: 'lbs' },
      'Chinese': { min: 0.06, max: 0.1, unit: 'lbs' }
    }
  },
  Ferret: {
    default: { min: 1.5, max: 5, unit: 'lbs' }
  },
  Hedgehog: {
    default: { min: 0.5, max: 1.5, unit: 'lbs' }
  },
  'Sugar Glider': {
    default: { min: 0.2, max: 0.35, unit: 'lbs' }
  },
  Chinchilla: {
    default: { min: 1, max: 1.75, unit: 'lbs' }
  },
  Horse: {
    default: { min: 800, max: 2200, unit: 'lbs' },
    breeds: {
      'Quarter Horse': { min: 950, max: 1200, unit: 'lbs' },
      'Thoroughbred': { min: 900, max: 1200, unit: 'lbs' },
      'Arabian': { min: 800, max: 1000, unit: 'lbs' },
      'Paint Horse': { min: 950, max: 1200, unit: 'lbs' },
      'Appaloosa': { min: 950, max: 1200, unit: 'lbs' },
      'Tennessee Walker': { min: 900, max: 1200, unit: 'lbs' },
      'Morgan': { min: 900, max: 1100, unit: 'lbs' },
      'Mustang': { min: 700, max: 900, unit: 'lbs' },
      'Clydesdale': { min: 1800, max: 2200, unit: 'lbs' },
      'Percheron': { min: 1800, max: 2600, unit: 'lbs' },
      'Belgian': { min: 1800, max: 2200, unit: 'lbs' },
      'Andalusian': { min: 900, max: 1200, unit: 'lbs' },
      'Friesian': { min: 1200, max: 1400, unit: 'lbs' },
      'Shetland Pony': { min: 400, max: 450, unit: 'lbs' },
      'Welsh Pony': { min: 400, max: 600, unit: 'lbs' },
      'Miniature Horse': { min: 150, max: 350, unit: 'lbs' }
    }
  },
  Cow: {
    default: { min: 1000, max: 2400, unit: 'lbs' },
    breeds: {
      'Holstein': { min: 1400, max: 1800, unit: 'lbs' },
      'Angus': { min: 1200, max: 1800, unit: 'lbs' },
      'Hereford': { min: 1200, max: 1800, unit: 'lbs' },
      'Jersey': { min: 800, max: 1200, unit: 'lbs' },
      'Guernsey': { min: 950, max: 1200, unit: 'lbs' },
      'Dexter': { min: 600, max: 1000, unit: 'lbs' },
      'Highland': { min: 900, max: 1800, unit: 'lbs' }
    }
  },
  Pig: {
    default: { min: 200, max: 700, unit: 'lbs' },
    breeds: {
      'Yorkshire': { min: 450, max: 650, unit: 'lbs' },
      'Duroc': { min: 450, max: 650, unit: 'lbs' },
      'Hampshire': { min: 450, max: 600, unit: 'lbs' },
      'Berkshire': { min: 450, max: 600, unit: 'lbs' }
    }
  },
  'Pot-Bellied Pig': {
    default: { min: 100, max: 200, unit: 'lbs' },
    breeds: {
      'Vietnamese Pot-Bellied': { min: 100, max: 200, unit: 'lbs' },
      'Juliana': { min: 50, max: 80, unit: 'lbs' },
      'KuneKune': { min: 100, max: 200, unit: 'lbs' },
      'Mini Pig': { min: 50, max: 150, unit: 'lbs' },
      'Micro Pig': { min: 40, max: 65, unit: 'lbs' }
    }
  },
  Goat: {
    default: { min: 75, max: 300, unit: 'lbs' },
    breeds: {
      'Nubian': { min: 135, max: 175, unit: 'lbs' },
      'Boer': { min: 200, max: 340, unit: 'lbs' },
      'Alpine': { min: 135, max: 170, unit: 'lbs' },
      'Saanen': { min: 135, max: 185, unit: 'lbs' },
      'Nigerian Dwarf': { min: 60, max: 80, unit: 'lbs' },
      'Pygmy': { min: 50, max: 85, unit: 'lbs' }
    }
  },
  Sheep: {
    default: { min: 100, max: 350, unit: 'lbs' },
    breeds: {
      'Suffolk': { min: 180, max: 275, unit: 'lbs' },
      'Dorset': { min: 150, max: 225, unit: 'lbs' },
      'Merino': { min: 125, max: 235, unit: 'lbs' },
      'Katahdin': { min: 120, max: 185, unit: 'lbs' }
    }
  },
  Chicken: {
    default: { min: 4, max: 10, unit: 'lbs' },
    breeds: {
      'Rhode Island Red': { min: 6, max: 8.5, unit: 'lbs' },
      'Plymouth Rock': { min: 6, max: 9.5, unit: 'lbs' },
      'Leghorn': { min: 4, max: 6, unit: 'lbs' },
      'Orpington': { min: 7, max: 10, unit: 'lbs' },
      'Silkie': { min: 2, max: 3, unit: 'lbs' }
    }
  },
  Duck: {
    default: { min: 3, max: 10, unit: 'lbs' },
    breeds: {
      'Pekin': { min: 8, max: 11, unit: 'lbs' },
      'Muscovy': { min: 8, max: 15, unit: 'lbs' },
      'Khaki Campbell': { min: 3.5, max: 5.5, unit: 'lbs' },
      'Runner': { min: 3, max: 5.5, unit: 'lbs' },
      'Call Duck': { min: 1, max: 1.5, unit: 'lbs' }
    }
  },
  Alpaca: {
    default: { min: 120, max: 200, unit: 'lbs' }
  },
  'Miniature Donkey': {
    default: { min: 200, max: 450, unit: 'lbs' }
  },
  Turkey: {
    default: { min: 10, max: 40, unit: 'lbs' }
  }
}

/**
 * Get weight range for a specific species and breed
 */
export function getWeightRange(species?: string, breed?: string): WeightRange | null {
  if (!species) return null

  const speciesData = PET_WEIGHT_RANGES[species]
  if (!speciesData) return null

  // Try to get breed-specific range first
  if (breed && speciesData.breeds && speciesData.breeds[breed]) {
    return speciesData.breeds[breed]
  }

  // Fall back to species default
  return speciesData.default || null
}

/**
 * Get appropriate weight units for a species/breed
 * Returns available weight units based on typical animal size
 */
export function getWeightUnits(species?: string, breed?: string): ('lbs' | 'kg' | 'g')[] {
  if (!species) return ['lbs', 'kg']

  const range = getWeightRange(species, breed)
  if (!range) return ['lbs', 'kg']

  // If typical weight is under 1 lb (0.45 kg), use grams
  // Examples: Hamsters (0.05-0.3 lbs), Sugar Gliders (0.2-0.35 lbs)
  if (range.max < 1) {
    return ['g', 'kg']
  }

  // Otherwise use lbs/kg (Guinea Pigs, Rabbits, Dogs, Cats, etc.)
  return ['lbs', 'kg']
}

/**
 * Get default weight unit for a species/breed
 */
export function getDefaultWeightUnit(species?: string, breed?: string): 'lbs' | 'kg' | 'g' {
  const units = getWeightUnits(species, breed)
  return units[0] || 'lbs'
}

/**
 * Evaluate if weight is within healthy range
 */
export function evaluateWeight(
  weight: number,
  weightUnit: 'lbs' | 'kg' | 'g',
  species?: string,
  breed?: string
): {
  status: 'underweight' | 'healthy' | 'overweight' | 'unknown'
  message: string
  range?: WeightRange
} {
  const range = getWeightRange(species, breed)

  if (!range) {
    return {
      status: 'unknown',
      message: 'Weight range data not available for this species/breed'
    }
  }

  // Convert weight to lbs if needed
  let weightInLbs: number
  if (weightUnit === 'kg') {
    weightInLbs = weight * 2.20462
  } else if (weightUnit === 'g') {
    weightInLbs = weight * 0.00220462
  } else {
    weightInLbs = weight
  }

  const tolerance = 0.15 // 15% tolerance
  const lowerBound = range.min * (1 - tolerance)
  const upperBound = range.max * (1 + tolerance)

  let status: 'underweight' | 'healthy' | 'overweight' | 'unknown'
  let message: string

  if (weightInLbs < lowerBound) {
    status = 'underweight'
    message = `This is below the typical range for ${breed || species} (${range.min}-${range.max} lbs). Consider consulting a veterinarian.`
  } else if (weightInLbs > upperBound) {
    status = 'overweight'
    message = `This is above the typical range for ${breed || species} (${range.min}-${range.max} lbs). Consider consulting a veterinarian.`
  } else {
    status = 'healthy'
    message = `This is within a healthy range for ${breed || species} (${range.min}-${range.max} lbs).`
  }

  return { status, message, range }
}
