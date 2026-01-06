/**
 * Pet Weight Conditions Utility
 * Suggests health conditions based on pet weight status
 */

import { evaluateWeight } from '@/lib/pet-weight-ranges'

interface PetWeightConditionsParams {
  weight?: string | number
  weightUnit: 'lbs' | 'kg'
  species?: string
  breed?: string
  availableConditions: string[]
}

/**
 * Get suggested health conditions based on pet weight status
 */
export function getPetWeightConditions({
  weight,
  weightUnit,
  species,
  breed,
  availableConditions
}: PetWeightConditionsParams): string[] {
  if (!weight || !species) return []

  const weightValue = typeof weight === 'string' ? parseFloat(weight) : weight
  if (isNaN(weightValue) || weightValue <= 0) return []

  const evaluation = evaluateWeight(weightValue, weightUnit, species, breed)
  const suggestions: string[] = []

  // Helper to add condition if it exists in available conditions
  const addIfAvailable = (condition: string) => {
    if (availableConditions.includes(condition)) {
      suggestions.push(condition)
    }
  }

  if (evaluation.status === 'overweight') {
    // Universal obesity suggestion
    addIfAvailable('Obesity')

    // Species-specific overweight conditions
    switch (species) {
      case 'Dog':
        addIfAvailable('Arthritis')
        addIfAvailable('Hip Dysplasia')
        addIfAvailable('Diabetes')
        addIfAvailable('Heart Disease')
        break

      case 'Cat':
        addIfAvailable('Diabetes')
        addIfAvailable('Arthritis')
        addIfAvailable('Urinary Tract Issues')
        break

      case 'Rabbit':
      case 'Guinea Pig':
        addIfAvailable('Dental Disease')
        addIfAvailable('GI Stasis')
        break

      case 'Horse':
        addIfAvailable('Laminitis')
        addIfAvailable('Arthritis')
        addIfAvailable('Equine Metabolic Syndrome')
        break

      case 'Ferret':
        addIfAvailable('Insulinoma')
        addIfAvailable('Cardiomyopathy')
        break

      case 'Hedgehog':
        addIfAvailable('Fatty Liver Disease')
        break

      case 'Parrot':
        addIfAvailable('Fatty Liver Disease')
        break

      case 'Pot-Bellied Pig':
        addIfAvailable('Arthritis')
        addIfAvailable('Hoof Problems')
        break
    }
  } else if (evaluation.status === 'underweight') {
    // Universal underweight conditions
    addIfAvailable('Nutritional Deficiencies')
    addIfAvailable('Parasites')

    // Species-specific underweight conditions
    if (species === 'Dog' || species === 'Cat') {
      addIfAvailable('Dental Disease')
      addIfAvailable('Kidney Disease')
    }

    if (species === 'Rabbit' || species === 'Guinea Pig') {
      addIfAvailable('Dental Disease')
      addIfAvailable('GI Stasis')
    }

    if (species === 'Bird' || species === 'Parrot') {
      addIfAvailable('Nutritional Deficiencies')
      addIfAvailable('Parasites')
    }
  }

  return suggestions
}
