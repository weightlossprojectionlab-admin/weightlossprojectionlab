/**
 * Ingredient Substitutions Database
 *
 * Provides smart ingredient substitutions based on dietary preferences and allergies.
 */

import { DietaryTag, AllergyTag } from './meal-suggestions'

export interface Substitution {
  name: string
  ratio?: string // e.g., "1:1", "Use same amount"
  dietaryTags: DietaryTag[]
  allergens: AllergyTag[]
  notes?: string
}

export interface IngredientSubstitutions {
  ingredient: string
  keywords: string[] // For matching (e.g., ["milk", "dairy"])
  substitutes: Substitution[]
}

/**
 * Comprehensive ingredient substitutions database
 */
export const SUBSTITUTIONS_DATABASE: IngredientSubstitutions[] = [
  // DAIRY
  {
    ingredient: 'Milk',
    keywords: ['milk', 'whole milk', '2% milk', 'skim milk'],
    substitutes: [
      {
        name: 'Almond milk',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free', 'paleo'],
        allergens: ['nuts'],
        notes: 'Lower in protein'
      },
      {
        name: 'Oat milk',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: [],
        notes: 'Creamier texture'
      },
      {
        name: 'Soy milk',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free', 'high-protein'],
        allergens: ['soy'],
        notes: 'Similar protein content'
      },
      {
        name: 'Coconut milk',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free', 'paleo', 'keto'],
        allergens: [],
        notes: 'Higher in fat'
      }
    ]
  },
  {
    ingredient: 'Greek Yogurt',
    keywords: ['greek yogurt', 'yogurt', 'yoghurt'],
    substitutes: [
      {
        name: 'Coconut yogurt',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free', 'paleo'],
        allergens: [],
        notes: 'Lower in protein'
      },
      {
        name: 'Almond yogurt',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: ['nuts'],
        notes: 'Lower in protein'
      },
      {
        name: 'Sour cream',
        ratio: '1:1',
        dietaryTags: ['vegetarian', 'low-carb', 'keto'],
        allergens: ['dairy'],
        notes: 'Higher in fat'
      }
    ]
  },
  {
    ingredient: 'Cheese',
    keywords: ['cheese', 'cheddar', 'mozzarella', 'shredded cheese'],
    substitutes: [
      {
        name: 'Nutritional yeast',
        ratio: '1/4 cup per 1 cup cheese',
        dietaryTags: ['vegan', 'dairy-free', 'high-protein'],
        allergens: [],
        notes: 'Cheesy flavor, no melting'
      },
      {
        name: 'Cashew cheese',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: ['nuts'],
        notes: 'Creamy texture'
      },
      {
        name: 'Vegan cheese',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: [],
        notes: 'Similar melt and taste'
      }
    ]
  },
  {
    ingredient: 'Butter',
    keywords: ['butter', 'unsalted butter', 'salted butter'],
    substitutes: [
      {
        name: 'Coconut oil',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free', 'paleo', 'keto'],
        allergens: [],
        notes: 'Slight coconut flavor'
      },
      {
        name: 'Olive oil',
        ratio: '3/4 cup oil per 1 cup butter',
        dietaryTags: ['vegan', 'dairy-free', 'paleo', 'keto'],
        allergens: [],
        notes: 'Healthier fats'
      },
      {
        name: 'Avocado',
        ratio: '1:1',
        dietaryTags: ['vegan', 'dairy-free', 'paleo', 'keto'],
        allergens: [],
        notes: 'For baking'
      }
    ]
  },

  // PROTEIN
  {
    ingredient: 'Chicken',
    keywords: ['chicken', 'chicken breast', 'grilled chicken'],
    substitutes: [
      {
        name: 'Turkey',
        ratio: '1:1',
        dietaryTags: ['high-protein', 'paleo'],
        allergens: [],
        notes: 'Leaner option'
      },
      {
        name: 'Tofu',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: ['soy'],
        notes: 'Press and marinate well'
      },
      {
        name: 'Tempeh',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: ['soy'],
        notes: 'Firmer texture, nuttier flavor'
      },
      {
        name: 'Seitan',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: ['gluten'],
        notes: 'Chewy, meat-like texture'
      }
    ]
  },
  {
    ingredient: 'Eggs',
    keywords: ['egg', 'eggs', 'whole egg'],
    substitutes: [
      {
        name: 'Flax eggs',
        ratio: '1 tbsp flax + 3 tbsp water per egg',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: [],
        notes: 'For baking, let sit 5 min'
      },
      {
        name: 'Chia eggs',
        ratio: '1 tbsp chia + 3 tbsp water per egg',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: [],
        notes: 'For baking, let sit 5 min'
      },
      {
        name: 'Applesauce',
        ratio: '1/4 cup per egg',
        dietaryTags: ['vegan', 'dairy-free'],
        allergens: [],
        notes: 'For baking, adds moisture'
      },
      {
        name: 'Silken tofu',
        ratio: '1/4 cup per egg',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: ['soy'],
        notes: 'For baking, blend smooth'
      }
    ]
  },
  {
    ingredient: 'Beef',
    keywords: ['beef', 'ground beef', 'lean beef'],
    substitutes: [
      {
        name: 'Ground turkey',
        ratio: '1:1',
        dietaryTags: ['high-protein', 'paleo'],
        allergens: [],
        notes: 'Leaner alternative'
      },
      {
        name: 'Lentils',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: [],
        notes: 'Great for tacos, bolognese'
      },
      {
        name: 'Black beans',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: [],
        notes: 'For burgers, tacos'
      }
    ]
  },
  {
    ingredient: 'Salmon',
    keywords: ['salmon', 'salmon fillet', 'grilled salmon'],
    substitutes: [
      {
        name: 'Trout',
        ratio: '1:1',
        dietaryTags: ['pescatarian', 'high-protein', 'paleo'],
        allergens: ['fish'],
        notes: 'Similar omega-3 content'
      },
      {
        name: 'Tuna',
        ratio: '1:1',
        dietaryTags: ['pescatarian', 'high-protein', 'paleo'],
        allergens: ['fish'],
        notes: 'Leaner option'
      },
      {
        name: 'Tofu',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: ['soy'],
        notes: 'Marinate for flavor'
      }
    ]
  },

  // GRAINS & CARBS
  {
    ingredient: 'White Rice',
    keywords: ['rice', 'white rice', 'jasmine rice', 'basmati rice'],
    substitutes: [
      {
        name: 'Brown rice',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: [],
        notes: 'More fiber, nuttier flavor'
      },
      {
        name: 'Quinoa',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein', 'gluten-free'],
        allergens: [],
        notes: 'Higher in protein'
      },
      {
        name: 'Cauliflower rice',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto', 'paleo'],
        allergens: [],
        notes: 'Much lower in carbs and calories'
      }
    ]
  },
  {
    ingredient: 'Pasta',
    keywords: ['pasta', 'spaghetti', 'noodles'],
    substitutes: [
      {
        name: 'Zucchini noodles',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto', 'paleo'],
        allergens: [],
        notes: 'Much lower in carbs'
      },
      {
        name: 'Chickpea pasta',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein', 'gluten-free'],
        allergens: [],
        notes: 'Higher in protein'
      },
      {
        name: 'Rice noodles',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'gluten-free'],
        allergens: [],
        notes: 'Lighter texture'
      }
    ]
  },
  {
    ingredient: 'Bread',
    keywords: ['bread', 'whole wheat bread', 'white bread', 'slices'],
    substitutes: [
      {
        name: 'Gluten-free bread',
        ratio: '1:1',
        dietaryTags: ['gluten-free'],
        allergens: [],
        notes: 'Check ingredients for allergens'
      },
      {
        name: 'Lettuce wraps',
        ratio: '2 large leaves per slice',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto', 'paleo'],
        allergens: [],
        notes: 'Zero carbs, crunchy texture'
      },
      {
        name: 'Ezekiel bread',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: ['gluten'],
        notes: 'Sprouted grains, more nutritious'
      }
    ]
  },
  {
    ingredient: 'Oats',
    keywords: ['oats', 'rolled oats', 'oatmeal'],
    substitutes: [
      {
        name: 'Quinoa flakes',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'high-protein'],
        allergens: [],
        notes: 'Higher in protein'
      },
      {
        name: 'Chia seeds',
        ratio: '1/2 cup chia per 1 cup oats',
        dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'low-carb', 'keto'],
        allergens: [],
        notes: 'Make chia pudding instead'
      }
    ]
  },

  // SWEETENERS
  {
    ingredient: 'Sugar',
    keywords: ['sugar', 'white sugar', 'granulated sugar'],
    substitutes: [
      {
        name: 'Honey',
        ratio: '3/4 cup per 1 cup sugar',
        dietaryTags: ['vegetarian', 'paleo'],
        allergens: [],
        notes: 'Reduce liquid by 1/4 cup'
      },
      {
        name: 'Maple syrup',
        ratio: '3/4 cup per 1 cup sugar',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Reduce liquid by 3 tbsp'
      },
      {
        name: 'Stevia',
        ratio: '1 tsp per 1 cup sugar',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto'],
        allergens: [],
        notes: 'Zero calories, adjust to taste'
      },
      {
        name: 'Monk fruit sweetener',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto'],
        allergens: [],
        notes: 'Zero calories'
      }
    ]
  },
  {
    ingredient: 'Honey',
    keywords: ['honey'],
    substitutes: [
      {
        name: 'Maple syrup',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Similar consistency'
      },
      {
        name: 'Agave nectar',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: [],
        notes: 'Sweeter, use less'
      }
    ]
  },

  // NUTS & SEEDS
  {
    ingredient: 'Almond Butter',
    keywords: ['almond butter', 'almond'],
    substitutes: [
      {
        name: 'Peanut butter',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'high-protein'],
        allergens: ['nuts'],
        notes: 'Similar nutrition'
      },
      {
        name: 'Sunflower seed butter',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: [],
        notes: 'Nut-free alternative'
      },
      {
        name: 'Tahini',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Sesame-based, different flavor'
      }
    ]
  },
  {
    ingredient: 'Peanut Butter',
    keywords: ['peanut butter', 'peanut'],
    substitutes: [
      {
        name: 'Almond butter',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: ['nuts'],
        notes: 'Similar nutrition'
      },
      {
        name: 'Sunflower seed butter',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: [],
        notes: 'Nut-free alternative'
      },
      {
        name: 'Cashew butter',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: ['nuts'],
        notes: 'Creamier texture'
      }
    ]
  },
  {
    ingredient: 'Almonds',
    keywords: ['almonds', 'almond'],
    substitutes: [
      {
        name: 'Cashews',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: ['nuts'],
        notes: 'Similar nutrition'
      },
      {
        name: 'Walnuts',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: ['nuts'],
        notes: 'Higher in omega-3'
      },
      {
        name: 'Sunflower seeds',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: [],
        notes: 'Nut-free option'
      }
    ]
  },

  // VEGETABLES
  {
    ingredient: 'Spinach',
    keywords: ['spinach'],
    substitutes: [
      {
        name: 'Kale',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'More fiber, heartier'
      },
      {
        name: 'Swiss chard',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Similar nutrition'
      },
      {
        name: 'Arugula',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Peppery flavor'
      }
    ]
  },
  {
    ingredient: 'Sweet Potato',
    keywords: ['sweet potato', 'sweet potatoes'],
    substitutes: [
      {
        name: 'Regular potato',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Lower in beta-carotene'
      },
      {
        name: 'Butternut squash',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Similar sweetness'
      },
      {
        name: 'Cauliflower',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto', 'paleo'],
        allergens: [],
        notes: 'Much lower in carbs'
      }
    ]
  },

  // PROTEIN POWDER
  {
    ingredient: 'Protein Powder',
    keywords: ['protein powder', 'whey protein'],
    substitutes: [
      {
        name: 'Pea protein',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'high-protein'],
        allergens: [],
        notes: 'Plant-based alternative'
      },
      {
        name: 'Hemp protein',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
        allergens: [],
        notes: 'Contains omega-3s'
      },
      {
        name: 'Collagen protein',
        ratio: '1:1',
        dietaryTags: ['paleo'],
        allergens: [],
        notes: 'Good for skin, joints'
      }
    ]
  },

  // OILS & FATS
  {
    ingredient: 'Olive Oil',
    keywords: ['olive oil'],
    substitutes: [
      {
        name: 'Avocado oil',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo', 'keto'],
        allergens: [],
        notes: 'Higher smoke point'
      },
      {
        name: 'Coconut oil',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo', 'keto'],
        allergens: [],
        notes: 'Solid at room temp'
      },
      {
        name: 'Grapeseed oil',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian'],
        allergens: [],
        notes: 'Neutral flavor'
      }
    ]
  },

  // TORTILLAS & WRAPS
  {
    ingredient: 'Tortilla',
    keywords: ['tortilla', 'wrap', 'whole wheat tortilla'],
    substitutes: [
      {
        name: 'Corn tortilla',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'gluten-free'],
        allergens: [],
        notes: 'Smaller, different texture'
      },
      {
        name: 'Lettuce wrap',
        ratio: '2 large leaves per tortilla',
        dietaryTags: ['vegan', 'vegetarian', 'low-carb', 'keto', 'paleo'],
        allergens: [],
        notes: 'Very low carb'
      },
      {
        name: 'Coconut wrap',
        ratio: '1:1',
        dietaryTags: ['vegan', 'vegetarian', 'paleo'],
        allergens: [],
        notes: 'Grain-free option'
      }
    ]
  }
]

