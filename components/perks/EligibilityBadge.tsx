// Eligibility Badge Component
// PRD Reference: Sponsor Perks System (PRD v1.3.7)
// Displays user's XP and perk eligibility status

'use client';

import { SparklesIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface EligibilityBadgeProps {
  currentXP: number;
  requiredXP: number;
  isEligible?: boolean;
  compact?: boolean;
}

export default function EligibilityBadge({
  currentXP,
  requiredXP,
  isEligible = false,
  compact = false
}: EligibilityBadgeProps) {
  const progressPercent = Math.min((currentXP / requiredXP) * 100, 100);
  const xpNeeded = Math.max(requiredXP - currentXP, 0);

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isEligible
          ? 'bg-success-light text-success-dark'
          : 'bg-muted text-foreground'
      }`}>
        {isEligible ? (
          <>
            <SparklesIcon className="h-4 w-4" />
            <span>Eligible</span>
          </>
        ) : (
          <>
            <LockClosedIcon className="h-4 w-4" />
            <span>{xpNeeded.toLocaleString()} XP needed</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      isEligible
        ? 'bg-gradient-to-br from-success-light to-emerald-50 border-success'
        : 'bg-muted border-border'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isEligible ? (
            <SparklesIcon className="h-6 w-6 text-success-dark" />
          ) : (
            <LockClosedIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <h4 className="font-semibold text-foreground">
            {isEligible ? 'You\'re Eligible!' : 'Unlock Perks'}
          </h4>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-foreground">
            {currentXP.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">XP</div>
        </div>
      </div>

      {/* Progress Bar */}
      {!isEligible && (
        <>
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress to {requiredXP.toLocaleString()} XP</span>
              <span className="text-foreground font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-muted-dark rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Earn {xpNeeded.toLocaleString()} more XP to unlock sponsor perks
          </p>
        </>
      )}

      {/* Eligible Message */}
      {isEligible && (
        <p className="text-sm text-success-dark">
          You've unlocked sponsor perks! Check out available rewards below.
        </p>
      )}
    </div>
  );
}
