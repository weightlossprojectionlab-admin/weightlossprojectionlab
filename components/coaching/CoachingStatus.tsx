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
      <div className="bg-muted border border-border rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Coaching Status</h3>
            <p className="text-sm text-muted-foreground">Loading your coaching information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 ${
      hasActiveCoach ? 'bg-success-light border-success' : 'bg-indigo-100 dark:bg-indigo-900/20 border-accent'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {hasActiveCoach ? (
            <CheckCircleIcon className="h-8 w-8 text-success-dark" />
          ) : isEligible ? (
            <CheckCircleIcon className="h-8 w-8 text-accent-dark" />
          ) : (
            <XCircleIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-foreground">Coaching Status</h3>
            <p className="text-sm text-muted-foreground mt-1">
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
            <div className="text-2xl font-bold text-foreground">{status.eligibilityScore}</div>
            <div className="text-xs text-muted-foreground">Readiness Score</div>
          </div>
        )}
      </div>

      {/* Readiness Signals */}
      {status.readinessSignals && status.readinessSignals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Readiness Signals</h4>
          <div className="flex flex-wrap gap-2">
            {status.readinessSignals.map((signal, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/20 text-accent-dark"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last Coach Interaction */}
      {status.lastCoachInteraction && (
        <div className="mt-3 text-sm text-muted-foreground">
          Last interaction: {formatTimestamp(status.lastCoachInteraction)}
        </div>
      )}

      {/* Call to Action */}
      {isEligible && !hasActiveCoach && (
        <div className="mt-4">
          <button className="w-full bg-accent-dark text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-dark transition-colors">
            Activate AI Coach
          </button>
        </div>
      )}
    </div>
  );
}
