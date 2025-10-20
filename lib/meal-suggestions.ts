/**
 * Meal Suggestions Database & Engine
 *
 * Provides personalized meal suggestions based on:
 * - Meal type (breakfast/lunch/dinner/snack)
 * - Calorie budget (remaining calories for the day)
 * - Dietary preferences (vegan, vegetarian, keto, paleo, etc)
 * - Allergies (dairy, gluten, nuts, shellfish, etc)
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type DietaryTag = 'vegan' | 'vegetarian' | 'keto' | 'paleo' | 'gluten-free' | 'dairy-free' | 'high-protein' | 'low-carb' | 'pescatarian'
export type AllergyTag = 'dairy' | 'gluten' | 'nuts' | 'shellfish' | 'soy' | 'eggs' | 'fish'

export interface MealSuggestion {
  id: string
  name: string
  mealType: MealType
  calories: number
  macros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  ingredients: string[]
  prepTime: number // minutes
  dietaryTags: DietaryTag[]
  allergens: AllergyTag[]
  description: string
  safetyWarnings?: string[] // Warnings when user hasn't provided safety info
}

// Meal Suggestions Database
export const MEAL_SUGGESTIONS: MealSuggestion[] = [
  // BREAKFAST
  {
    id: 'bf001',
    name: 'Greek Yogurt Parfait',
    mealType: 'breakfast',
    calories: 280,
    macros: { protein: 20, carbs: 35, fat: 6, fiber: 4 },
    ingredients: ['Greek yogurt', 'mixed berries', 'granola', 'honey'],
    prepTime: 5,
    dietaryTags: ['vegetarian', 'high-protein', 'gluten-free'],
    allergens: ['dairy'],
    description: 'Creamy Greek yogurt layered with fresh berries and crunchy granola'
  },
  {
    id: 'bf002',
    name: 'Avocado Toast with Eggs',
    mealType: 'breakfast',
    calories: 380,
    macros: { protein: 16, carbs: 32, fat: 22, fiber: 8 },
    ingredients: ['whole wheat bread', 'avocado', '2 eggs', 'cherry tomatoes'],
    prepTime: 10,
    dietaryTags: ['vegetarian', 'high-protein'],
    allergens: ['gluten', 'eggs'],
    description: 'Mashed avocado on toast topped with poached eggs'
  },
  {
    id: 'bf003',
    name: 'Protein Smoothie Bowl',
    mealType: 'breakfast',
    calories: 320,
    macros: { protein: 25, carbs: 38, fat: 8, fiber: 6 },
    ingredients: ['protein powder', 'banana', 'spinach', 'almond milk', 'chia seeds'],
    prepTime: 5,
    dietaryTags: ['vegetarian', 'high-protein', 'gluten-free', 'dairy-free'],
    allergens: ['nuts'],
    description: 'Thick smoothie bowl topped with fresh fruit and seeds'
  },
  {
    id: 'bf004',
    name: 'Oatmeal with Berries',
    mealType: 'breakfast',
    calories: 250,
    macros: { protein: 10, carbs: 45, fat: 5, fiber: 7 },
    ingredients: ['rolled oats', 'blueberries', 'almond butter', 'cinnamon'],
    prepTime: 10,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
    allergens: ['nuts'],
    description: 'Warm oatmeal with fresh berries and a drizzle of almond butter'
  },
  {
    id: 'bf005',
    name: 'Veggie Omelet',
    mealType: 'breakfast',
    calories: 290,
    macros: { protein: 22, carbs: 12, fat: 18, fiber: 3 },
    ingredients: ['3 eggs', 'spinach', 'mushrooms', 'bell peppers', 'cheese'],
    prepTime: 12,
    dietaryTags: ['vegetarian', 'high-protein', 'low-carb', 'keto', 'gluten-free'],
    allergens: ['eggs', 'dairy'],
    description: 'Fluffy omelet packed with fresh vegetables and cheese'
  },
  {
    id: 'bf006',
    name: 'Breakfast Burrito',
    mealType: 'breakfast',
    calories: 420,
    macros: { protein: 24, carbs: 42, fat: 16, fiber: 6 },
    ingredients: ['whole wheat tortilla', 'scrambled eggs', 'black beans', 'salsa', 'avocado'],
    prepTime: 15,
    dietaryTags: ['vegetarian', 'high-protein'],
    allergens: ['gluten', 'eggs'],
    description: 'Hearty burrito with eggs, beans, and fresh toppings'
  },

  // LUNCH
  {
    id: 'ln001',
    name: 'Grilled Chicken Salad',
    mealType: 'lunch',
    calories: 450,
    macros: { protein: 35, carbs: 28, fat: 20, fiber: 6 },
    ingredients: ['grilled chicken breast', 'mixed greens', 'cherry tomatoes', 'cucumbers', 'olive oil vinaigrette'],
    prepTime: 15,
    dietaryTags: ['high-protein', 'gluten-free', 'dairy-free', 'paleo'],
    allergens: [],
    description: 'Fresh mixed greens topped with tender grilled chicken'
  },
  {
    id: 'ln002',
    name: 'Turkey & Avocado Wrap',
    mealType: 'lunch',
    calories: 520,
    macros: { protein: 28, carbs: 48, fat: 22, fiber: 8 },
    ingredients: ['whole wheat wrap', 'turkey breast', 'avocado', 'lettuce', 'tomato', 'mustard'],
    prepTime: 10,
    dietaryTags: ['high-protein', 'dairy-free'],
    allergens: ['gluten'],
    description: 'Lean turkey with creamy avocado wrapped in whole wheat'
  },
  {
    id: 'ln003',
    name: 'Quinoa Buddha Bowl',
    mealType: 'lunch',
    calories: 480,
    macros: { protein: 18, carbs: 62, fat: 18, fiber: 10 },
    ingredients: ['quinoa', 'roasted chickpeas', 'kale', 'sweet potato', 'tahini dressing'],
    prepTime: 20,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein'],
    allergens: [],
    description: 'Nutrient-packed bowl with quinoa, roasted veggies, and protein'
  },
  {
    id: 'ln004',
    name: 'Salmon & Rice Bowl',
    mealType: 'lunch',
    calories: 510,
    macros: { protein: 32, carbs: 52, fat: 18, fiber: 4 },
    ingredients: ['grilled salmon', 'brown rice', 'edamame', 'carrots', 'soy-ginger dressing'],
    prepTime: 18,
    dietaryTags: ['high-protein', 'pescatarian', 'dairy-free'],
    allergens: ['soy', 'fish'],
    description: 'Grilled salmon over brown rice with Asian-inspired toppings'
  },
  {
    id: 'ln005',
    name: 'Caprese Sandwich',
    mealType: 'lunch',
    calories: 420,
    macros: { protein: 18, carbs: 48, fat: 18, fiber: 6 },
    ingredients: ['ciabatta bread', 'fresh mozzarella', 'tomatoes', 'basil', 'balsamic glaze'],
    prepTime: 8,
    dietaryTags: ['vegetarian'],
    allergens: ['gluten', 'dairy'],
    description: 'Classic Italian sandwich with fresh ingredients'
  },
  {
    id: 'ln006',
    name: 'Chicken Burrito Bowl',
    mealType: 'lunch',
    calories: 540,
    macros: { protein: 38, carbs: 58, fat: 16, fiber: 12 },
    ingredients: ['grilled chicken', 'brown rice', 'black beans', 'corn', 'salsa', 'guacamole'],
    prepTime: 15,
    dietaryTags: ['high-protein', 'gluten-free', 'dairy-free'],
    allergens: [],
    description: 'Mexican-inspired bowl with chicken, rice, and fresh toppings'
  },
  {
    id: 'ln007',
    name: 'Tuna Salad Wrap',
    mealType: 'lunch',
    calories: 380,
    macros: { protein: 26, carbs: 42, fat: 12, fiber: 6 },
    ingredients: ['canned tuna', 'whole wheat wrap', 'Greek yogurt', 'celery', 'lettuce'],
    prepTime: 10,
    dietaryTags: ['high-protein', 'pescatarian'],
    allergens: ['gluten', 'dairy', 'fish'],
    description: 'Light tuna salad wrapped with fresh vegetables'
  },

  // DINNER
  {
    id: 'dn001',
    name: 'Baked Salmon & Vegetables',
    mealType: 'dinner',
    calories: 520,
    macros: { protein: 38, carbs: 32, fat: 24, fiber: 8 },
    ingredients: ['salmon fillet', 'broccoli', 'asparagus', 'lemon', 'olive oil'],
    prepTime: 25,
    dietaryTags: ['high-protein', 'pescatarian', 'gluten-free', 'dairy-free', 'paleo', 'keto'],
    allergens: ['fish'],
    description: 'Oven-baked salmon with roasted vegetables'
  },
  {
    id: 'dn002',
    name: 'Grilled Chicken & Sweet Potato',
    mealType: 'dinner',
    calories: 485,
    macros: { protein: 40, carbs: 48, fat: 12, fiber: 7 },
    ingredients: ['chicken breast', 'roasted sweet potato', 'green beans', 'herbs'],
    prepTime: 30,
    dietaryTags: ['high-protein', 'gluten-free', 'dairy-free', 'paleo'],
    allergens: [],
    description: 'Lean grilled chicken with roasted sweet potato and veggies'
  },
  {
    id: 'dn003',
    name: 'Vegetarian Stir-Fry',
    mealType: 'dinner',
    calories: 420,
    macros: { protein: 16, carbs: 58, fat: 14, fiber: 10 },
    ingredients: ['tofu', 'bell peppers', 'snap peas', 'carrots', 'brown rice', 'teriyaki sauce'],
    prepTime: 20,
    dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
    allergens: ['soy'],
    description: 'Colorful vegetable stir-fry with crispy tofu'
  },
  {
    id: 'dn004',
    name: 'Turkey Meatballs & Zoodles',
    mealType: 'dinner',
    calories: 390,
    macros: { protein: 36, carbs: 22, fat: 18, fiber: 6 },
    ingredients: ['ground turkey', 'zucchini noodles', 'marinara sauce', 'parmesan'],
    prepTime: 25,
    dietaryTags: ['high-protein', 'low-carb', 'gluten-free'],
    allergens: ['dairy'],
    description: 'Lean turkey meatballs over spiralized zucchini'
  },
  {
    id: 'dn005',
    name: 'Shrimp Tacos',
    mealType: 'dinner',
    calories: 460,
    macros: { protein: 32, carbs: 52, fat: 14, fiber: 8 },
    ingredients: ['shrimp', 'corn tortillas', 'cabbage slaw', 'avocado', 'lime'],
    prepTime: 20,
    dietaryTags: ['high-protein', 'pescatarian', 'dairy-free'],
    allergens: ['shellfish'],
    description: 'Spicy grilled shrimp tacos with fresh slaw'
  },
  {
    id: 'dn006',
    name: 'Beef & Veggie Stir-Fry',
    mealType: 'dinner',
    calories: 540,
    macros: { protein: 38, carbs: 48, fat: 22, fiber: 6 },
    ingredients: ['lean beef', 'broccoli', 'bell peppers', 'jasmine rice', 'soy sauce'],
    prepTime: 22,
    dietaryTags: ['high-protein', 'dairy-free'],
    allergens: ['soy'],
    description: 'Tender beef with crisp vegetables over rice'
  },
  {
    id: 'dn007',
    name: 'Lentil Curry',
    mealType: 'dinner',
    calories: 430,
    macros: { protein: 18, carbs: 68, fat: 10, fiber: 14 },
    ingredients: ['red lentils', 'coconut milk', 'tomatoes', 'curry spices', 'basmati rice'],
    prepTime: 35,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
    allergens: [],
    description: 'Hearty lentil curry with aromatic spices'
  },

  // SNACKS
  {
    id: 'sn001',
    name: 'Apple & Almond Butter',
    mealType: 'snack',
    calories: 220,
    macros: { protein: 6, carbs: 24, fat: 12, fiber: 5 },
    ingredients: ['apple', 'almond butter'],
    prepTime: 2,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'paleo'],
    allergens: ['nuts'],
    description: 'Crisp apple slices with creamy almond butter'
  },
  {
    id: 'sn002',
    name: 'Protein Shake',
    mealType: 'snack',
    calories: 180,
    macros: { protein: 25, carbs: 12, fat: 4, fiber: 2 },
    ingredients: ['protein powder', 'almond milk', 'banana'],
    prepTime: 3,
    dietaryTags: ['vegetarian', 'high-protein', 'gluten-free'],
    allergens: ['dairy', 'nuts'],
    description: 'Quick protein shake with banana'
  },
  {
    id: 'sn003',
    name: 'Hummus & Veggies',
    mealType: 'snack',
    calories: 160,
    macros: { protein: 6, carbs: 18, fat: 8, fiber: 6 },
    ingredients: ['hummus', 'carrots', 'bell peppers', 'cucumbers'],
    prepTime: 5,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
    allergens: [],
    description: 'Creamy hummus with fresh vegetable sticks'
  },
  {
    id: 'sn004',
    name: 'Greek Yogurt & Berries',
    mealType: 'snack',
    calories: 150,
    macros: { protein: 12, carbs: 20, fat: 3, fiber: 3 },
    ingredients: ['Greek yogurt', 'mixed berries'],
    prepTime: 2,
    dietaryTags: ['vegetarian', 'high-protein', 'gluten-free'],
    allergens: ['dairy'],
    description: 'Protein-rich yogurt with fresh berries'
  },
  {
    id: 'sn005',
    name: 'Trail Mix',
    mealType: 'snack',
    calories: 200,
    macros: { protein: 6, carbs: 22, fat: 10, fiber: 4 },
    ingredients: ['almonds', 'cashews', 'dried cranberries', 'dark chocolate chips'],
    prepTime: 1,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
    allergens: ['nuts'],
    description: 'Energy-boosting mix of nuts and dried fruit'
  },
  {
    id: 'sn006',
    name: 'Rice Cakes with Avocado',
    mealType: 'snack',
    calories: 190,
    macros: { protein: 4, carbs: 24, fat: 10, fiber: 6 },
    ingredients: ['rice cakes', 'avocado', 'sea salt', 'lemon juice'],
    prepTime: 3,
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
    allergens: [],
    description: 'Crunchy rice cakes topped with creamy avocado'
  },
  {
    id: 'sn007',
    name: 'Hard-Boiled Eggs',
    mealType: 'snack',
    calories: 140,
    macros: { protein: 12, carbs: 2, fat: 10, fiber: 0 },
    ingredients: ['2 eggs'],
    prepTime: 12,
    dietaryTags: ['vegetarian', 'high-protein', 'low-carb', 'keto', 'gluten-free', 'dairy-free', 'paleo'],
    allergens: ['eggs'],
    description: 'Simple protein-packed hard-boiled eggs'
  }
]

/**
 * Create a deterministic hash from a string (for seeded randomization)
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Shuffle array with deterministic seed (same seed = same shuffle)
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array]
  let currentIndex = shuffled.length

  // Simple seeded random number generator
  let random = seed
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280
    return random / 233280
  }

  while (currentIndex > 0) {
    const randomIndex = Math.floor(seededRandom() * currentIndex)
    currentIndex--

    // Swap
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]]
  }

  return shuffled
}

/**
 * Filter meal suggestions based on user preferences and constraints
 */
