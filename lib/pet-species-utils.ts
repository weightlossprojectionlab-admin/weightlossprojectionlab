/**
 * Pet Species Utilities
 * Shared utilities for mapping pet species to categories
 */

import { PetSpeciesCategory } from '@/types/pet-health';

/**
 * Map species string to PetSpeciesCategory enum
 */
export function getSpeciesCategory(species?: string): PetSpeciesCategory {
  if (!species) return PetSpeciesCategory.OTHER;

  switch (species) {
    case 'Dog':
      return PetSpeciesCategory.MAMMAL_CANINE;
    case 'Cat':
      return PetSpeciesCategory.MAMMAL_FELINE;
    case 'Bird':
      return PetSpeciesCategory.AVIAN;
    case 'Fish':
      return PetSpeciesCategory.FISH;
    case 'Rabbit':
    case 'Guinea Pig':
    case 'Hamster':
      return PetSpeciesCategory.MAMMAL_SMALL;
    case 'Reptile':
      return PetSpeciesCategory.REPTILE;
    default:
      return PetSpeciesCategory.OTHER;
  }
}
