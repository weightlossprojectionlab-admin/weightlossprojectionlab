/**
 * Getting Started - View Insights Page
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'View Insights - Getting Started | Wellness Projection Lab',
  description: 'Learn how to understand and use your health data insights with WPL\'s analytics dashboard.',
}

export default function InsightsDocsPage() {
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
          <span className="text-gray-600">View Insights</span>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">3️⃣</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">View Your Insights</h1>
          </div>
          <p className="text-xl text-gray-600">
            Understand your health data with personalized analytics and actionable insights
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Dashboard Overview</h2>
            <p className="text-gray-700 mb-4">
              Your{' '}
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                Dashboard
              </Link>{' '}
              is your central hub for all health insights. Here's what you'll find:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">📊 Daily Summary</h3>
                <ul className="text-sm text-blue-900 space-y-1 ml-2">
                  <li>• Calorie intake vs. goal</li>
                  <li>• Macronutrient breakdown</li>
                  <li>• Meal tracking status</li>
                  <li>• Water intake</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">📈 Trends & Progress</h3>
                <ul className="text-sm text-purple-900 space-y-1 ml-2">
                  <li>• Weight trajectory</li>
                  <li>• Weekly averages</li>
                  <li>• Habit streaks</li>
                  <li>• Goal progress</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">💡 WPL Insights</h3>
                <ul className="text-sm text-green-900 space-y-1 ml-2">
                  <li>• Personalized recommendations</li>
                  <li>• Pattern detection</li>
                  <li>• Success factors</li>
                  <li>• Areas for improvement</li>
                </ul>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h3 className="font-semibold text-orange-900 mb-2">🎯 Goals & Milestones</h3>
                <ul className="text-sm text-orange-900 space-y-1 ml-2">
                  <li>• Current goals</li>
                  <li>• Achievements</li>
                  <li>• Upcoming milestones</li>
                  <li>• Celebration moments</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Understanding Key Metrics</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Calorie Balance</h3>
                <p className="text-gray-700 text-sm mb-2">
                  Shows your daily calorie intake compared to your target goal. Green indicates you're within range, yellow means slightly over/under, and red signals significant deviation.
                </p>
                <p className="text-xs text-gray-600 italic">
                  Tip: Aim to stay within ±10% of your goal for optimal results
                </p>
              </div>

              <div className="border-l-4 border-purple-500 bg-gray-50 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Macronutrient Distribution</h3>
                <p className="text-gray-700 text-sm mb-2">
                  Visual breakdown of protein, carbs, and fats. The ideal ratio depends on your goals (weight loss, muscle gain, etc.).
                </p>
                <p className="text-xs text-gray-600 italic">
                  Typical ranges: Protein 20-35%, Carbs 45-65%, Fats 20-35%
                </p>
              </div>

              <div className="border-l-4 border-green-500 bg-gray-50 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Weight Trend</h3>
                <p className="text-gray-700 text-sm mb-2">
                  7-day and 30-day moving averages smooth out daily fluctuations to show your true trajectory. Focus on the trend line, not individual weigh-ins.
                </p>
                <p className="text-xs text-gray-600 italic">
                  Healthy weight loss: 0.5-2 lbs per week
                </p>
              </div>

              <div className="border-l-4 border-orange-500 bg-gray-50 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Meal Quality Score</h3>
                <p className="text-gray-700 text-sm mb-2">
                  WPL-generated score (0-100) based on nutritional balance, variety, whole foods, and alignment with your goals.
                </p>
                <p className="text-xs text-gray-600 italic">
                  Scoring: 80-100 Excellent, 60-79 Good, 40-59 Fair, Below 40 Needs Improvement
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. WPL-Powered Insights</h2>
            <p className="text-gray-700 mb-4">
              WPL analyzes your data to provide personalized insights:
            </p>
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Pattern Recognition
                </h3>
                <p className="text-sm text-gray-700">
                  Identifies correlations between your meals, sleep, stress, and weight changes. Example: "You lose more weight when you eat breakfast before 9 AM."
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Personalized Recommendations
                </h3>
                <p className="text-sm text-gray-700">
                  Actionable suggestions based on your unique data. Example: "Try increasing protein by 15g to reduce evening cravings."
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  Early Warnings
                </h3>
                <p className="text-sm text-gray-700">
                  Alerts about potential issues before they become problems. Example: "Calorie intake has been 300 below target for 3 days."
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Success Highlights
                </h3>
                <p className="text-sm text-gray-700">
                  Celebrates your wins and identifies what's working. Example: "Great job! You've tracked meals 21 days in a row."
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Customizing Your View</h2>
            <p className="text-gray-700 mb-4">
              Personalize your dashboard to focus on what matters most to you:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Time Range:</strong> View daily, weekly, monthly, or custom date ranges
              </li>
              <li>
                <strong>Metric Widgets:</strong> Add, remove, or reorder dashboard cards
              </li>
              <li>
                <strong>Chart Types:</strong> Switch between line graphs, bar charts, and pie charts
              </li>
              <li>
                <strong>Family Views:</strong> Toggle between individual and family-wide analytics
              </li>
              <li>
                <strong>Export Data:</strong> Download reports as PDF or CSV for sharing with healthcare providers
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Taking Action on Insights</h2>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <h3 className="font-bold text-xl mb-4">Insights → Actions → Results</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex-shrink-0">✓</span>
                  <div>
                    <strong>Review insights daily:</strong> Spend 2-3 minutes each morning reviewing your dashboard
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0">✓</span>
                  <div>
                    <strong>Act on recommendations:</strong> Pick 1-2 WPL suggestions to implement each week
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0">✓</span>
                  <div>
                    <strong>Track your experiments:</strong> Use notes to document what strategies work for you
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0">✓</span>
                  <div>
                    <strong>Celebrate progress:</strong> Acknowledge both scale and non-scale victories
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Pro Tips for Maximum Insight</h2>
            <ul className="space-y-2 text-blue-900">
              <li>
                <strong>Give it time:</strong> Most patterns become clear after 2-3 weeks of consistent tracking
              </li>
              <li>
                <strong>Look beyond the scale:</strong> Monitor energy levels, sleep quality, and how clothes fit
              </li>
              <li>
                <strong>Weekly reviews:</strong> Set aside time each Sunday to review the week's data
              </li>
              <li>
                <strong>Context matters:</strong> Use notes to track stress, sleep, and life events that affect data
              </li>
              <li>
                <strong>Share with your circle:</strong> Discuss insights with family or accountability partners
              </li>
            </ul>
          </section>

          {/* Common Questions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Questions</h2>
            <div className="space-y-3">
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Why do my insights say "Not enough data"?
                </summary>
                <p className="text-gray-700 mt-2">
                  WPL insights require at least 5-7 days of consistent tracking to identify patterns. Keep logging your meals and the insights will appear!
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Can I hide metrics I don't care about?
                </summary>
                <p className="text-gray-700 mt-2">
                  Yes! Click the gear icon on your dashboard and customize which widgets appear. Premium users can create multiple dashboard views.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  How often are insights updated?
                </summary>
                <p className="text-gray-700 mt-2">
                  Real-time metrics update instantly. WPL-generated insights refresh daily at midnight based on the previous day's complete data.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  What if I disagree with a WPL recommendation?
                </summary>
                <p className="text-gray-700 mt-2">
                  You can mark recommendations as "not helpful" to improve future suggestions. Always consult with healthcare providers for medical advice.
                </p>
              </details>
            </div>
          </section>

          {/* Next Steps */}
          <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 You're All Set!</h2>
            <p className="text-gray-700 mb-4">
              Congratulations! You've completed the Quick Start Guide. Here's what to do next:
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/docs/user-guides"
                className="block border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-center"
              >
                Explore Advanced Features
              </Link>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <Link
            href="/docs/getting-started/first-log"
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
            Previous: Log Your First Meal
          </Link>
          <Link
            href="/docs/getting-started"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            Back to Getting Started
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12h18M3 12l7-7m-7 7l7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
