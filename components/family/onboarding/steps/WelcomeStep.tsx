'use client'

interface WelcomeStepProps {
  onGetStarted: () => void
}

export function WelcomeStep({ onGetStarted }: WelcomeStepProps) {
  return (
    <div className="space-y-6 text-center">
      {/* Hero Icon */}
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
          <span className="text-5xl">👋</span>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Welcome to the Family!
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Thank you for joining our care team. Let's set up your profile so we can coordinate care effectively.
        </p>
      </div>

      {/* Benefits List */}
      <div className="max-w-xl mx-auto space-y-4 text-left">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📋</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Coordinate Care</h3>
            <p className="text-sm text-muted-foreground">
              Stay updated on health activities, appointments, and important changes
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📅</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Set Your Schedule</h3>
            <p className="text-sm text-muted-foreground">
              Define your availability and preferences for notifications
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🔔</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Stay Connected</h3>
            <p className="text-sm text-muted-foreground">
              Receive personalized updates based on your role and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="pt-4">
        <p className="text-sm text-muted-foreground">
          This will take approximately 5-10 minutes to complete
        </p>
      </div>

      {/* Get Started Button */}
      <button
        onClick={onGetStarted}
        className="px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all transform hover:scale-105"
      >
        Get Started
      </button>
    </div>
  )
}
