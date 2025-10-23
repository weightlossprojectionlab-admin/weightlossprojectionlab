'use client'

import type { MissionProgress } from '@/hooks/useMissions'

export interface MissionCardProps {
  mission: MissionProgress
}

/**
 * Display individual mission with progress, XP reward, and badge
 */
export function MissionCard({ mission }: MissionCardProps) {
  const progressPercentage = Math.round((mission.progress / mission.criteria.target) * 100)
  const isComplete = mission.completed

  // Difficulty colors
  const difficultyColors = {
    easy: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    hard: 'text-red-600 bg-red-50'
  }

  // Rarity colors for badges
  const rarityColors = {
    common: 'text-gray-600',
    rare: 'text-blue-600',
    epic: 'text-purple-600',
    legendary: 'text-orange-600'
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg p-4 border-2 transition-all ${
      isComplete ? 'border-green-500 bg-green-50' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${isComplete ? 'text-green-700' : 'text-gray-900 dark:text-gray-100'}`}>
              {mission.title}
            </h3>
            {isComplete && (
              <span className="text-green-600 text-lg">✓</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{mission.description}</p>
        </div>

        {/* XP Reward */}
        <div className="ml-4 flex flex-col items-center">
          <div className="bg-purple-100 dark:bg-purple-900/20 text-primary font-bold text-sm px-3 py-1 rounded-full">
            +{mission.xpReward} XP
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${difficultyColors[mission.difficulty]}`}>
            {mission.difficulty}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            Progress: {mission.progress} / {mission.criteria.target}
          </span>
          <span className="font-medium text-primary">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Badge Reward */}
      {mission.badgeReward && (
        <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
          isComplete ? 'bg-white dark:bg-gray-900 border border-green-300' : 'bg-indigo-100 dark:bg-indigo-900/20'
        }`}>
          <span className="text-2xl">{mission.badgeReward.icon}</span>
          <div className="flex-1">
            <p className={`font-medium ${rarityColors[mission.badgeReward.rarity]}`}>
              {mission.badgeReward.name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{mission.badgeReward.description}</p>
          </div>
          {isComplete && (
            <span className="text-green-600 font-semibold text-xs">UNLOCKED!</span>
          )}
        </div>
      )}

      {/* Completion Status */}
      {isComplete && mission.completedAt && (
        <div className="mt-3 text-center text-sm text-green-600 font-medium">
          Completed {new Date(mission.completedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

/**
 * Mission list with all active missions
 */
export interface MissionListProps {
  missions: MissionProgress[]
  loading?: boolean
}

export function MissionList({ missions, loading }: MissionListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-4 border animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  if (missions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        <p>No missions available this week</p>
        <p className="text-sm mt-1">Check back on Monday for new missions!</p>
      </div>
    )
  }

  // Sort: incomplete missions first, then by difficulty
  const sortedMissions = [...missions].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 }
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
  })

  return (
    <div className="space-y-4">
      {sortedMissions.map((mission) => (
        <MissionCard key={mission.id} mission={mission} />
      ))}
    </div>
  )
}
