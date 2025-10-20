// Mission Card Component
// PRD Reference: retention_loop_system (PRD v1.3.7)
// Displays individual mission information

'use client';

import { CheckCircleIcon, ClockIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { formatTimestamp } from '@/lib/timestamp';
import type { UserMission } from '@/schemas/firestore/missions';

interface MissionCardProps {
  mission: UserMission;
  onComplete?: (missionId: string) => void;
}

export default function MissionCard({ mission, onComplete }: MissionCardProps) {
  const progress = mission.progress || 0;
  const target = mission.targetProgress || 100;
  const progressPercent = Math.min((progress / target) * 100, 100);
  const isCompleted = mission.status === 'completed';
  const isActive = mission.status === 'active';
  const missionId = mission.id || mission.missionId;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-success-light text-success-dark';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-error-light text-error-dark';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <div className={`border rounded-lg p-5 transition-all hover:shadow-md ${
      isCompleted ? 'bg-success-light border-success' : 'bg-white border-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <span>{mission.title}</span>
            {isCompleted && <CheckCircleIcon className="h-5 w-5 text-success-dark" />}
          </h3>
          {mission.description && (
            <p className="text-sm text-muted-foreground mt-1">{mission.description}</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-3 mb-4">
        {mission.difficulty && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(mission.difficulty)}`}>
            {mission.difficulty}
          </span>
        )}
        {mission.xpReward && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <TrophyIcon className="h-3 w-3 mr-1" />
            {mission.xpReward} XP
          </span>
        )}
        {mission.expiresAt && !isCompleted && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Expires {formatTimestamp(mission.expiresAt)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {!isCompleted && target > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <span className="text-sm text-muted-foreground">{progress} / {target}</span>
          </div>
          <div className="w-full bg-muted-dark rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      {isActive && onComplete && progressPercent >= 100 && (
        <button
          onClick={() => onComplete(missionId)}
          className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          Complete Mission
        </button>
      )}

      {isCompleted && mission.completedAt && (
        <div className="text-sm text-success-dark font-medium">
          ✓ Completed {formatTimestamp(mission.completedAt)}
        </div>
      )}
    </div>
  );
}
