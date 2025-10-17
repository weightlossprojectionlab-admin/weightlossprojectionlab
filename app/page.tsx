import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-health-bg to-primary-light px-4">
      <div className="mx-auto max-w-md space-y-8 text-center">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Weight Loss Progress Lab
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered nutrition tracking with biometric authentication
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <div className="health-card">
            <h3 className="font-semibold text-foreground">📸 AI Meal Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Take photos of your meals for instant nutrition estimates
            </p>
          </div>

          <div className="health-card">
            <h3 className="font-semibold text-foreground">🔐 Biometric Login</h3>
            <p className="text-sm text-muted-foreground">
              Secure access with Touch ID or Face ID
            </p>
          </div>

          <div className="health-card">
            <h3 className="font-semibold text-foreground">📊 Progress Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Monitor weight, meals, and activity trends
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/auth"
            className="btn btn-primary w-full"
            aria-label="Get started with Weight Loss Progress Lab"
          >
            Get Started
          </Link>

          <Link
            href="/dashboard"
            className="btn btn-secondary w-full"
            aria-label="View dashboard"
          >
            View Dashboard
          </Link>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground">
          <p>Mobile-first • Accessible • Privacy-focused</p>
        </div>
      </div>
    </main>
  )
}