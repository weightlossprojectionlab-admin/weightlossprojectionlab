import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Shopping Lists Guide | Wellness Projection Lab',
  description: 'Create and manage shopping lists with smart suggestions.',
}

export default function ShoppingPage() {
  return (
    <GuideTemplate
      title="Shopping Lists"
      description="Create and manage shopping lists with smart suggestions"
    >
      <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-green-900 mb-2">🛒 Smart Shopping</p>
        <p className="text-green-800 m-0">
          Shopping lists designed for health-conscious shoppers. Works offline, supports barcode scanning, and provides nutrition insights.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        WPL's shopping lists help you shop smarter with features like offline access, barcode scanning, nutrition analysis, and automatic organization by store section.
      </p>

      <h2 id="creating">Creating a Shopping List</h2>
      <ol>
        <li>Navigate to the <strong>Shopping</strong> page from the main menu</li>
        <li>Click <strong>New List</strong> or <strong>+ Add Item</strong></li>
        <li>Name your list (optional, defaults to date)</li>
        <li>Start adding items</li>
      </ol>

      <h2 id="adding-items">Adding Items</h2>

      <h3>Manual Entry</h3>
      <ol>
        <li>Type the product name in the add field</li>
        <li>Optional: Add quantity and notes</li>
        <li>Click Add or press Enter</li>
        <li>Item appears in your list</li>
      </ol>

      <h3>Barcode Scanning</h3>
      <ol>
        <li>Click the barcode scan icon</li>
        <li>Scan the product barcode</li>
        <li>Product auto-added with nutrition info</li>
        <li>Adjust quantity if needed</li>
      </ol>
      <p className="text-sm text-gray-600">
        Learn more: <Link href="/docs/user-guides/barcode-scanning" className="text-blue-600 underline">Barcode Scanning Guide</Link>
      </p>

      <h3>From Recipes</h3>
      <ol>
        <li>Browse recipes in the Recipe section</li>
        <li>Click "Add ingredients to shopping list"</li>
        <li>Review the ingredient list</li>
        <li>Items added with correct quantities</li>
      </ol>

      <h3>From Meal History</h3>
      <ol>
        <li>View past meals in your log</li>
        <li>Click "Add to shopping list" on any meal</li>
        <li>Ingredients extracted from meal photo/analysis</li>
        <li>Review and confirm items</li>
      </ol>

      <h2 id="organizing">Organizing Your List</h2>

      <h3>Auto-Categorization</h3>
      <p>Items automatically organize by store section:</p>
      <ul>
        <li>Produce</li>
        <li>Dairy & Eggs</li>
        <li>Meat & Seafood</li>
        <li>Bakery</li>
        <li>Frozen Foods</li>
        <li>Pantry & Dry Goods</li>
        <li>Beverages</li>
        <li>Snacks</li>
        <li>Health & Wellness</li>
      </ul>

      <h3>Custom Categories</h3>
      <ul>
        <li>Create your own categories</li>
        <li>Drag items between sections</li>
        <li>Reorder sections to match your store layout</li>
        <li>Save custom organization for future lists</li>
      </ul>

      <h3>Priority Items</h3>
      <ul>
        <li>Star important items</li>
        <li>Starred items appear at top</li>
        <li>Useful for sale items or priority purchases</li>
      </ul>

      <h2 id="shopping">Using Lists While Shopping</h2>

      <h3>Offline Access</h3>
      <p>Shopping lists work perfectly in stores with poor reception:</p>
      <ul>
        <li>Open your list before entering the store</li>
        <li>Everything caches for offline use</li>
        <li>Check off items as you shop</li>
        <li>Changes sync automatically when back online</li>
      </ul>
      <p className="text-sm text-gray-600">
        More details: <Link href="/docs/user-guides/offline-mode" className="text-blue-600 underline">Offline Mode Guide</Link>
      </p>

      <h3>Checking Off Items</h3>
      <ul>
        <li>Tap the checkbox next to each item</li>
        <li>Checked items move to "Purchased" section</li>
        <li>Strikethrough shows what's complete</li>
        <li>Undo if you unchecked by mistake</li>
      </ul>

      <h3>In-Store Scanning</h3>
      <p>Use barcode scanning while shopping:</p>
      <ul>
        <li>Scan to verify correct product</li>
        <li>Compare nutrition against similar products</li>
        <li>See health scores and allergen warnings</li>
        <li>Add alternatives if primary choice unavailable</li>
      </ul>

      <h2 id="smart-features">Smart Features</h2>

      <h3>Nutrition Insights</h3>
      <p>View nutrition summaries for your entire list:</p>
      <ul>
        <li>Total estimated calories for all items</li>
        <li>Macro breakdown if purchasing meal ingredients</li>
        <li>Health score average</li>
        <li>Allergen warnings</li>
      </ul>

      <h3>Budget Tracking</h3>
      <ul>
        <li>Optional: Add estimated prices to items</li>
        <li>Running total shown at bottom</li>
        <li>Compare against budget</li>
        <li>Track actual costs after shopping</li>
      </ul>

      <h3>Recurring Lists</h3>
      <ul>
        <li>Save frequently-used lists as templates</li>
        <li>One-click to recreate weekly essentials list</li>
        <li>Automatically suggests items based on purchase history</li>
        <li>Edit template as needs change</li>
      </ul>

      <h3>Smart Suggestions</h3>
      <p>WPL suggests items based on:</p>
      <ul>
        <li>Items you buy regularly</li>
        <li>Products for meals you log frequently</li>
        <li>Healthier alternatives to current choices</li>
        <li>Seasonal produce recommendations</li>
      </ul>

      <h2 id="sharing">Sharing Lists</h2>

      <h3>Family Sharing</h3>
      <p>Share lists with family members or caregivers:</p>
      <ol>
        <li>Click the share icon on any list</li>
        <li>Select family members to share with</li>
        <li>Everyone sees real-time updates</li>
        <li>Anyone can add items or check off purchases</li>
      </ol>

      <h3>Collaborative Shopping</h3>
      <p>Multiple people shopping? Split the list:</p>
      <ul>
        <li>Assign categories to different shoppers</li>
        <li>Each person checks off their items</li>
        <li>See who's getting what in real-time</li>
        <li>Coordinate to avoid duplicate purchases</li>
      </ul>

      <h2 id="health-goals">Shopping for Health Goals</h2>

      <h3>Goal-Aligned Recommendations</h3>
      <p>If you have active health goals, WPL suggests:</p>
      <ul>
        <li>High-protein foods for muscle building goals</li>
        <li>Low-calorie alternatives for weight loss</li>
        <li>Nutrient-dense foods for wellness goals</li>
        <li>Items that fit your macro targets</li>
      </ul>

      <h3>Dietary Restrictions</h3>
      <p>Set dietary preferences in settings:</p>
      <ul>
        <li>Gluten-free</li>
        <li>Dairy-free</li>
        <li>Vegan/Vegetarian</li>
        <li>Keto/Low-carb</li>
        <li>Nut allergies</li>
        <li>Custom restrictions</li>
      </ul>
      <p>WPL flags items that don't match your preferences and suggests alternatives.</p>

      <h2 id="tips">Shopping List Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Plan Before Shopping</p>
            <p className="text-sm text-gray-600 m-0">
              Create your list at home when you can think clearly, not rushed in the parking lot.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🥗</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Shop Perimeter First</p>
            <p className="text-sm text-gray-600 m-0">
              Organize categories to shop produce, meat, dairy first - the healthiest sections.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Scan Everything</p>
            <p className="text-sm text-gray-600 m-0">
              Use barcode scanning to compare similar products and make healthier choices.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Track Spending</p>
            <p className="text-sm text-gray-600 m-0">
              Add prices to build realistic grocery budgets over time.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>List not saving</h3>
      <ul>
        <li>Check internet connection (or use offline mode)</li>
        <li>Ensure list has a name</li>
        <li>Try refreshing the page</li>
      </ul>

      <h3>Items in wrong category</h3>
      <ul>
        <li>Drag item to correct section</li>
        <li>System learns your preferences</li>
        <li>Report persistent issues for AI improvement</li>
      </ul>

      <h3>Can't share list</h3>
      <ul>
        <li>Ensure recipient is in your family circle</li>
        <li>Check their notification permissions</li>
        <li>Try re-sharing the list</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/barcode-scanning"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Barcode Scanning →</h3>
          <p className="text-sm text-gray-600">
            Learn how to scan products while shopping
          </p>
        </Link>
        <Link
          href="/docs/user-guides/recipes"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Browse Recipes →</h3>
          <p className="text-sm text-gray-600">
            Add recipe ingredients directly to shopping lists
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
