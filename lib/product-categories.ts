/**
 * Product Category Management
 *
 * Provides category detection, expiration defaults, and smart suggestions
 * for grocery items based on barcode data from OpenFoodFacts
 */

import type { ProductCategory, CategoryMetadata, StorageLocation } from '@/types/shopping'

/**
 * Category metadata with smart defaults for expiration and storage
 */
export const CATEGORY_METADATA: Record<ProductCategory, CategoryMetadata> = {
  produce: {
    name: 'produce',
    displayName: 'Produce',
    icon: '🥬',
    isPerishable: true,
    defaultShelfLifeDays: 7,
    defaultLocation: 'fridge',
    expirationPriority: 'high'
  },
  meat: {
    name: 'meat',
    displayName: 'Meat',
    icon: '🥩',
    isPerishable: true,
    defaultShelfLifeDays: 3,
    defaultLocation: 'fridge',
    expirationPriority: 'high'
  },
  seafood: {
    name: 'seafood',
    displayName: 'Seafood',
    icon: '🐟',
    isPerishable: true,
    defaultShelfLifeDays: 2,
    defaultLocation: 'fridge',
    expirationPriority: 'high'
  },
  dairy: {
    name: 'dairy',
    displayName: 'Dairy',
    icon: '🥛',
    isPerishable: true,
    defaultShelfLifeDays: 7,
    defaultLocation: 'fridge',
    expirationPriority: 'high'
  },
  eggs: {
    name: 'eggs',
    displayName: 'Eggs',
    icon: '🥚',
    isPerishable: true,
    defaultShelfLifeDays: 21,
    defaultLocation: 'fridge',
    expirationPriority: 'medium'
  },
  bakery: {
    name: 'bakery',
    displayName: 'Bakery',
    icon: '🍞',
    isPerishable: true,
    defaultShelfLifeDays: 5,
    defaultLocation: 'counter',
    expirationPriority: 'medium'
  },
  deli: {
    name: 'deli',
    displayName: 'Deli',
    icon: '🥓',
    isPerishable: true,
    defaultShelfLifeDays: 5,
    defaultLocation: 'fridge',
    expirationPriority: 'high'
  },
  herbs: {
    name: 'herbs',
    displayName: 'Fresh Herbs',
    icon: '🌿',
    isPerishable: true,
    defaultShelfLifeDays: 7,
    defaultLocation: 'fridge',
    expirationPriority: 'medium'
  },
  spices: {
    name: 'spices',
    displayName: 'Spices & Seasonings',
    icon: '🧂',
    isPerishable: false,
    // Dried spices keep 2-4 years; using ~3 years (1095 days) as the
    // expiration default. Most users never deplete a spice via use —
    // it goes stale long before it runs out.
    defaultShelfLifeDays: 1095,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  },
  frozen: {
    name: 'frozen',
    displayName: 'Frozen',
    icon: '🧊',
    isPerishable: true,
    defaultShelfLifeDays: 180,
    defaultLocation: 'freezer',
    expirationPriority: 'low'
  },
  beverages: {
    name: 'beverages',
    displayName: 'Beverages',
    icon: '🥤',
    isPerishable: false,
    defaultShelfLifeDays: 90,
    defaultLocation: 'fridge',
    expirationPriority: 'low'
  },
  pantry: {
    name: 'pantry',
    displayName: 'Pantry',
    icon: '🥫',
    isPerishable: false,
    defaultShelfLifeDays: 365,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  },
  condiments: {
    name: 'condiments',
    displayName: 'Condiments',
    icon: '🧂',
    isPerishable: false,
    defaultShelfLifeDays: 180,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  },
  baby: {
    name: 'baby',
    displayName: 'Baby',
    icon: '👶',
    isPerishable: false,
    defaultShelfLifeDays: 365,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  },
  'pet-food': {
    name: 'pet-food',
    displayName: 'Pet & Animal Food',
    icon: '🐾',
    isPerishable: false,
    defaultShelfLifeDays: 365,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  },
  'pet-supplies': {
    name: 'pet-supplies',
    displayName: 'Pet & Animal Supplies',
    icon: '🦴',
    isPerishable: false,
    defaultShelfLifeDays: 730,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  },
  other: {
    name: 'other',
    displayName: 'Other',
    icon: '📦',
    isPerishable: false,
    defaultShelfLifeDays: 180,
    defaultLocation: 'pantry',
    expirationPriority: 'low'
  }
}

