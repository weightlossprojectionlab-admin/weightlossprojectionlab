/**
 * Utility functions for the application
 */

/**
 * Capitalize the first letter of each word in a name (Title Case)
 * Handles special cases like "O'Brien", "McDonald", etc.
 *
 * @param name - The name to capitalize
 * @returns Properly capitalized name
 *
 * @example
 * capitalizeName("charlie") // "Charlie"
 * capitalizeName("john doe") // "John Doe"
 * capitalizeName("o'brien") // "O'Brien"
 * capitalizeName("mcdonald") // "McDonald"
 */
export function capitalizeName(name: string): string {
  if (!name || typeof name !== 'string') return ''

  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return word

      // Handle names with apostrophes (O'Brien, D'Angelo)
      if (word.includes("'")) {
        return word.split("'").map(part =>
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join("'")
      }

      // Handle Mc/Mac names (McDonald, MacLeod)
      if (word.startsWith('mc') && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3)
      }
      if (word.startsWith('mac') && word.length > 3) {
        return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4)
      }

      // Default: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
    .trim()
}

/**
 * Generate a SEO-friendly slug from a recipe name
 * @param recipeName - The recipe name (e.g., "Greek Chicken Bowl")
 * @returns URL-safe slug (e.g., "greek-chicken-bowl")
 *
 * @example
 * generateRecipeSlug("Greek Chicken Bowl") // "greek-chicken-bowl"
 * generateRecipeSlug("Mom's Apple Pie!") // "moms-apple-pie"
 * generateRecipeSlug("3-Ingredient Pancakes") // "3-ingredient-pancakes"
 */
export function generateRecipeSlug(recipeName: string): string {
  // Validate input and provide fallback
  if (!recipeName || typeof recipeName !== 'string' || recipeName.trim().length === 0) {
    return 'recipe'
  }

  // Normalize accented characters (café → cafe)
  const normalized = recipeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  let slug = normalized
    .toLowerCase()
    .trim()
    // Replace apostrophes with nothing
    .replace(/['']/g, '')
    // Replace spaces and non-alphanumeric chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')

  // Truncate to 60 characters (preserve word boundaries if possible)
  if (slug.length > 60) {
    slug = slug.substring(0, 60).replace(/-[^-]*$/, '')
  }

  // Prefix with "recipe-" if starts with a number
  if (/^\d/.test(slug)) {
    slug = `recipe-${slug}`
  }

  // Final fallback if slug is empty after processing
  return slug || 'recipe'
}

/**
 * Generate SEO-friendly filename for recipe image
 * @param recipeName - The recipe name
 * @param imageIndex - Index of the image (1-based)
 * @param imageType - Type of image (hero, angle, process)
 * @returns SEO-friendly filename
 *
 * @example
 * generateRecipeImageFilename("Greek Chicken Bowl", 1, "hero")
 * // "greek-chicken-bowl-hero.webp"
 *
 * generateRecipeImageFilename("Avocado Toast", 2, "angle")
 * // "avocado-toast-angle-2.webp"
 */
export function generateRecipeImageFilename(
  recipeName: string,
  imageIndex: number,
  imageType: 'hero' | 'angle' | 'process' = 'hero'
): string {
  const slug = generateRecipeSlug(recipeName)

  if (imageIndex === 1 && imageType === 'hero') {
    // Primary/hero image gets special naming
    return `${slug}-hero.webp`
  }

  // Additional images get descriptive suffixes
  return `${slug}-${imageType}-${imageIndex}.webp`
}

/**
 * Generate SEO-friendly filename for recipe video
 * @param recipeName - The recipe name
 * @returns SEO-friendly video filename
 *
 * @example
 * generateRecipeVideoFilename("Greek Chicken Bowl")
 * // "greek-chicken-bowl-cooking-tutorial.mp4"
 */
export function generateRecipeVideoFilename(recipeName: string): string {
  const slug = generateRecipeSlug(recipeName)
  return `${slug}-cooking-tutorial.mp4`
}

/**
 * Generate descriptive alt text for recipe image
 * @param recipeName - The recipe name
 * @param mealType - Type of meal (breakfast, lunch, dinner, snack)
 * @param context - Optional context (hero, angle, process, thumbnail)
 * @returns Descriptive alt text optimized for accessibility and SEO
 *
 * @example
 * generateRecipeAltText("Greek Chicken Bowl", "lunch", "hero")
 * // "Greek Chicken Bowl - Healthy lunch recipe"
 *
 * generateRecipeAltText("Pancakes", "breakfast", "process")
 * // "Pancakes - Breakfast recipe preparation"
 */
export function generateRecipeAltText(
  recipeName: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  context?: 'hero' | 'angle' | 'process' | 'thumbnail'
): string {
  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1)

  switch (context) {
    case 'hero':
      return `${recipeName} - Healthy ${mealType} recipe`
    case 'process':
      return `${recipeName} - ${mealTypeLabel} recipe preparation`
    case 'angle':
      return `${recipeName} - ${mealTypeLabel} recipe alternate view`
    case 'thumbnail':
      return `${recipeName} - Recipe thumbnail`
    default:
      return `${recipeName} - ${mealTypeLabel} recipe`
  }
}
