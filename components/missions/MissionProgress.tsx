// Mission Progress Component
// PRD Reference: retention_loop_system (PRD v1.3.7)
// Displays overall mission progress statistics

'use client';

import { TrophyIcon, FireIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface MissionProgressProps {
  totalXP: number;
  completedMissions: number;
  activeMissions: number;
  currentStreak?: number;
  level?: number;
}

export default function MissionProgress({
  totalXP,
  completedMissions,
  activeMissions,
  currentStreak = 0,
  level = 1
}: MissionProgressProps) {
  const xpForNextLevel = level * 1000; // Simple progression: 1000 XP per level
  const xpInCurrentLevel = totalXP % xpForNextLevel;
  const progressToNextLevel = (xpInCurrentLevel / xpForNextLevel) * 100;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Mission Progress</h2>
          <p className="text-blue-100 text-sm mt-1">Keep up the great work!</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">Level {level}</div>
          <div className="text-xs text-blue-100">{totalXP.toLocaleString()} Total XP</div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress to Level {level + 1}</span>
          <span className="text-sm">{xpInCurrentLevel} / {xpForNextLevel} XP</span>
        </div>
        <div className="w-full bg-blue-800 bg-opacity-50 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${progressToNextLevel}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Completed Missions */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <CheckCircleIcon className="h-8 w-8 mb-2" />
            <div className="text-2xl font-bold">{completedMissions}</div>
            <div className="text-xs text-blue-100 mt-1">Completed</div>
          </div>
        </div>

        {/* Active Missions */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <TrophyIcon className="h-8 w-8 mb-2" />
            <div className="text-2xl font-bold">{activeMissions}</div>
            <div className="text-xs text-blue-100 mt-1">Active</div>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <FireIcon className="h-8 w-8 mb-2 text-orange-300" />
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-xs text-blue-100 mt-1">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="mt-6 text-center text-sm text-blue-100">
        {currentStreak >= 7 ? (
          <span>🔥 Amazing streak! You're on fire!</span>
        ) : completedMissions >= 10 ? (
          <span>⭐ You're a mission master!</span>
        ) : activeMissions > 0 ? (
          <span>💪 Keep pushing forward!</span>
        ) : (
          <span>🚀 Ready to start your mission journey?</span>
        )}
      </div>
    </div>
  );
}