/**
 * Category detection keywords (from OpenFoodFacts categories).
 *
 * Declaration order is significant: detectCategory() returns on first
 * keyword hit. pet-food and pet-supplies are declared first so phrases
 * like "chicken & rice dog food" or "salmon kitten food" route to pet,
 * not meat/seafood. Keywords are kept conservative — disambiguated
 * phrases ("dog food" not "food") and brand+line tokens ("purina pro
 * plan" not "purina") to avoid false positives on human groceries.
 */
const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  'pet-food': [
    // disambiguated phrases
    'pet food', 'cat food', 'dog food', 'puppy food', 'kitten food',
    'dog treat', 'cat treat', 'pet treat', 'dog chew', 'cat chew',
    'wet cat', 'wet dog', 'dry cat', 'dry dog', 'kibble',
    'fish food', 'bird seed', 'bird food', 'rabbit food', 'guinea pig food',
    'hamster food', 'ferret food', 'reptile food', 'turtle food',
    'horse feed', 'cattle feed', 'goat feed', 'sheep feed', 'pig feed',
    'chicken feed', 'layer pellets', 'scratch grains', 'flock raiser',
    'timothy hay', 'alfalfa hay', 'orchard hay',
    'pet supplement', 'animal supplement', 'pet vitamin',
    // brand + product line (unambiguous)
    'purina pro plan', 'purina one', 'beneful', 'fancy feast', 'friskies',
    'meow mix', 'whiskas', 'iams', 'pedigree', 'blue buffalo wilderness',
    'blue buffalo life protection', 'hill\'s science diet', 'royal canin',
    'wellness core', 'taste of the wild', 'merrick backcountry', 'nutro ultra',
    'oxbow essentials', 'kaytee forti-diet', 'mazuri', 'tetra fish',
    'wardley', 'zoo med', 'repashy', 'triple crown senior', 'nutrena safechoice',
    'manna pro', 'layena'
  ],
  'pet-supplies': [
    'cat litter', 'litter box', 'scratching post', 'cat tree', 'cat tower',
    'dog leash', 'dog collar', 'dog harness', 'pet harness', 'pet collar',
    'dog crate', 'pet carrier', 'dog bed', 'cat bed', 'pet bed',
    'aquarium', 'fish tank', 'terrarium', 'reptile cage', 'bird cage',
    'hamster cage', 'rabbit hutch', 'chicken coop',
    'aquarium filter', 'aquarium gravel', 'aquarium plant',
    'reptile substrate', 'reptile heat', 'uvb bulb', 'heat lamp',
    'puppy pad', 'pee pad', 'training pad', 'poop bag', 'waste bag',
    'flea collar', 'tick collar', 'flea treatment', 'flea & tick',
    'frontline plus', 'k9 advantix', 'seresto collar', 'nexgard', 'simparica',
    'heartgard', 'capstar', 'dewormer',
    'pet shampoo', 'dog shampoo', 'cat shampoo', 'pet brush', 'grooming wipe',
    'kong toy', 'nylabone', 'chew toy', 'cat toy', 'dog toy', 'bird toy',
    'tidy cats', 'fresh step', 'world\'s best cat litter', 'yesterday\'s news litter',
    'fluval', 'marina aquarium', 'aqueon', 'penn-plax', 'exo terra',
    'petsafe', 'petmate'
  ],
  produce: [
    'fruit', 'vegetable', 'produce', 'salad', 'lettuce', 'tomato', 'apple', 'banana',
    'orange', 'carrot', 'broccoli', 'spinach', 'berry', 'melon', 'potato'
  ],
  meat: [
    'meat', 'beef', 'chicken', 'pork', 'turkey', 'lamb', 'veal', 'steak', 'ground',
    'sausage', 'bacon', 'ham', 'poultry'
  ],
  seafood: [
    'fish', 'seafood', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'cod', 'tilapia',
    'shellfish'
  ],
  dairy: [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy', 'cheddar', 'mozzarella',
    'parmesan', 'sour cream', 'cottage cheese', 'ice cream'
  ],
  eggs: ['egg', 'eggs'],
  bakery: [
    'bread', 'bagel', 'roll', 'bun', 'pastry', 'croissant', 'muffin', 'bakery', 'baked goods'
  ],
  deli: [
    'deli', 'cold cut', 'lunch meat', 'sliced', 'prepared', 'sandwich meat', 'salami',
    'pepperoni', 'bologna'
  ],
  herbs: [
    'herb', 'basil', 'cilantro', 'parsley', 'mint', 'rosemary', 'thyme', 'oregano', 'sage'
  ],
  spices: [
    // Common dried spices and seasoning blends. Keep narrow — single-word
    // common spice names + multi-word brand-agnostic phrases so we don't
    // catch "salt-free" pasta sauce or "peppermint tea".
    'spice', 'seasoning', 'salt', 'pepper', 'peppercorn', 'paprika',
    'cumin', 'coriander', 'turmeric', 'ginger powder', 'garlic powder',
    'onion powder', 'cinnamon', 'nutmeg', 'allspice', 'cardamom', 'clove',
    'bay leaf', 'cayenne', 'chili powder', 'curry powder', 'curry paste',
    'italian seasoning', 'taco seasoning', 'cajun seasoning',
    'old bay', 'lemon pepper', 'garam masala', 'five spice',
    'msg', 'monosodium glutamate', 'sea salt', 'kosher salt', 'pink salt',
    'rock salt', 'iodized salt', 'fennel seed', 'caraway seed',
    'mustard seed', 'sesame seed', 'poppy seed', 'celery seed', 'dill seed',
    'star anise', 'vanilla bean', 'vanilla extract', 'almond extract',
    'lemon extract', 'food coloring'
  ],
  frozen: [
    'frozen', 'freeze', 'ice'
  ],
  beverages: [
    'juice', 'soda', 'water', 'drink', 'beverage', 'tea', 'coffee', 'milk', 'smoothie'
  ],
  pantry: [
    'canned', 'pasta', 'rice', 'cereal', 'snack', 'chip', 'cookie', 'cracker',
    'oil', 'vinegar', 'spice', 'flour', 'sugar', 'salt'
  ],
  condiments: [
    'ketchup', 'mustard', 'mayonnaise', 'mayo', 'sauce', 'salsa', 'relish',
    'pickle', 'hot sauce', 'bbq', 'barbecue', 'dressing', 'vinaigrette',
    'soy sauce', 'worcestershire', 'sriracha', 'aioli', 'pesto', 'hummus',
    'condiment', 'chutney', 'jam', 'jelly', 'honey', 'syrup'
  ],
  baby: [
    'diaper', 'wipe', 'formula', 'baby', 'infant', 'newborn', 'onesie',
    'pacifier', 'bottle', 'nipple', 'swaddle', 'bib', 'burp cloth',
    'nursery', 'crib', 'bassinet', 'stroller', 'car seat'
  ],
  other: []
}

