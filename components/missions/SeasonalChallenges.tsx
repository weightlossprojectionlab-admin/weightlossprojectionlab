// Seasonal Challenges Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Displays seasonal challenges and events

'use client';

import { SparklesIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline';
import { timestampToDate, formatTimestamp } from '@/lib/timestamp';
import type { SeasonalChallenge } from '@/schemas/firestore/missions';

interface SeasonalChallengesProps {
  challenges: SeasonalChallenge[];
  onJoinChallenge?: (challengeId: string) => void;
}

export default function SeasonalChallenges({ challenges, onJoinChallenge }: SeasonalChallengesProps) {
  if (challenges.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-8 text-center">
        <SparklesIcon className="h-12 w-12 text-purple-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Active Seasonal Challenges</h3>
        <p className="text-sm text-muted-foreground">Check back for special seasonal events and challenges!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <SparklesIcon className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Seasonal Challenges</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {challenges.map((challenge) => {
          const startDate = timestampToDate(challenge.startDate);
          const endDate = timestampToDate(challenge.endDate);
          const now = new Date();
          const isActive = now >= startDate && now <= endDate;
          const isUpcoming = now < startDate;
          const isEnded = now > endDate;
          const challengeId = challenge.id || challenge.seasonId;

          const daysRemaining = isActive
            ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return (
            <div
              key={challengeId}
              className={`border rounded-lg p-6 ${
                isActive
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
                  : isUpcoming
                  ? 'bg-indigo-100 dark:bg-indigo-900/20 border-accent'
                  : 'bg-muted border-border'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">{challenge.title || challenge.name}</h3>
                  {challenge.description && (
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-primary text-white'
                      : isUpcoming
                      ? 'bg-primary text-white'
                      : 'bg-gray-100-foreground text-white'
                  }`}
                >
                  {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Ended'}
                </span>
              </div>

              {/* Dates */}
              <div className="flex items-center space-x-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatTimestamp(challenge.startDate)} - {formatTimestamp(challenge.endDate)}</span>
                </div>
                {isActive && (
                  <span className="font-medium text-primary-dark">
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                  </span>
                )}
              </div>

              {/* Rewards */}
              {challenge.rewards && (
                <div className="bg-card rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-foreground mb-2">Rewards:</div>
                  <div className="flex flex-wrap gap-2">
                    {challenge.rewards.xp && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light dark:bg-purple-900/20 text-purple-800">
                        {challenge.rewards.xp} XP
                      </span>
                    )}
                    {challenge.rewards.badge && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-warning-dark">
                        🏆 {challenge.rewards.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Participants */}
              {challenge.participantCount !== undefined && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                  <UsersIcon className="h-4 w-4" />
                  <span>{challenge.participantCount.toLocaleString()} participants</span>
                </div>
              )}

              {/* Action Button */}
              {isActive && onJoinChallenge && (
                <button
                  onClick={() => onJoinChallenge(challengeId)}
                  className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors"
                >
                  Join Challenge
                </button>
              )}

              {isUpcoming && (
                <div className="text-center text-sm text-accent-dark font-medium py-2">
                  Coming Soon!
                </div>
              )}

              {isEnded && (
                <div className="text-center text-sm text-muted-foreground font-medium py-2">
                  Challenge Ended
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
