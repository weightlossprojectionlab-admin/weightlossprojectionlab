import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Barcode Scanning Guide | Wellness Projection Lab',
  description: 'Scan product barcodes for instant nutrition information.',
}

export default function BarcodeScanningPage() {
  return (
    <GuideTemplate
      appRoute="/log-meal"
      title="Barcode Scanning"
      description="Scan product barcodes for instant nutrition information"
    >
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-blue-900 mb-2">📱 Quick & Accurate</p>
        <p className="text-blue-800 m-0">
          Barcode scanning provides instant, accurate nutrition data from millions of products.
          Works online and offline with cached products.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        WPL's barcode scanner uses your device camera to instantly look up product nutrition
        information from the OpenFoodFacts database, one of the world's largest open food product
        databases.
      </p>

      <h2 id="how-to-scan">How to Scan Barcodes</h2>
      <ol>
        <li>Navigate to the meal logging or shopping page</li>
        <li>Look for the barcode scan icon (usually near the camera button)</li>
        <li>Click to open the scanner</li>
        <li>Allow camera access when prompted (first time only)</li>
        <li>Point your camera at the product barcode</li>
        <li>Hold steady until the scan completes (usually 1-2 seconds)</li>
        <li>View the product information automatically displayed</li>
      </ol>

      <div className="bg-gray-100 p-4 rounded-lg my-6">
        <p className="text-sm text-gray-700 font-medium mb-2">Supported Barcode Types:</p>
        <ul className="text-sm text-gray-600 space-y-1 m-0">
          <li>✓ UPC-A (standard US products)</li>
          <li>✓ EAN-13 (international products)</li>
          <li>✓ EAN-8 (smaller products)</li>
          <li>✓ UPC-E (compact codes)</li>
        </ul>
      </div>

      <h2 id="what-you-get">What Information You Get</h2>
      <p>When you scan a barcode, WPL retrieves:</p>

      <h3>Basic Information</h3>
      <ul>
        <li><strong>Product Name:</strong> Full product title</li>
        <li><strong>Brand:</strong> Manufacturer name</li>
        <li><strong>Product Image:</strong> Photo of the packaging</li>
        <li><strong>Serving Size:</strong> Standard portion</li>
      </ul>

      <h3>Nutritional Data</h3>
      <ul>
        <li><strong>Calories:</strong> Per serving and per 100g</li>
        <li><strong>Macronutrients:</strong> Protein, carbs, fat, fiber</li>
        <li><strong>Micronutrients:</strong> Vitamins and minerals (when available)</li>
        <li><strong>Sodium:</strong> Salt content</li>
        <li><strong>Sugars:</strong> Total and added sugars</li>
      </ul>

      <h3>Additional Data</h3>
      <ul>
        <li><strong>Ingredients List:</strong> Full ingredient breakdown</li>
        <li><strong>Allergens:</strong> Common allergen warnings</li>
        <li><strong>Labels:</strong> Organic, gluten-free, vegan, etc.</li>
        <li><strong>Nova Group:</strong> Food processing classification</li>
      </ul>

      <h2 id="use-cases">Common Use Cases</h2>

      <h3>Meal Logging</h3>
      <p>Add packaged foods to your meal logs:</p>
      <ol>
        <li>While logging a meal, tap the barcode icon</li>
        <li>Scan the product</li>
        <li>Adjust serving size if needed</li>
        <li>Add to your meal - nutrition auto-calculated</li>
      </ol>

      <h3>Shopping Lists</h3>
      <p>Quickly add items while shopping:</p>
      <ol>
        <li>Open your shopping list</li>
        <li>Scan products you want to buy</li>
        <li>Items added with full nutrition info</li>
        <li>Check off as you shop</li>
      </ol>

      <h3>Product Comparison</h3>
      <p>Compare similar products:</p>
      <ul>
        <li>Scan multiple brands of the same product type</li>
        <li>Compare calories, protein, sugar content</li>
        <li>Make healthier choices based on data</li>
        <li>Save favorites for future reference</li>
      </ul>

      <h2 id="offline-scanning">Offline Scanning</h2>
      <p>
        Barcode scanning works offline using cached product data. See our{' '}
        <Link href="/docs/user-guides/offline-mode" className="text-blue-600 underline">
          Offline Mode guide
        </Link>{' '}
        for details.
      </p>

      <h3>How Offline Works</h3>
      <ul>
        <li>Previously scanned products are cached automatically</li>
        <li>Common products may be pre-cached</li>
        <li>If product not in cache, it queues for online lookup</li>
        <li>You can still add the product with manual entry</li>
      </ul>

      <h2 id="tips">Scanning Tips for Best Results</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Good Lighting</p>
            <p className="text-sm text-gray-600 m-0">
              Scan in well-lit areas. Avoid glare or shadows on the barcode.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📏</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Proper Distance</p>
            <p className="text-sm text-gray-600 m-0">
              Hold your device 4-8 inches from the barcode. Too close or far won't scan well.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Center the Barcode</p>
            <p className="text-sm text-gray-600 m-0">
              Keep the barcode centered in the scanning frame. The entire code should be visible.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🤚</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Hold Steady</p>
            <p className="text-sm text-gray-600 m-0">
              Keep your hand still for 1-2 seconds while scanning. Movement causes blur.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Try Different Angles</p>
            <p className="text-sm text-gray-600 m-0">
              If it won't scan, try rotating the product slightly or adjusting the angle.
            </p>
          </div>
        </div>
      </div>

      <h2 id="data-source">Data Source: OpenFoodFacts</h2>
      <p>
        WPL uses the OpenFoodFacts database, a collaborative, free, and open database of food
        products from around the world.
      </p>

      <h3>Database Coverage</h3>
      <ul>
        <li>Over 2.8 million products worldwide</li>
        <li>100+ countries represented</li>
        <li>Growing daily with community contributions</li>
        <li>Verified nutrition data</li>
      </ul>

      <h3>Data Quality</h3>
      <ul>
        <li>Most data from official product packaging</li>
        <li>Community-verified information</li>
        <li>Regular updates as products change</li>
        <li>Completeness score shown for each product</li>
      </ul>

      <h2 id="product-not-found">When a Product Isn't Found</h2>
      <p>If you scan a barcode not in the database:</p>

      <h3>Option 1: Manual Entry</h3>
      <ol>
        <li>Enter product name manually</li>
        <li>Input nutrition facts from packaging</li>
        <li>Save for your records</li>
      </ol>

      <h3>Option 2: Contribute to Database</h3>
      <ol>
        <li>WPL provides a link to add the product to OpenFoodFacts</li>
        <li>Takes 2-3 minutes to photograph packaging and enter data</li>
        <li>Helps everyone else who scans that product in the future</li>
        <li>Product becomes available in WPL after contribution</li>
      </ol>

      <h2 id="privacy">Privacy & Permissions</h2>

      <h3>Camera Access</h3>
      <p>
        Barcode scanning requires camera permission. WPL only uses your camera when you activate
        the scanner - never in the background.
      </p>

      <h3>Data Handling</h3>
      <ul>
        <li>No photos are stored or transmitted</li>
        <li>Only the barcode number is sent to OpenFoodFacts</li>
        <li>Scanned products cached locally for offline use</li>
        <li>No personally identifiable information shared</li>
      </ul>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Camera won't open</h3>
      <ul>
        <li>Check browser camera permissions</li>
        <li>Try refreshing the page</li>
        <li>Ensure no other app is using the camera</li>
        <li>On mobile, use the native browser (Chrome/Safari)</li>
      </ul>

      <h3>Barcode won't scan</h3>
      <ul>
        <li>Clean your camera lens</li>
        <li>Improve lighting conditions</li>
        <li>Try a different barcode on the package (many have multiple)</li>
        <li>Manually enter the barcode numbers if scanning fails repeatedly</li>
      </ul>

      <h3>Product data incomplete</h3>
      <ul>
        <li>Check the completeness score shown</li>
        <li>Some products have limited data available</li>
        <li>Consider contributing missing information to OpenFoodFacts</li>
        <li>Use manual entry to supplement missing fields</li>
      </ul>

      <h3>Wrong product appears</h3>
      <ul>
        <li>Verify the barcode number matches the product</li>
        <li>Some generic barcodes are reused by different brands</li>
        <li>Report incorrect matches through the app</li>
        <li>Use manual entry for accurate tracking</li>
      </ul>

      <h2 id="advanced-features">Advanced Features</h2>

      <h3>Batch Scanning</h3>
      <p>Scan multiple products quickly:</p>
      <ul>
        <li>Scanner stays open after each scan</li>
        <li>Products queue up for review</li>
        <li>Adjust quantities and portions together</li>
        <li>Add all to meal or shopping list at once</li>
      </ul>

      <h3>Favorite Products</h3>
      <ul>
        <li>Save frequently scanned items as favorites</li>
        <li>Quick-add without scanning each time</li>
        <li>Builds your personal product library</li>
      </ul>

      <h3>Health Scores</h3>
      <p>WPL shows health ratings for scanned products:</p>
      <ul>
        <li><strong>Nutri-Score:</strong> A-E rating based on nutrition</li>
        <li><strong>NOVA Group:</strong> Food processing level (1-4)</li>
        <li><strong>Eco-Score:</strong> Environmental impact rating</li>
        <li><strong>Custom filters:</strong> Set dietary preferences</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/shopping"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Shopping Lists →</h3>
          <p className="text-sm text-gray-600">
            Use barcode scanning to build smart shopping lists
          </p>
        </Link>
        <Link
          href="/docs/user-guides/meal-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Meal Tracking →</h3>
          <p className="text-sm text-gray-600">
            Add scanned products to your meal logs
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
