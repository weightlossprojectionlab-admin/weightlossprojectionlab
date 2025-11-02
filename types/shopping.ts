/**
 * Shopping and Inventory Management Types
 *
 * Supports:
 * - Kitchen inventory tracking with expiration dates
 * - Smart shopping list with barcode scanning
 * - Store location detection and reminders
 */

export type ProductCategory =
  | 'produce'
  | 'meat'
  | 'dairy'
  | 'bakery'
  | 'deli'
  | 'eggs'
  | 'herbs'
  | 'seafood'
  | 'frozen'
  | 'pantry'
  | 'beverages'
  | 'other'

export type StorageLocation =
  | 'fridge'
  | 'freezer'
  | 'pantry'
  | 'counter'

export type ScanContext =
  | 'meal'        // Logging a meal
  | 'purchase'    // Just bought this item
  | 'consume'     // Used up / threw away
  | 'inventory'   // Checking what's in stock

export type QuantityUnit =
  // Weight
  | 'lbs'          // Pounds
  | 'oz'           // Ounces
  | 'g'            // Grams
  | 'kg'           // Kilograms
  // Volume
  | 'cup'          // Cups
  | 'tbsp'         // Tablespoons
  | 'tsp'          // Teaspoons
  | 'ml'           // Milliliters
  | 'l'            // Liters
  | 'fl oz'        // Fluid ounces
  | 'gal'          // Gallons
  | 'qt'           // Quarts
  | 'pt'           // Pints
  // Count
  | 'count'        // Individual items (e.g., "3 apples")
  | 'bunch'        // Bunch (e.g., bananas, herbs)
  | 'head'         // Head (e.g., lettuce)
  | 'bag'          // Bag
  | 'package'      // Package/Box
  | 'can'          // Can
  | 'bottle'       // Bottle
  | 'container'    // Container

export interface PurchaseHistoryEntry {
  date: Date
  expiresAt?: Date
  store?: string
  price?: number
}

export interface ShoppingItem {
  id: string
  userId: string

  // Product Info (from OpenFoodFacts or manual entry)
  barcode?: string // Optional: undefined for manual entries from recipes
  productName: string
  brand: string
  imageUrl: string
  category: ProductCategory

  // Manual Entry Support (for recipe ingredients)
  isManual: boolean // True if added from recipe without barcode
  manualIngredientName?: string // Original ingredient text from recipe (e.g., "2 cups milk")
  recipeId?: string // Link back to recipe if added from recipe

  // Inventory Tracking
  inStock: boolean
  quantity: number
  unit?: QuantityUnit // Unit of measurement (e.g., 'lbs', 'count', 'bunch')
  displayQuantity?: string // Formatted display string (e.g., "2.5 lbs", "3 apples")
  location: StorageLocation

  // Expiration Management
  expiresAt?: Date
  isPerishable: boolean
  typicalShelfLife?: number // days (learned from user purchase patterns)

  // Shopping List
  needed: boolean
  priority: 'low' | 'medium' | 'high' // Based on expiration or usage frequency
  lastPurchased?: Date
  preferredStore?: string

  // History & Learning
  purchaseHistory: PurchaseHistoryEntry[]
  averageDaysBetweenPurchases?: number // Learned pattern

  // Metadata
  createdAt: Date
  updatedAt: Date
  notes?: string
}

export interface StoreVisit {
  id: string
  userId: string
  storeName: string
  storeChain?: string // "Walmart", "Kroger", etc.
  location: {
    latitude: number
    longitude: number
  }
  visitedAt: Date
  itemsScanned: string[] // Array of barcodes
  itemsPurchased?: number
  estimatedTotal?: number
}

export interface ExpirationAlert {
  itemId: string
  productName: string
  expiresAt: Date
  daysUntilExpiration: number
  severity: 'info' | 'warning' | 'critical' | 'expired'
  imageUrl?: string
}

export interface ShoppingListSummary {
  totalItems: number
  neededItems: number
  highPriorityItems: number
  expiringItems: number
  lastUpdated: Date
}

export interface InventorySummary {
  totalItems: number
  inStockItems: number
  expiringWithin3Days: number
  expiringWithin7Days: number
  expiredItems: number
  byLocation: {
    fridge: number
    freezer: number
    pantry: number
    counter: number
  }
}

/**
 * Category metadata for smart defaults
 */
export interface CategoryMetadata {
  name: ProductCategory
  displayName: string
  icon: string
  isPerishable: boolean
  defaultShelfLifeDays: number
  defaultLocation: StorageLocation
  expirationPriority: 'high' | 'medium' | 'low'
}

/**
 * Store location data
 */
export interface StoreLocation {
  name: string
  chain?: string
  address?: string
  latitude: number
  longitude: number
  distanceMeters?: number
}

/**
 * Geofence configuration
 */
export interface GeofenceConfig {
  enabled: boolean
  radiusMeters: number
  notificationsEnabled: boolean
  autoShowList: boolean
}
