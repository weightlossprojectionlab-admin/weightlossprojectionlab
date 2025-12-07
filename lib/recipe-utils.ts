/**
 * Recipe Utility Functions
 *
 * Centralized helpers for recipe operations following DRY principles
 */

/**
 * Default serving size for recipes
 */
export const DEFAULT_SERVING_SIZE = 1

/**
 * Get safe serving size with validation
 * Uses nullish coalescing (??) to only default on null/undefined, not 0
 *
 * @param size - The serving size (may be undefined or invalid)
 * @returns Validated serving size (minimum 1)
 */
export function getServingSize(size: number | undefined | null): number {
  // Use ?? instead of || to handle 0 correctly
  const value = size ?? DEFAULT_SERVING_SIZE

  // Validate: must be positive integer
  return value > 0 ? Math.max(1, Math.floor(value)) : DEFAULT_SERVING_SIZE
}

/**
 * Validate serving size and throw if invalid
 * Use this for strict validation at data creation time
 *
 * @param size - The serving size to validate
 * @throws Error if size is invalid
 */
export function validateServingSize(size: number | undefined): void {
  if (size == null) {
    throw new Error('servingSize is required')
  }
  if (size < 1) {
    throw new Error(`Invalid servingSize: ${size}. Must be >= 1`)
  }
  if (!Number.isInteger(size)) {
    throw new Error(`Invalid servingSize: ${size}. Must be an integer`)
  }
}