/**
 * Detect product category from OpenFoodFacts data
 */
export function detectCategory(productData: {
  product_name?: string
  categories?: string
  brands?: string
}): ProductCategory {
  const searchText = [
    productData.product_name || '',
    productData.categories || '',
    productData.brands || ''
  ].join(' ').toLowerCase()

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return category as ProductCategory
      }
    }
  }

  return 'other'
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(category: ProductCategory): CategoryMetadata {
  // Legacy / unrecognized categories (Firestore rows predating an enum value,
  // or a bad import) would otherwise return undefined and crash callers that
  // read .icon / .defaultShelfLifeDays — taking down the whole inventory list.
  // Fall back to 'other' so a stray category value can never crash the page.
  return CATEGORY_METADATA[category] ?? CATEGORY_METADATA.other
}

/**
 * Calculate default expiration date based on category
 */
export function calculateDefaultExpiration(
  category: ProductCategory,
  purchaseDate: Date = new Date()
): Date {
  const metadata = getCategoryMetadata(category)
  const expirationDate = new Date(purchaseDate)
  expirationDate.setDate(expirationDate.getDate() + metadata.defaultShelfLifeDays)
  return expirationDate
}

/**
 * Get storage location suggestion based on category
 */
export function suggestStorageLocation(category: ProductCategory): StorageLocation {
  return CATEGORY_METADATA[category].defaultLocation
}

/**
 * Suggest default unit based on product category
 */
