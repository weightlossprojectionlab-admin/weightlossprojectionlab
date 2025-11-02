'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLazyAuth } from '@/hooks/useLazyAuth'

export default function HomePage() {
  const { user, loading } = useLazyAuth()
  const router = useRouter()

  // Don't block the homepage with loading state - show it immediately
  // Default to unauthenticated state (most visitors are new)
  // Only show authenticated options once auth is confirmed

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-purple-100 px-4">
      <div className="mx-auto max-w-md space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Stop Guessing. Start Losing.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Lose weight without the tedious tracking. Just snap a photo of your meal—our AI does the rest in 30 seconds.
          </p>
        </div>

        {/* Benefit-Driven Features */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left">
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

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left">
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

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left">
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

        {/* Conditional CTA */}
        <div className="space-y-3">
          {!loading && user ? (
            // Authenticated: Go to dashboard
            <>
              <Link
                href="/dashboard"
                className="btn btn-primary w-full text-lg py-4"
                aria-label="Go to your dashboard"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => router.push('/profile')}
                className="text-sm text-accent hover:text-accent-hover"
                aria-label="View profile settings"
              >
                Profile Settings
              </button>
            </>
          ) : (
            // Unauthenticated or loading: Single clear CTA (default state)
            <>
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <p>Mobile-first • Accessible • Privacy-focused</p>
        </div>
      </div>
    </main>
  )
}