/**
 * Find substitutions for an ingredient string
 */
export function findSubstitutions(ingredientStr: string): IngredientSubstitutions | null {
  const lowerIngredient = ingredientStr.toLowerCase()

  // Find the first matching substitution set
  for (const subSet of SUBSTITUTIONS_DATABASE) {
    // Check if any keyword matches
    const hasMatch = subSet.keywords.some(keyword =>
      lowerIngredient.includes(keyword)
    )

    if (hasMatch) {
      return subSet
    }
  }

  return null
}

/**
 * Filter substitutions based on dietary preferences and allergies
 */
export function getCompatibleSubstitutions(
  substitutions: Substitution[],
  dietaryPreferences?: string[],
  allergies?: string[]
): Substitution[] {
  return substitutions.filter(sub => {
    // Exclude if contains user's allergens
    if (allergies && allergies.length > 0) {
      const hasAllergen = sub.allergens.some(allergen =>
        allergies.some(userAllergen =>
          userAllergen.toLowerCase().includes(allergen.toLowerCase())
        )
      )
      if (hasAllergen) return false
    }

    // No dietary preferences specified - show all
    if (!dietaryPreferences || dietaryPreferences.length === 0) {
      return true
    }

    // Include if matches any dietary preference
    const matchesPreference = sub.dietaryTags.some(tag =>
      dietaryPreferences.some(pref =>
        pref.toLowerCase() === tag.toLowerCase()
      )
    )

    return matchesPreference
  })
}

/**
 * Get substitution suggestions for an ingredient
 * Respects user's dietary preferences and allergies
 */
export function getSubstitutionSuggestions(
  ingredientStr: string,
  dietaryPreferences?: string[],
  allergies?: string[]
): Substitution[] {
  const subSet = findSubstitutions(ingredientStr)

  if (!subSet) {
    return []
  }

  const compatible = getCompatibleSubstitutions(
    subSet.substitutes,
    dietaryPreferences,
    allergies
  )

  // If compatible list is empty but user has preferences, return all
  // (better to show options than nothing)
  if (compatible.length === 0 && subSet.substitutes.length > 0) {
    return subSet.substitutes.slice(0, 3) // Limit to 3
  }

  return compatible.slice(0, 3) // Limit to 3 suggestions
}
