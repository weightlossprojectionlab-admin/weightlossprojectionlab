import Link from 'next/link'
import type { Metadata } from 'next'

// Force static generation for maximum performance
export const dynamic = 'force-static'
export const revalidate = false

// Override metadata for home page with optimized title
export const metadata: Metadata = {
  title: 'Weight Loss Progress Lab - AI-Powered Meal Tracking',
  description: 'Stop guessing, start losing. Track meals in 30 seconds with AI-powered photo analysis. No tedious logging required.',
}

export default function HomePage() {
  // No auth check on home page - keeps it fast and lightweight
  // The /auth page will handle redirects for already-authenticated users

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="mx-auto max-w-md space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Stop Guessing. Start Losing.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-sans">
            Lose weight without the tedious tracking. Just snap a photo of your meal—our AI does the rest in 30 seconds.
          </p>
        </div>

        {/* Benefit-Driven Features */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-left">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">⚡</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Track Meals in 30 Seconds</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No more manual entry. Snap a photo, get instant nutrition analysis. Save 10 minutes per meal.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-left">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🎯</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Hit Your Goals Effortlessly</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Personalized calorie and macro targets that adjust as you progress. Stay on track without the math.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-left">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">📈</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">See Real Results</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visual progress tracking shows exactly what's working. Stay motivated with clear insights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/auth"
            className="btn btn-primary w-full text-lg py-4"
            aria-label="Start your weight loss journey"
          >
            Start Your Journey
          </Link>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Join thousands who've simplified their weight loss journey
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <p>Mobile-first • Accessible • Privacy-focused</p>
        </div>
      </div>
    </main>
  )
}