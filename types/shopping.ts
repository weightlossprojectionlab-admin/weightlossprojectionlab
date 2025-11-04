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
  | 'condiments'
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

export type ItemSource =
  | 'manual'        // Manually added by user
  | 'recipe'        // Added from recipe
  | 'mealplan'      // Added from meal plan
  | 'autosuggest'   // Auto-suggested based on patterns

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
  recipeIds?: string[] // Links to ALL recipes using this ingredient
  primaryRecipeId?: string // First recipe that added this ingredient (for UI display)

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
  storeId?: string // Reference to Store document
  source?: ItemSource // How this item was added
  missingFromInventory?: boolean // True if checked against inventory and not found

  // History & Learning
  purchaseHistory: PurchaseHistoryEntry[]
  averageDaysBetweenPurchases?: number // Learned pattern (in days)
  expectedPriceCents?: number // Expected price based on purchase history

  // Inventory-Specific Fields (when inStock=true)
  freezeDate?: Date // Date item was frozen
  purchasePriceCents?: number // Actual purchase price
  lowStockThreshold?: number // Trigger low-stock alert when quantity drops below this
  photoUrl?: string // Photo of product or expiration date

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

/**
 * Store - User's saved stores with preferences
 */
export interface Store {
  id: string
  userId: string
  name: string
  placeId?: string // Google Places ID for maps integration
  latitude?: number
  longitude?: number
  lastVisitedAt?: Date
  aisleOrder?: ProductCategory[] // Preferred aisle ordering for this store
  createdAt: Date
  updatedAt: Date
}

/**
 * PriceHistory - Track purchase prices over time
 */
export interface PriceHistory {
  id: string // Format: productKey_YYYYMMDD
  userId: string
  productKey: string // Barcode or normalized product name
  storeId?: string // Which store this price is from
  priceCents: number // Price in cents (avoid floating point issues)
  quantity: number
  unit?: QuantityUnit
  purchasedAt: Date
  createdAt: Date
}

/**
 * GlobalProduct - Aggregated product database shared across all users
 * Root collection: product_database
 * Document ID: barcode
 */
export interface GlobalProduct {
  // Primary Key
  barcode: string // Document ID

  // Product Info (from OpenFoodFacts or user verification)
  productName: string
  brand: string
  imageUrl?: string

  // Nutrition Data (verified aggregate from multiple sources)
  nutrition: {
    calories: number
    protein: number // grams
    carbs: number // grams
    fat: number // grams
    fiber: number // grams
    servingSize: string
  }

  // Category & Classification
  category: ProductCategory
  categories?: string[] // Multiple categories if applicable (e.g., ['dairy', 'beverages'])

  // Aggregated User Data
  stats: {
    totalScans: number // How many times this product was scanned
    uniqueUsers: number // How many different users scanned this
    totalPurchases: number // How many times this was marked as purchased
    firstSeenAt: Date | string // When first scanned by any user
    lastSeenAt: Date | string // Most recent scan
  }

  // Regional Insights (for locale-specific data)
  regional: {
    stores: string[] // Stores where this product was found
    regions: string[] // Regions/states where scanned (e.g., ['US-CA', 'US-TX'])
    avgPriceCents: number // Average price across all purchases
    priceMin: number // Lowest recorded price
    priceMax: number // Highest recorded price
    lastPriceUpdate: Date | string // When price was last recorded
  }

  // Recipe Integration
  usage: {
    linkedRecipes: number // Count of recipes that use this product
    popularityScore: number // Weighted score based on scans, purchases, recipes
  }

  // Data Quality & Verification
  quality: {
    verified: boolean // True if 3+ users confirmed nutrition data matches
    verificationCount: number // How many users verified this data
    lastVerified?: Date | string // When last verified
    dataSource: 'openfoodfacts' | 'usda' | 'user-verified' | 'aggregate'
    confidence: number // Confidence score 0-100
  }

  // Metadata
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * ProductScanEvent - Track individual scan events for analytics
 * Subcollection: product_database/{barcode}/scans/{scanId}
 */
export interface ProductScanEvent {
  id: string
  userId: string // Who scanned
  scannedAt: Date | string
  store?: string // Where they scanned
  region?: string // User's region
  priceCents?: number // Price if provided
  purchased: boolean // Did they buy it
  context: 'shopping' | 'meal-log' | 'inventory' // Why they scanned
}
