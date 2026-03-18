import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Meal Tracking Guide | Wellness Projection Lab',
  description: 'Learn how to track meals with AI-powered analysis, photo logging, and nutritional insights.',
}

export default function MealTrackingGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/docs" className="hover:text-blue-600">Documentation</Link>
            <span>/</span>
            <Link href="/docs/user-guides" className="hover:text-blue-600">User Guides</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Meal Tracking</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Meal Tracking Guide</h1>
          <p className="text-xl text-gray-600">
            Learn how to effectively track your meals using AI-powered analysis and photo logging
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
            <p className="font-semibold text-blue-900 mb-2">💡 Pro Tip</p>
            <p className="text-blue-800 m-0">
              For best results, take photos in good lighting and capture the entire meal. Our AI
              works best when it can clearly see all components of your dish.
            </p>
          </div>

          <h2 id="getting-started">Getting Started</h2>
          <p>
            Meal tracking in WPL is designed to be quick and intuitive. Whether you're logging
            breakfast, lunch, dinner, or a snack, the process takes just seconds.
          </p>

          <h2 id="methods">Three Ways to Track Meals</h2>

          <h3>1. Photo Logging (Recommended)</h3>
          <ol>
            <li>Navigate to the <strong>Log Meal</strong> page from the main menu</li>
            <li>Select your meal type (Breakfast, Lunch, Dinner, or Snack)</li>
            <li>Take a photo of your meal or upload from gallery</li>
            <li>Wait 2-3 seconds while our AI analyzes the meal</li>
            <li>Review the AI's nutritional analysis</li>
            <li>Add optional notes (allergies, portions, feelings)</li>
            <li>Tap <strong>Save Meal</strong></li>
          </ol>

          <div className="bg-gray-100 p-4 rounded-lg my-6">
            <p className="text-sm text-gray-700 font-medium mb-2">What the AI Detects:</p>
            <ul className="text-sm text-gray-600 space-y-1 m-0">
              <li>✓ Food items and ingredients</li>
              <li>✓ Estimated calories</li>
              <li>✓ Macronutrients (protein, carbs, fats)</li>
              <li>✓ Portion sizes</li>
              <li>✓ Cooking methods</li>
            </ul>
          </div>

          <h3>2. Quick Log (No Photo)</h3>
          <p>For times when you can't take a photo:</p>
          <ol>
            <li>Go to <strong>Log Meal</strong></li>
            <li>Select meal type</li>
            <li>Skip photo by clicking <strong>Log without photo</strong></li>
            <li>Manually enter meal details</li>
            <li>Save</li>
          </ol>

          <h3>3. Offline Mode</h3>
          <p>
            No internet? No problem! WPL works offline and will automatically sync your meals when
            you reconnect.
          </p>
          <ol>
            <li>Log meals as usual - they'll be queued locally</li>
            <li>An offline indicator will show in the top-right</li>
            <li>When internet returns, meals sync automatically</li>
            <li>You'll see a success notification once synced</li>
          </ol>

          <h2 id="ai-analysis">Understanding AI Analysis</h2>
          <p>
            Our AI uses advanced computer vision to analyze your meal photos. Here's what each
            metric means:
          </p>

          <h3>Calories</h3>
          <p>
            Total estimated energy from the meal. The AI considers portion sizes, cooking methods,
            and visible ingredients.
          </p>

          <h3>Macronutrients</h3>
          <ul>
            <li>
              <strong>Protein:</strong> Essential for muscle repair and growth
            </li>
            <li>
              <strong>Carbohydrates:</strong> Your body's primary energy source
            </li>
            <li>
              <strong>Fats:</strong> Important for hormone production and nutrient absorption
            </li>
          </ul>

          <h3>Confidence Score</h3>
          <p>
            Each analysis includes a confidence percentage. Higher confidence (80%+) means the AI
            is very certain about its analysis.
          </p>

          <h2 id="best-practices">Best Practices</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <p className="font-semibold text-green-900 mb-1">✓ DO</p>
              <ul className="text-gray-700 space-y-1 m-0">
                <li>Take photos before eating</li>
                <li>Capture the whole plate</li>
                <li>Use good lighting</li>
                <li>Log meals immediately</li>
                <li>Add notes about how you feel</li>
              </ul>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <p className="font-semibold text-red-900 mb-1">✗ DON'T</p>
              <ul className="text-gray-700 space-y-1 m-0">
                <li>Use blurry or dark photos</li>
                <li>Log meals days later</li>
                <li>Forget to select meal type</li>
                <li>Skip logging snacks</li>
              </ul>
            </div>
          </div>

          <h2 id="caregiver">Logging for Family Members</h2>
          <p>
            Caregivers can log meals on behalf of family members or patients:
          </p>
          <ol>
            <li>Switch to the patient's profile using the account switcher</li>
            <li>Log the meal as normal</li>
            <li>
              The system tracks that you (the caregiver) logged it for them
            </li>
            <li>Both you and the patient can view the meal history</li>
          </ol>

          <h2 id="viewing-history">Viewing Meal History</h2>
          <p>Access your complete meal history from the dashboard:</p>
          <ul>
            <li>
              <strong>Timeline view:</strong> See all meals chronologically
            </li>
            <li>
              <strong>Calendar view:</strong> Browse by date
            </li>
            <li>
              <strong>Analytics:</strong> View trends and patterns
            </li>
            <li>
              <strong>Export:</strong> Download data for your records
            </li>
          </ul>

          <h2 id="troubleshooting">Troubleshooting</h2>

          <h3>AI analysis seems inaccurate</h3>
          <ul>
            <li>Retake the photo with better lighting</li>
            <li>Make sure all food items are visible</li>
            <li>Manually adjust the analysis if needed</li>
            <li>Report issues via the feedback button</li>
          </ul>

          <h3>Photo upload fails</h3>
          <ul>
            <li>Check your internet connection</li>
            <li>Try a smaller image size</li>
            <li>Use offline mode if needed</li>
          </ul>

          <h3>Meals not syncing</h3>
          <ul>
            <li>Verify you're connected to the internet</li>
            <li>Check the sync status widget (bottom-right)</li>
            <li>Pull down to refresh on the dashboard</li>
            <li>Contact support if issues persist</li>
          </ul>

          <h2 id="next-steps">Next Steps</h2>
          <div className="grid md:grid-cols-2 gap-4 not-prose">
            <Link
              href="/docs/user-guides/weight-logging"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Weight Logging →</h3>
              <p className="text-sm text-gray-600">
                Learn how to track weight changes alongside your meals
              </p>
            </Link>
            <Link
              href="/docs/user-guides/progress-tracking"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Progress Tracking →</h3>
              <p className="text-sm text-gray-600">
                View charts and analytics of your health journey
              </p>
            </Link>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-blue-100 mb-6">
            Our support team is here to help with meal tracking
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/support"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/docs/user-guides"
              className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Back to Guides
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
