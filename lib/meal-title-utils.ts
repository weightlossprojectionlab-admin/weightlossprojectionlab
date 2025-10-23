/**
 * Utility functions for generating and managing meal titles
 */

// Common food categories and their context words
const FOOD_CATEGORIES = {
  grains: ['rice', 'pasta', 'noodles', 'bread', 'quinoa', 'oats', 'cereal'],
  proteins: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'tofu', 'eggs', 'shrimp'],
  vegetables: ['salad', 'broccoli', 'spinach', 'kale', 'carrots', 'peppers', 'tomatoes'],
  fruits: ['apple', 'banana', 'berries', 'orange', 'grapes', 'mango'],
}

const CONTEXT_WORDS = {
  bowl: ['rice', 'quinoa', 'grain', 'noodles', 'pasta'],
  salad: ['lettuce', 'greens', 'spinach', 'kale', 'vegetables'],
  plate: ['chicken', 'beef', 'pork', 'fish', 'protein'],
  sandwich: ['bread', 'toast', 'wrap', 'pita'],
  smoothie: ['banana', 'berries', 'fruit', 'protein powder'],
}

/**
 * Capitalize first letter of each word
 */
function titleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Determine if meal items suggest a specific dish type
 */
function detectDishType(foodItems: string[] | any[]): string | null {
  // Normalize food items to strings (handle both string[] and object[] formats)
  const normalizedItems = foodItems.map(item =>
    typeof item === 'string' ? item : item.name || String(item)
  )
  const itemsLower = normalizedItems.map(item => item.toLowerCase())

  for (const [dishType, keywords] of Object.entries(CONTEXT_WORDS)) {
    if (itemsLower.some(item => keywords.some(keyword => item.includes(keyword)))) {
      return dishType
    }
  }

  return null
}

/**
 * Extract main food items (prioritize proteins and unique items)
 */
function extractMainItems(foodItems: string[] | any[], maxItems: number = 2): string[] {
  if (foodItems.length === 0) return []

  // Normalize food items to strings (handle both string[] and object[] formats)
  const normalizedItems = foodItems.map(item =>
    typeof item === 'string' ? item : item.name || String(item)
  )
  const itemsLower = normalizedItems.map(item => item.toLowerCase())
  const mainItems: string[] = []

  // First, try to find a protein
  for (let i = 0; i < normalizedItems.length && mainItems.length < maxItems; i++) {
    const item = itemsLower[i]
    if (FOOD_CATEGORIES.proteins.some(protein => item.includes(protein))) {
      mainItems.push(normalizedItems[i])
    }
  }

  // Then add other items
  for (let i = 0; i < normalizedItems.length && mainItems.length < maxItems; i++) {
    if (!mainItems.includes(normalizedItems[i])) {
      mainItems.push(normalizedItems[i])
    }
  }

  return mainItems
}

/**
 * Generate a meal title from food items
 */
export function generateMealTitle(foodItems: string[] | any[], mealType?: string): string {
  if (!foodItems || foodItems.length === 0) {
    // Fallback to meal type if no food items
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return mealType ? `${titleCase(mealType)} at ${time}` : `Meal at ${time}`
  }

  // Get main items
  const mainItems = extractMainItems(foodItems, 2)

  // Detect dish type
  const dishType = detectDishType(foodItems)

  // Build title
  if (dishType && mainItems.length > 0) {
    // e.g., "Chicken Rice Bowl" or "Tuna Salad"
    const itemsPart = mainItems.map(item => titleCase(item)).join(' ')
    return `${itemsPart} ${titleCase(dishType)}`
  } else if (mainItems.length > 1) {
    // e.g., "Chicken and Broccoli" or "Pasta and Vegetables"
    return mainItems.map(item => titleCase(item)).join(' & ')
  } else if (mainItems.length === 1) {
    // e.g., "Grilled Chicken Plate"
    return `${titleCase(mainItems[0])} Plate`
  }

  // Fallback
  return `${titleCase(mealType || 'Meal')}`
}

/**
 * Extract search keywords from meal data
 */
export function generateSearchKeywords(
  foodItems: string[] | any[],
  title?: string,
  notes?: string
): string[] {
  const keywords = new Set<string>()

  // Add title words
  if (title) {
    title.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word)
    })
  }

  // Add food items (normalize to strings first)
  const normalizedItems = foodItems.map(item =>
    typeof item === 'string' ? item : item.name || String(item)
  )
  normalizedItems.forEach(item => {
    item.toLowerCase().split(/\s+/).forEach((word: string) => {
      if (word.length > 2) keywords.add(word)
    })
  })

  // Add notes words
  if (notes) {
    notes.toLowerCase().split(/\s+/).forEach((word: string) => {
      if (word.length > 3) keywords.add(word) // Longer words from notes
    })
  }

  return Array.from(keywords)
}

/**
 * Generate both title and keywords in one go
 */
export function generateMealMetadata(params: {
  foodItems: string[] | any[]
  mealType?: string
  notes?: string
  customTitle?: string
}): {
  title: string
  searchKeywords: string[]
} {
  const title = params.customTitle || generateMealTitle(params.foodItems, params.mealType)
  const searchKeywords = generateSearchKeywords(params.foodItems, title, params.notes)

  return { title, searchKeywords }
}
