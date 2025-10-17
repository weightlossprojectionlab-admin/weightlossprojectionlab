// Seasonal Challenges Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Displays seasonal challenges and events

'use client';

import { SparklesIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline';
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Seasonal Challenges</h3>
        <p className="text-sm text-gray-600">Check back for special seasonal events and challenges!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <SparklesIcon className="h-6 w-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900">Seasonal Challenges</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {challenges.map((challenge) => {
          const startDate = new Date(challenge.startDate);
          const endDate = new Date(challenge.endDate);
          const now = new Date();
          const isActive = now >= startDate && now <= endDate;
          const isUpcoming = now < startDate;
          const isEnded = now > endDate;

          const daysRemaining = isActive
            ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return (
            <div
              key={challenge.id}
              className={`border rounded-lg p-6 ${
                isActive
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
                  : isUpcoming
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{challenge.title}</h3>
                  {challenge.description && (
                    <p className="text-sm text-gray-600">{challenge.description}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : isUpcoming
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-400 text-white'
                  }`}
                >
                  {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Ended'}
                </span>
              </div>

              {/* Dates */}
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
                </div>
                {isActive && (
                  <span className="font-medium text-purple-700">
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                  </span>
                )}
              </div>

              {/* Rewards */}
              {challenge.rewards && (
                <div className="bg-white rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Rewards:</div>
                  <div className="flex flex-wrap gap-2">
                    {challenge.rewards.xp && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {challenge.rewards.xp} XP
                      </span>
                    )}
                    {challenge.rewards.badge && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        🏆 {challenge.rewards.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Participants */}
              {challenge.participantCount !== undefined && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                  <UsersIcon className="h-4 w-4" />
                  <span>{challenge.participantCount.toLocaleString()} participants</span>
                </div>
              )}

              {/* Action Button */}
              {isActive && onJoinChallenge && (
                <button
                  onClick={() => onJoinChallenge(challenge.id)}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Join Challenge
                </button>
              )}

              {isUpcoming && (
                <div className="text-center text-sm text-blue-700 font-medium py-2">
                  Coming Soon!
                </div>
              )}

              {isEnded && (
                <div className="text-center text-sm text-gray-500 font-medium py-2">
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
