/**
 * Getting Started - Log Your First Meal Page
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Log Your First Meal - Getting Started | Wellness Projection Lab',
  description: 'Learn how to track your first meal using WPL\'s WPL-powered meal tracking feature.',
}

export default function FirstLogDocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/docs" className="text-blue-600 hover:text-blue-700">
            Documentation
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/docs/getting-started" className="text-blue-600 hover:text-blue-700">
            Getting Started
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Log Your First Meal</span>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">2️⃣</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Log Your First Meal</h1>
          </div>
          <p className="text-xl text-gray-600">
            Track meals with WPL-powered analysis for accurate nutritional insights
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Access Meal Tracking</h2>
            <p className="text-gray-700 mb-4">
              Navigate to the{' '}
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                Dashboard
              </Link>{' '}
              and click the "Log Meal" button or use the quick action menu.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Quick Tip:</strong> You can also access meal logging from the mobile app's bottom navigation bar.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Choose Your Logging Method</h2>
            <div className="space-y-4">
              <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Photo Analysis (Recommended)
                </h3>
                <ul className="list-disc list-inside text-blue-900 space-y-2 ml-2">
                  <li>Snap a photo of your meal</li>
                  <li>WPL analyzes ingredients and portions automatically</li>
                  <li>Review and confirm the analysis</li>
                  <li>Most accurate with clear, well-lit photos</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Manual Search
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
                  <li>Search our extensive food database</li>
                  <li>Select the food item</li>
                  <li>Enter portion size</li>
                  <li>Great for packaged foods with known nutrition</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Custom Entry
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
                  <li>Create custom food entries</li>
                  <li>Input nutritional values manually</li>
                  <li>Save for future use</li>
                  <li>Perfect for homemade recipes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Using WPL Photo Analysis</h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Step-by-Step Guide:</h3>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <div>
                      <strong className="text-gray-900">Take or upload a photo</strong>
                      <p className="text-sm text-gray-700 mt-1">Ensure good lighting and the entire meal is visible</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <div>
                      <strong className="text-gray-900">Wait for WPL analysis</strong>
                      <p className="text-sm text-gray-700 mt-1">Usually takes 3-5 seconds to identify ingredients</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <div>
                      <strong className="text-gray-900">Review detected foods</strong>
                      <p className="text-sm text-gray-700 mt-1">Check ingredients and adjust portions if needed</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    <div>
                      <strong className="text-gray-900">Add meal details</strong>
                      <p className="text-sm text-gray-700 mt-1">Select meal type (breakfast, lunch, dinner, snack)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                    <div>
                      <strong className="text-gray-900">Save your meal</strong>
                      <p className="text-sm text-gray-700 mt-1">View nutritional summary and add notes if desired</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Understanding Your Meal Analysis</h2>
            <p className="text-gray-700 mb-4">
              After logging, you'll see a detailed breakdown including:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Macronutrients</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Calories</li>
                  <li>• Protein</li>
                  <li>• Carbohydrates</li>
                  <li>• Fats</li>
                  <li>• Fiber</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Insights</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Meal quality score</li>
                  <li>• Nutritional balance</li>
                  <li>• Suggestions for improvement</li>
                  <li>• Progress toward daily goals</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Pro Tips for Better Tracking</h2>
            <ul className="space-y-2 text-blue-900">
              <li>
                <strong>Photo quality matters:</strong> Use natural lighting and capture the entire plate
              </li>
              <li>
                <strong>Log in real-time:</strong> Track meals immediately after eating for best accuracy
              </li>
              <li>
                <strong>Include drinks:</strong> Don't forget to log beverages, they add up!
              </li>
              <li>
                <strong>Be consistent:</strong> Track every meal for 3-4 days to establish baseline patterns
              </li>
              <li>
                <strong>Use favorites:</strong> Save frequently eaten meals for quick logging
              </li>
              <li>
                <strong>Review and adjust:</strong> Double-check WPL portions match your actual serving sizes
              </li>
            </ul>
          </section>

          {/* Common Questions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Questions</h2>
            <div className="space-y-3">
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  How accurate is the WPL photo analysis?
                </summary>
                <p className="text-gray-700 mt-2">
                  WPL is 85-95% accurate depending on photo quality. You can always adjust portions and ingredients manually.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Can I edit a meal after logging it?
                </summary>
                <p className="text-gray-700 mt-2">
                  Yes! Go to your meal history, select the meal, and click "Edit" to make changes.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  What if WPL doesn't recognize my food?
                </summary>
                <p className="text-gray-700 mt-2">
                  You can use manual search or create a custom entry. WPL learns over time and improves with more data.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Do I need to log every single thing I eat?
                </summary>
                <p className="text-gray-700 mt-2">
                  For best results, yes. However, you can choose what level of detail works for you. Even logging main meals helps!
                </p>
              </details>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <Link
            href="/docs/getting-started/signup"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous: Create Account
          </Link>
          <Link
            href="/docs/getting-started/insights"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Next: View Insights
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
