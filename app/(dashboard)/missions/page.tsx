// Missions Dashboard Page
// PRD Reference: retention_loop_system, social_retention_and_group_missions (PRD v1.3.7)

'use client';

import { useMissions } from '@/hooks/useMissions';
import { useAuth } from '@/hooks/useAuth';
import MissionProgress from '@/components/missions/MissionProgress';
import MissionsList from '@/components/missions/MissionsList';
import SeasonalChallenges from '@/components/missions/SeasonalChallenges';

export default function MissionsPage() {
  const { user } = useAuth();
  const missionsData = useMissions(user?.uid || null);

  if (missionsData.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-dark mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading missions...</p>
        </div>
      </div>
    );
  }

  if (missionsData.error) {
    return (
      <div className="p-6">
        <div className="bg-error-light border border-error rounded-lg p-4">
          <h2 className="text-error-dark font-semibold mb-2">Error Loading Missions</h2>
          <p className="text-error-dark">{missionsData.error.message}</p>
        </div>
      </div>
    );
  }

  const { active: missions, completed: history, seasonal: seasonalChallenges } = missionsData;

  // Calculate stats
  const activeMissions = missions.filter(m => m.status === 'active');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const totalXP = history?.reduce((sum, h) => sum + (h.xpReward || 0), 0) || 0;
  const currentLevel = Math.floor(totalXP / 1000) + 1; // Simple level calculation
  const currentStreak = 0; // TODO: Calculate from user activity

  const handleCompleteMission = async (missionId: string) => {
    // TODO: Implement mission completion logic
    console.log('Complete mission:', missionId);
    // This would typically call a Firebase function or API endpoint
  };

  const handleJoinChallenge = async (challengeId: string) => {
    // TODO: Implement challenge join logic
    console.log('Join challenge:', challengeId);
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
      {seasonalChallenges && (
        <div className="mb-6">
          <SeasonalChallenges
            challenges={[seasonalChallenges]}
            onJoinChallenge={handleJoinChallenge}
          />
        </div>
      )}

      {/* All Missions */}
      <div>
        <MissionsList
          missions={missions}
          onCompleteMission={handleCompleteMission}
          showFilters={true}
        />
      </div>

      {/* Mission History (Optional Section) */}
      {history && history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg p-4">
            <div className="space-y-2">
              {history.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.completedAt ? new Date((item.completedAt as any).seconds * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-600">+{item.xpReward} XP</p>
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