export interface SuggestionFilters {
  mealType: MealType
  calorieMin?: number
  calorieMax?: number
  dietaryPreferences?: string[] // From user profile
  allergies?: string[] // From user profile
  maxResults?: number
  userId?: string // For personalized shuffling
}

export function getMealSuggestions(filters: SuggestionFilters): MealSuggestion[] {
  let suggestions = MEAL_SUGGESTIONS.filter(meal => meal.mealType === filters.mealType)

  // Filter by calorie budget
  if (filters.calorieMin !== undefined) {
    suggestions = suggestions.filter(meal => meal.calories >= filters.calorieMin!)
  }
  if (filters.calorieMax !== undefined) {
    suggestions = suggestions.filter(meal => meal.calories <= filters.calorieMax!)
  }

  // Filter by dietary preferences
  if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) {
    suggestions = suggestions.filter(meal => {
      // Check if meal matches any of the user's dietary preferences
      return filters.dietaryPreferences!.some(pref =>
        meal.dietaryTags.includes(pref as DietaryTag)
      )
    })
  }

  // Filter out allergens
  if (filters.allergies && filters.allergies.length > 0) {
    suggestions = suggestions.filter(meal => {
      // Exclude meals that contain any of the user's allergens
      return !meal.allergens.some(allergen =>
        filters.allergies!.includes(allergen)
      )
    })
  }

  // CRITICAL SAFETY CHECK: If user hasn't provided ANY safety info,
  // add warnings to all suggestions so they can self-filter
  const hasAnySafetyInfo =
    (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) ||
    (filters.allergies && filters.allergies.length > 0)

  if (!hasAnySafetyInfo) {
    // Add safety warnings to ALL suggestions since we can't filter
    suggestions = suggestions.map(meal => ({
      ...meal,
      safetyWarnings: [
        'Allergens not filtered - check ingredients carefully',
        'Dietary preferences not applied'
      ]
    }))
  }

  // Sort by how well they match the calorie target
  if (filters.calorieMax !== undefined) {
    const targetCalories = ((filters.calorieMin || 0) + filters.calorieMax) / 2
    suggestions.sort((a, b) => {
      const diffA = Math.abs(a.calories - targetCalories)
      const diffB = Math.abs(b.calories - targetCalories)
      return diffA - diffB
    })
  }

  // Add personalized shuffling based on userId and date
  // This ensures different users see different suggestions even with same preferences
  if (filters.userId) {
    // Create seed from userId + current date (so suggestions change daily)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const seed = hashString(filters.userId + today + filters.mealType)

    // Shuffle the filtered suggestions
    suggestions = shuffleWithSeed(suggestions, seed)
  }

  // Limit results
  const maxResults = filters.maxResults || 3
  return suggestions.slice(0, maxResults)
}
