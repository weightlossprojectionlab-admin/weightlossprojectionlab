// Coaching Status Component
// PRD Reference: coaching_readiness_system (PRD v1.3.7)
// Displays user's coaching eligibility and current status

'use client';

import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { CoachingStatus as CoachingStatusType } from '@/schemas/firestore/users';
import { formatTimestamp } from '@/lib/timestamp';

interface CoachingStatusProps {
  status: CoachingStatusType | null;
  isEligible: boolean;
  hasActiveCoach: boolean;
}

export default function CoachingStatus({ status, isEligible, hasActiveCoach }: CoachingStatusProps) {
  if (!status) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-8 w-8 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Coaching Status</h3>
            <p className="text-sm text-gray-600">Loading your coaching information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 ${
      hasActiveCoach ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {hasActiveCoach ? (
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          ) : isEligible ? (
            <CheckCircleIcon className="h-8 w-8 text-blue-600" />
          ) : (
            <XCircleIcon className="h-8 w-8 text-gray-400" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Coaching Status</h3>
            <p className="text-sm text-gray-600 mt-1">
              {hasActiveCoach
                ? `Active AI Coach: ${status.activeAICoach || 'AISA'}`
                : isEligible
                ? 'Eligible for AI Coaching'
                : 'Not yet eligible for coaching'}
            </p>
          </div>
        </div>

        {status.eligibilityScore !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{status.eligibilityScore}</div>
            <div className="text-xs text-gray-500">Readiness Score</div>
          </div>
        )}
      </div>

      {/* Readiness Signals */}
      {status.readinessSignals && status.readinessSignals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Readiness Signals</h4>
          <div className="flex flex-wrap gap-2">
            {status.readinessSignals.map((signal, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last Coach Interaction */}
      {status.lastCoachInteraction && (
        <div className="mt-3 text-sm text-gray-600">
          Last interaction: {formatTimestamp(status.lastCoachInteraction)}
        </div>
      )}

      {/* Call to Action */}
      {isEligible && !hasActiveCoach && (
        <div className="mt-4">
          <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Activate AI Coach
          </button>
        </div>
      )}
    </div>
  );
}
