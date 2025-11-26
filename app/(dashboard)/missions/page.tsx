// Missions Dashboard Page
// PRD Reference: retention_loop_system, social_retention_and_group_missions (PRD v1.3.7)

'use client';

import { useMissions } from '@/hooks/useMissions';
import { useAuth } from '@/hooks/useAuth';
import MissionProgress from '@/components/missions/MissionProgress';
import MissionsList from '@/components/missions/MissionsList';
import { logger } from '@/lib/logger'

export default function MissionsPage() {
  const { user } = useAuth();
  const missionsData = useMissions(user?.uid);

  if (missionsData.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-dark mx-auto mb-4" />
          <p className="text-muted-foreground">Loading missions...</p>
        </div>
      </div>
    );
  }

  if (missionsData.error) {
    return (
      <div className="p-6">
        <div className="bg-error-light border border-error rounded-lg p-4">
          <h2 className="text-error-dark font-semibold mb-2">Error Loading Missions</h2>
          <p className="text-error-dark">{missionsData.error}</p>
        </div>
      </div>
    );
  }

  const missions = missionsData.missions;

  // Calculate stats
  const activeMissions = missions.filter(m => !m.completed);
  const completedMissions = missions.filter(m => m.completed);
  const totalXP = completedMissions.reduce((sum, m) => sum + (m.xpReward || 0), 0);
  const currentLevel = Math.floor(totalXP / 1000) + 1; // Simple level calculation
  const currentStreak = 0; // TODO: Calculate from user activity

  const handleCompleteMission = async (missionId: string) => {
    // TODO: Implement mission completion logic
    logger.debug('Complete mission:', { missionId });
    // This would typically call a Firebase function or API endpoint
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Missions & Challenges</h1>

      {/* Progress Overview */}
      <div className="mb-6">
        <MissionProgress
          totalXP={totalXP}
          completedMissions={completedMissions.length}
          activeMissions={activeMissions.length}
          currentStreak={currentStreak}
          level={currentLevel}
        />
      </div>

      {/* Seasonal Challenges */}
      {/* TODO: Implement seasonal challenges */}

      {/* All Missions */}
      <div>
        <MissionsList
          missions={missions}
          onCompleteMission={handleCompleteMission}
          showFilters={true}
        />
      </div>

      {/* Mission History (Optional Section) */}
      {completedMissions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="space-y-2">
              {completedMissions.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">+{item.xpReward || 0} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
