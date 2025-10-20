// Missions List Component
// PRD Reference: retention_loop_system (PRD v1.3.7)
// Displays list of user missions with filtering

'use client';

import { useState } from 'react';
import { timestampToDate } from '@/lib/timestamp';
import MissionCard from './MissionCard';
import type { UserMission } from '@/schemas/firestore/missions';

interface MissionsListProps {
  missions: UserMission[];
  onCompleteMission?: (missionId: string) => void;
  showFilters?: boolean;
}

export default function MissionsList({
  missions,
  onCompleteMission,
  showFilters = true
}: MissionsListProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'xp' | 'difficulty'>('recent');

  // Filter missions
  const filteredMissions = missions.filter(mission => {
    if (filter === 'all') return true;
    return mission.status === filter;
  });

  // Sort missions
  const sortedMissions = [...filteredMissions].sort((a, b) => {
    switch (sortBy) {
      case 'xp':
        return (b.xpReward || 0) - (a.xpReward || 0);
      case 'difficulty':
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        return (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0) -
               (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0);
      case 'recent':
      default:
        return timestampToDate(b.createdAt).getTime() - timestampToDate(a.createdAt).getTime();
    }
  });

  const activeMissionsCount = missions.filter(m => m.status === 'active').length;
  const completedMissionsCount = missions.filter(m => m.status === 'completed').length;

  if (missions.length === 0) {
    return (
      <div className="bg-white border border-border rounded-lg p-12 text-center">
        <div className="text-muted-foreground mb-3">
          <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Missions Yet</h3>
        <p className="text-sm text-muted-foreground">Check back soon for new missions to complete!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Stats */}
      {showFilters && (
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Stats */}
            <div className="flex items-center space-x-6">
              <div>
                <span className="text-2xl font-bold text-foreground">{activeMissionsCount}</span>
                <span className="text-sm text-muted-foreground ml-2">Active</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-success-dark">{completedMissionsCount}</span>
                <span className="text-sm text-muted-foreground ml-2">Completed</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted-dark'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'active'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted-dark'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted-dark'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="recent">Most Recent</option>
              <option value="xp">Highest XP</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>
        </div>
      )}

      {/* Missions Grid */}
      {sortedMissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedMissions.map((mission) => {
            const missionId = mission.id || mission.missionId;
            return (
              <MissionCard
                key={missionId}
                mission={mission}
                onComplete={onCompleteMission}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No missions found with the selected filter.</p>
        </div>
      )}
    </div>
  );
}
