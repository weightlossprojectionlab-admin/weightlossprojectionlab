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
 * Category detection keywords (from OpenFoodFacts categories)
 */
const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
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
  frozen: [
    'frozen', 'freeze', 'ice'
  ],
  beverages: [
    'juice', 'soda', 'water', 'drink', 'beverage', 'tea', 'coffee', 'milk', 'smoothie'
  ],
  pantry: [
    'canned', 'pasta', 'rice', 'cereal', 'snack', 'chip', 'cookie', 'cracker', 'sauce',
    'condiment', 'oil', 'vinegar', 'spice', 'flour', 'sugar', 'salt'
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
  return CATEGORY_METADATA[category]
}

/**
 * Calculate default expiration date based on category
 */
export function calculateDefaultExpiration(
  category: ProductCategory,
  purchaseDate: Date = new Date()
): Date {
  const metadata = CATEGORY_METADATA[category]
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
    'other'
  ]

  return order.map(cat => CATEGORY_METADATA[cat])
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(date: Date): string {
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
