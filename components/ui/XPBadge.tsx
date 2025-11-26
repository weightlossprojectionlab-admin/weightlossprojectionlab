'use client'

import { memo } from 'react'
import type { UserGamification } from '@/lib/gamification'
import { getXPProgress, getXPForNextLevel } from '@/lib/gamification'
import type { Badge } from '@/lib/missions'

export interface XPBadgeProps {
  gamification: UserGamification
}

/**
 * Display user's level, XP, and progress to next level
 */
export const XPBadge = memo(function XPBadge({ gamification }: XPBadgeProps) {
  const xpProgress = getXPProgress(gamification.totalXP)
  const nextLevelXP = getXPForNextLevel(gamification.level)

  return (
    <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        {/* Level */}
        <div className="flex items-center gap-2">
          <div className="bg-card text-primary font-bold text-lg px-3 py-1 rounded-full">
            Lvl {gamification.level}
          </div>
          <div>
            <p className="text-xs opacity-80">Total XP</p>
            <p className="font-bold">{gamification.totalXP.toLocaleString()}</p>
          </div>
        </div>

        {/* Streak */}
        {gamification.currentStreak > 0 && (
          <div className="text-center">
            <div className="text-2xl mb-1">🔥</div>
            <p className="text-xs opacity-80">{gamification.currentStreak} day streak</p>
          </div>
        )}
      </div>

      {/* XP Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1 opacity-90">
          <span>Progress to Level {gamification.level + 1}</span>
          <span>{xpProgress.percentage}%</span>
        </div>
        <div className="w-full bg-primary-dark bg-opacity-50 rounded-full h-2">
          <div
            className="bg-card h-2 rounded-full transition-all duration-300"
            style={{ width: `${xpProgress.percentage}%` }}
          />
        </div>
        <p className="text-xs opacity-80 mt-1">
          {xpProgress.current.toLocaleString()} / {xpProgress.required.toLocaleString()} XP
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs mt-3 pt-3 border-t border-white border-opacity-20">
        <div>
          <p className="opacity-80">Missions</p>
          <p className="font-bold text-sm">{gamification.lifetimeMissionsCompleted}</p>
        </div>
        <div>
          <p className="opacity-80">Badges</p>
          <p className="font-bold text-sm">{gamification.badges.length}</p>
        </div>
      </div>
    </div>
  )
})


/**
 * Badge showcase grid
 */
export interface BadgeShowcaseProps {
  badges: Badge[]
  limit?: number
}

export function BadgeShowcase({ badges, limit }: BadgeShowcaseProps) {
  const displayBadges = limit ? badges.slice(0, limit) : badges

  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-background rounded-lg">
        <p className="text-2xl mb-2">🎖️</p>
        <p>No badges yet</p>
        <p className="text-sm mt-1">Complete missions to earn badges!</p>
      </div>
    )
  }

  // Rarity colors
  const rarityColors = {
    common: 'border-border dark:border-gray-600 bg-background',
    rare: 'border-blue-400 bg-secondary-light',
    epic: 'border-purple-400 bg-purple-50',
    legendary: 'border-orange-400 bg-orange-50'
  }

  // Sort by rarity (legendary first) and unlock date
  const sortedBadges = [...displayBadges].sort((a, b) => {
    const rarityOrder = { legendary: 1, epic: 2, rare: 3, common: 4 }
    const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity]
    if (rarityDiff !== 0) return rarityDiff

    // Sort by unlock date (newest first)
    if (a.unlockedAt && b.unlockedAt) {
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    }
    return 0
  })

  return (
    <div className="space-y-3">
      {sortedBadges.map((badge) => (
        <div
          key={badge.id}
          className={`border-2 rounded-lg p-3 transition-all hover:scale-102 ${rarityColors[badge.rarity]}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{badge.icon}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{badge.name}</h4>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
              {badge.unlockedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-card">
              {badge.rarity}
            </span>
          </div>
        </div>
      ))}

      {limit && badges.length > limit && (
        <p className="text-center text-sm text-muted-foreground">
          +{badges.length - limit} more {badges.length - limit === 1 ? 'badge' : 'badges'}
        </p>
      )}
    </div>
  )
}

/**
 * Compact XP indicator for navbar/header
 */
export interface CompactXPProps {
  level: number
  totalXP: number
}

export function CompactXP({ level, totalXP }: CompactXPProps) {
  return (
    <div className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-full text-sm font-medium">
      <span className="opacity-80">Lvl</span>
      <span className="font-bold">{level}</span>
      <span className="opacity-60">•</span>
      <span className="opacity-80">{totalXP.toLocaleString()} XP</span>
    </div>
  )
}
