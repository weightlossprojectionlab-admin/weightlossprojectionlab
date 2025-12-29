import Link from 'next/link'
import type { Metadata } from 'next'

// Force static generation for maximum performance
export const dynamic = 'force-static'
export const revalidate = false

// Override metadata for home page with optimized title
export const metadata: Metadata = {
  title: 'Weight Loss Projection Lab - AI-Powered Meal Tracking',
  description: 'Stop guessing, start losing. Track meals in 30 seconds with AI-powered photo analysis. No tedious logging required.',
}

export default function HomePage() {
  // No auth check on home page - keeps it fast and lightweight
  // The /auth page will handle redirects for already-authenticated users

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Hero Section with Visual */}
        <div className="text-center space-y-6">
          {/* Hero Visual - Food Tracking Illustration */}
          <div className="relative mx-auto w-64 h-64 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-green-500 rounded-full opacity-10 animate-pulse"></div>
            <div className="absolute inset-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-full opacity-20 flex items-center justify-center">
              <div className="text-8xl">📸</div>
            </div>
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">🥗</span>
            </div>
            <div className="absolute bottom-8 left-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">⚖️</span>
            </div>
            <div className="absolute top-12 left-0 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">💪</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            Stop Guessing. Start Losing.
          </h1>
          <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
            Lose weight without the tedious tracking. Just snap a photo of your meal—our AI does the rest in 30 seconds.
          </p>
        </div>

        {/* Benefit-Driven Features with Visual Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Track Meals in 30 Seconds</h3>
            <p className="text-sm text-muted-foreground">
              No more manual entry. Snap a photo, get instant nutrition analysis. Save 10 minutes per meal.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-green-200 dark:hover:border-green-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">🎯</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Hit Your Goals Effortlessly</h3>
            <p className="text-sm text-muted-foreground">
              Personalized calorie and macro targets that adjust as you progress. Stay on track without the math.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">📈</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">See Real Results</h3>
            <p className="text-sm text-muted-foreground">
              Visual progress tracking shows exactly what's working. Stay motivated with clear insights.
            </p>
          </div>
        </div>

        {/* Social Proof / Success Metrics */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl shadow-2xl p-8 text-white text-center">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-4xl font-bold mb-2">10k+</div>
              <div className="text-sm opacity-90">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500k+</div>
              <div className="text-sm opacity-90">Meals Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2M+</div>
              <div className="text-sm opacity-90">Pounds Lost</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            aria-label="Start your weight loss journey"
          >
            Start Your Journey 🚀
          </Link>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Join thousands who've simplified their weight loss journey. No credit card required.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-lg">📱</span> Mobile-first
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">♿</span> Accessible
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">🔒</span> Privacy-focused
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}