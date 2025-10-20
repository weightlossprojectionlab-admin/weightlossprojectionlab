// Coaching Progress Component
// PRD Reference: coaching_readiness_system (PRD v1.3.7)
// Displays user's progress with AI coaching

'use client';

import { TrophyIcon, FireIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import type { CoachingStatus } from '@/schemas/firestore/users';

interface CoachingProgressProps {
  status: CoachingStatus | null;
  weeklyCompletionRate?: number;
  totalInteractions?: number;
}

export default function CoachingProgress({
  status,
  weeklyCompletionRate = 0,
  totalInteractions = 0
}: CoachingProgressProps) {
  if (!status) {
    return null;
  }

  const eligibilityScore = status.eligibilityScore || 0;
  const readinessSignals = status.readinessSignals || [];

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-6">Your Progress</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Readiness Score */}
        <div className="bg-gradient-to-br from-accent-light to-accent-light rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent-dark font-medium">Readiness</p>
              <p className="text-3xl font-bold text-accent-dark mt-1">{eligibilityScore}</p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-accent-dark opacity-50" />
          </div>
        </div>

        {/* Weekly Completion */}
        <div className="bg-gradient-to-br from-success-light to-success-light rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-success-dark font-medium">This Week</p>
              <p className="text-3xl font-bold text-success-dark mt-1">{Math.round(weeklyCompletionRate)}%</p>
            </div>
            <TrophyIcon className="h-10 w-10 text-success-dark opacity-50" />
          </div>
        </div>

        {/* Total Interactions */}
        <div className="bg-gradient-to-br from-primary-light to-primary-light rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary font-medium">Check-ins</p>
              <p className="text-3xl font-bold text-primary mt-1">{totalInteractions}</p>
            </div>
            <FireIcon className="h-10 w-10 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Readiness Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Readiness Level</span>
          <span className="text-sm text-muted-foreground">{eligibilityScore}/100</span>
        </div>
        <div className="w-full bg-muted-dark rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              eligibilityScore >= 75 ? 'bg-success' :
              eligibilityScore >= 50 ? 'bg-accent-dark' :
              'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(eligibilityScore, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {eligibilityScore >= 75
            ? 'Great! You\'re ready for advanced coaching'
            : eligibilityScore >= 50
            ? 'Keep going! You\'re making good progress'
            : 'Build momentum with consistent check-ins'}
        </p>
      </div>

      {/* Active Signals */}
      {readinessSignals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Active Signals</h4>
          <div className="space-y-2">
            {readinessSignals.slice(0, 5).map((signal, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm text-foreground">{signal}</span>
              </div>
            ))}
          </div>
          {readinessSignals.length > 5 && (
            <p className="text-xs text-muted-foreground mt-2">
              +{readinessSignals.length - 5} more signals
            </p>
          )}
        </div>
      )}
    </div>
  );
}