export function suggestDefaultUnit(category: ProductCategory): import('@/types/shopping').QuantityUnit {
  switch (category) {
    case 'produce':
      return 'lbs' // Fruits and vegetables typically sold by weight
    case 'meat':
    case 'seafood':
    case 'deli':
      return 'lbs' // Meats sold by weight
    case 'dairy':
      return 'count' // Milk cartons, cheese packages, etc.
    case 'eggs':
      return 'count' // Dozen eggs
    case 'bakery':
      return 'count' // Loaves, bagels, etc.
    case 'herbs':
      return 'bunch' // Fresh herbs by bunch
    case 'pantry':
    case 'frozen':
      return 'package' // Packaged goods
    case 'beverages':
      return 'bottle' // Bottles/cans
    case 'condiments':
      return 'bottle' // Bottles/jars of condiments
    default:
      return 'count' // Default to count
  }
}

/**
 * Format quantity with unit for display
 */
export function formatQuantityDisplay(quantity: number, unit?: import('@/types/shopping').QuantityUnit): string {
  if (!unit || unit === 'count') {
    return quantity === 1 ? '1 item' : `${quantity} items`
  }

  // Retail-standard "each" — abbreviated to "ea" in display.
  if (unit === 'each') {
    return `${quantity} ea`
  }

  // Handle pluralization for count-based units
  const countUnits = ['bunch', 'head', 'bag', 'package', 'can', 'bottle', 'container']
  if (countUnits.includes(unit) && quantity !== 1) {
    const plural = unit === 'bunch' ? 'bunches' : `${unit}s`
    return `${quantity} ${plural}`
  }

  return `${quantity} ${unit}`
}

/**
 * Determine if a product is perishable
 */
export function isPerishable(category: ProductCategory): boolean {
  return CATEGORY_METADATA[category].isPerishable
}

/**
 * Get quick expiration options for UI
 */
export function getQuickExpirationOptions(category: ProductCategory): { label: string; days: number }[] {
  const metadata = CATEGORY_METADATA[category]

  if (!metadata.isPerishable) {
    return [
      { label: '1 month', days: 30 },
      { label: '3 months', days: 90 },
      { label: '6 months', days: 180 },
      { label: '1 year', days: 365 }
    ]
  }

  switch (category) {
    case 'meat':
    case 'seafood':
      return [
        { label: '1 day', days: 1 },
        { label: '2 days', days: 2 },
        { label: '3 days', days: 3 },
        { label: '5 days', days: 5 }
      ]

    case 'dairy':
    case 'deli':
    case 'bakery':
      return [
        { label: '3 days', days: 3 },
        { label: '5 days', days: 5 },
        { label: '7 days', days: 7 },
        { label: '2 weeks', days: 14 }
      ]

    case 'produce':
    case 'herbs':
      return [
        { label: '3 days', days: 3 },
        { label: '5 days', days: 5 },
        { label: '1 week', days: 7 },
        { label: '10 days', days: 10 }
      ]

    case 'eggs':
      return [
        { label: '1 week', days: 7 },
        { label: '2 weeks', days: 14 },
        { label: '3 weeks', days: 21 },
        { label: '1 month', days: 30 }
      ]

    case 'frozen':
      return [
        { label: '1 month', days: 30 },
        { label: '3 months', days: 90 },
        { label: '6 months', days: 180 },
        { label: '1 year', days: 365 }
      ]

    default:
      return [
        { label: '3 days', days: 3 },
        { label: '1 week', days: 7 },
        { label: '2 weeks', days: 14 },
        { label: '1 month', days: 30 }
      ]
  }
}

/**
 * Get all categories sorted by common usage
 */
export function getAllCategories(): CategoryMetadata[] {
  const order: ProductCategory[] = [
    'produce',
    'meat',
    'seafood',
    'dairy',
    'eggs',
    'bakery',
    'deli',
    'herbs',
    'frozen',
    'beverages',
    'pantry',
    'condiments',
    'baby',
    'pet-food',
    'pet-supplies',
    'other'
  ]

  return order.map(cat => CATEGORY_METADATA[cat])
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(date: Date): string {
  // Guard against NaN-valued Date objects. A bad expiresAt source
  // (empty string, "null", malformed timestamp) can survive the hook's
  // conversion if its sanitization slips, and date.toLocaleDateString
  // returns the literal string "Invalid Date" — which we don't want
  // showing up as a badge.
  if (!(date instanceof Date) || isNaN(date.getTime())) return ''

  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
  } else if (diffDays === 0) {
    return 'Expires today'
  } else if (diffDays === 1) {
    return 'Expires tomorrow'
  } else if (diffDays <= 7) {
    return `Expires in ${diffDays} days`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}
