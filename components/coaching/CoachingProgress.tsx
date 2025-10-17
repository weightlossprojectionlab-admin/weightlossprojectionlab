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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Your Progress</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Readiness Score */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Readiness</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{eligibilityScore}</p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-blue-600 opacity-50" />
          </div>
        </div>

        {/* Weekly Completion */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">This Week</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{Math.round(weeklyCompletionRate)}%</p>
            </div>
            <TrophyIcon className="h-10 w-10 text-green-600 opacity-50" />
          </div>
        </div>

        {/* Total Interactions */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Check-ins</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{totalInteractions}</p>
            </div>
            <FireIcon className="h-10 w-10 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Readiness Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Readiness Level</span>
          <span className="text-sm text-gray-600">{eligibilityScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              eligibilityScore >= 75 ? 'bg-green-500' :
              eligibilityScore >= 50 ? 'bg-blue-500' :
              'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(eligibilityScore, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
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
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Active Signals</h4>
          <div className="space-y-2">
            {readinessSignals.slice(0, 5).map((signal, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">{signal}</span>
              </div>
            ))}
          </div>
          {readinessSignals.length > 5 && (
            <p className="text-xs text-gray-500 mt-2">
              +{readinessSignals.length - 5} more signals
            </p>
          )}
        </div>
      )}
    </div>
  );
}
