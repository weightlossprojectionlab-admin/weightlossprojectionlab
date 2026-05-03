do /**
 * USDA `branded_food_category` -> app `ProductCategory` mapping.
 *
 * USDA stores broad food-merchandising categories on each branded_food
 * row (e.g., "Ketchup, Mustard, BBQ & Cheese Sauce") that don't match
 * the 14 enum values our app uses. Without this map, pickCategory()
 * has to fall back to the client-side detectCategory() heuristic
 * (which classifies Heinz Ketchup as "produce" and Sweet Baby Ray's
 * BBQ as "dairy"). With the map, ~95% of branded products auto-pick
 * the right ProductCategory at scan/import time.
 *
 * Coverage strategy: keys are the literal USDA strings (title-case,
 * including punctuation). Lookup is case-insensitive at call time.
 * If a category isn't in the map, the caller falls back to its
 * existing behavior.
 *
 * Update path: when you spot a misclassification in /admin/barcodes,
 * add the USDA string here. Run npm run resync:categories afterward
 * to push the fix to existing inventory/shopping rows.
 */
import type { ProductCategory } from '@/types/shopping'

const RAW_MAP: Record<string, ProductCategory> = {
  // Dairy
  'Cheese': 'dairy',
  'Yogurt': 'dairy',
  'Milk': 'dairy',
  'Other Dairy': 'dairy',
  'Cream': 'dairy',
  'Butter & Spread': 'dairy',
  'Sour Cream': 'dairy',
  'Cottage Cheese & Ricotta Cheese': 'dairy',

  // Eggs
  'Eggs & Egg Substitutes': 'eggs',
  'Eggs': 'eggs',

  // Meat
  'Beef': 'meat',
  'Pork': 'meat',
  'Chicken & Turkey': 'meat',
  'Bacon, Sausages & Ribs': 'meat',
  'Hot Dogs, Bratwurst & Corn Dogs': 'meat',
  'Lunchmeat, Cured Meats & Sausages': 'deli',
  'Lamb & Veal': 'meat',
  'Other Meats': 'meat',

  // Deli
  'Pre-Packaged Deli Sandwich': 'deli',
  'Wraps': 'deli',

  // Seafood
  'Fish, Shellfish & Seafood': 'seafood',
  'Canned Tuna, Salmon & Seafood': 'pantry', // shelf-stable, not refrigerated

  // Produce
  'Vegetables': 'produce',
  'Fruit': 'produce',
  'Fresh Vegetables': 'produce',
  'Fresh Fruits': 'produce',
  'Bagged Salads': 'produce',
  'Pre-packaged Fruit & Vegetables': 'produce',

  // Herbs (treated as produce-ish; detectCategory has a herbs bucket)
  'Spices, Seasonings & Herbs': 'condiments',
  'Fresh Herbs': 'herbs',

  // Bakery
  'Bread & Buns': 'bakery',
  'Cookies & Biscuits': 'bakery',
  'Cakes, Cupcakes, Snack Cakes': 'bakery',
  'Pastries': 'bakery',
  'Pies': 'bakery',
  'Pancake & Waffle Mixes': 'bakery',
  'Flours & Meals': 'bakery',
  'Tortillas': 'bakery',
  'Bakery - Other': 'bakery',

  // Frozen
  'Ice Cream & Frozen Yogurt': 'frozen',
  'Frozen Vegetables': 'frozen',
  'Frozen Dinners/Entrees': 'frozen',
  'Pizza': 'frozen',
  'Frozen Meals': 'frozen',
  'Frozen Desserts': 'frozen',
  'Frozen Fruit': 'frozen',
  'Frozen Fish/Seafood': 'frozen',
  'Frozen Bread & Dough': 'frozen',
  'Frozen Breakfast Foods': 'frozen',
  'Frozen Other': 'frozen',
  'Frozen Appetizers/Snacks': 'frozen',
  'Frozen Pizza': 'frozen',
  'Frozen Fruit & Fruit Juice Concentrates': 'frozen',

  // Pantry — packaged shelf-stable
  'Cereal': 'pantry',
  'Pasta by Shape & Type': 'pantry',
  'Rice': 'pantry',
  'Pasta Mixes': 'pantry',
  'Crackers': 'pantry',
  'Crackers & Crispbreads': 'pantry',
  'Pretzels/Snack Mixes': 'pantry',
  'Chips, Pretzels & Snacks': 'pantry',
  'Salty Snacks': 'pantry',
  'Granola Bars': 'pantry',
  'Granola, Cereal & Bars': 'pantry',
  'Cereal Bars': 'pantry',
  'Snacks - Other': 'pantry',
  'Candy': 'pantry',
  'Chocolate': 'pantry',
  'Soup': 'pantry',
  'Soup, Broth, Bouillon': 'pantry',
  'Canned Vegetables': 'pantry',
  'Canned Soup': 'pantry',
  'Canned Pasta & Pasta Meals': 'pantry',
  'Canned Beans': 'pantry',
  'Beans': 'pantry',
  'Dried Fruit': 'pantry',
  'Nuts & Seeds': 'pantry',
  'Trail & Snack Mixes': 'pantry',
  'Popcorn (Shelf Stable)': 'pantry',
  'Microwaveable Meals/Entrees - Shelf-stable': 'pantry',
  'Snack, Energy & Granola Bars': 'pantry',
  'Other Snacks': 'pantry',

  // Beverages
  'Fruit & Vegetable Juice, Nectars & Fruit Drinks': 'beverages',
  'Carbonated Beverages': 'beverages',
  'Coffee': 'beverages',
  'Tea Bags': 'beverages',
  'Energy & Sport Drinks': 'beverages',
  'Bottled Water': 'beverages',
  'Sparkling Drinks': 'beverages',
  'Soda Pop': 'beverages',
  'Milk Substitutes': 'beverages',
  'Wine': 'beverages',
  'Beer': 'beverages',
  'Liquor & Spirits': 'beverages',
  'Powdered Drinks': 'beverages',
  'Other Drinks': 'beverages',
  'Tea - Ready to Drink': 'beverages',
  'Coffee - Ready to Drink': 'beverages',
  'Hot Cocoa & Other Hot Beverages': 'beverages',
  'Refrigerated Juices, Drinks & Smoothies': 'beverages',
  'Powdered Beverages': 'beverages',

  // Condiments
  'Salad Dressings': 'condiments',
  'Ketchup, Mustard, BBQ & Cheese Sauce': 'condiments',
  'Pickles, Olives, Peppers & Relishes': 'condiments',
  'Mayonnaise, Tartar Sauce & Mayo Style': 'condiments',
  'Sauces': 'condiments',
  'Hot Sauce': 'condiments',
  'Salsa & Dips': 'condiments',
  'Pasta Sauce, Tomato Paste & Tomato Sauce': 'condiments',
  'Vinegar': 'condiments',
  'Marinades & Sauces': 'condiments',
  'Oil': 'condiments',
  'Honey, Syrup & Sugar': 'condiments',
  'Jam, Jelly & Fruit Spreads': 'condiments',
  'Peanut Butter & Spreads': 'condiments',
  'Salt': 'condiments',
  'Pepper': 'condiments',
  'Sugars': 'condiments',
  'Spreads': 'condiments',
  'Other Condiments': 'condiments',

  // Baby
  'Baby Food': 'baby',
  'Baby/Infant - Foods, Beverages & Formula': 'baby',
  'Formula': 'baby',
  'Baby Snacks & Beverages': 'baby',
  'Baby Foods': 'baby',

  // Pet — USDA FoodData Central does not index pet/animal feed, but OFF
  // occasionally returns these strings as free-text categories. Mapped
  // defensively so a hit short-circuits the heuristic.
  'Pet Food': 'pet-food',
  'Cat Food': 'pet-food',
  'Dog Food': 'pet-food',
  'Pet Treats': 'pet-food',
  'Dry Pet Food': 'pet-food',
  'Wet Pet Food': 'pet-food',
  'Pet Supplies': 'pet-supplies',
  'Cat Litter': 'pet-supplies',
}

// Build a case-insensitive index for lookup.
const INDEX: Map<string, ProductCategory> = new Map()
for (const [key, value] of Object.entries(RAW_MAP)) {
  INDEX.set(key.toLowerCase().trim(), value)
}

/**
 * Map a USDA branded_food_category string to a ProductCategory enum
 * value. Returns null when the input is empty or unrecognized so the
 * caller can fall back to its existing classification path.
 */
export function mapUsdaCategory(usdaCategory: string | undefined | null): ProductCategory | null {
  if (!usdaCategory) return null
  const key = usdaCategory.toLowerCase().trim()
  if (!key) return null
  return INDEX.get(key) ?? null
}
