// useMissions Hook
// PRD Reference: retention_loop_system, social_retention_and_group_missions (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § retention_loop_system

import useSWR from 'swr';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import type { UserMission, MissionHistory, SeasonalChallenge } from '@/schemas/firestore/missions';
import type { GroupMission } from '@/schemas/firestore/groups';

export interface MissionsData {
  active: UserMission[];
  completed: MissionHistory[];
  seasonal: SeasonalChallenge | null;
  groupMissions: GroupMission[];
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch all missions for a user
 */
async function fetchMissionsData(userId: string): Promise<Omit<MissionsData, 'loading' | 'error'>> {
  try {
    // Fetch active missions
    const activeMissionsSnap = await getDocs(
      collection(db, `users/${userId}/missions_active`)
    );
    const active = activeMissionsSnap.docs.map((doc) => ({
      ...doc.data(),
      missionId: doc.id,
    })) as UserMission[];

    // Fetch recent completed missions
    const completedQuery = query(
      collection(db, `users/${userId}/missions_history`),
      orderBy('completedAt', 'desc'),
      limit(5)
    );
    const completedSnap = await getDocs(completedQuery);
    const completed = completedSnap.docs.map((doc) => doc.data()) as MissionHistory[];

    // Fetch active seasonal challenge (if any)
    const seasonalQuery = query(
      collection(db, 'seasonal_challenges'),
      where('status', '==', 'active'),
      limit(1)
    );
    const seasonalSnap = await getDocs(seasonalQuery);
    const seasonal = seasonalSnap.empty
      ? null
      : (seasonalSnap.docs[0].data() as SeasonalChallenge);

    // TODO: Fetch group missions for user's groups
    // For now, return empty array - requires group membership query
    const groupMissions: GroupMission[] = [];

    return {
      active,
      completed,
      seasonal,
      groupMissions,
    };
  } catch (error) {
    console.error('[useMissions] Error fetching missions:', error);
    throw error;
  }
}

/**
 * React hook for missions data
 *
 * @param userId - User ID
 * @param refreshInterval - Auto-refresh interval in ms (default: 60s)
 * @returns Missions data with loading/error states
 */
export function useMissions(
  userId: string | null,
  refreshInterval = 60000
): MissionsData {
  const { data, error, isLoading } = useSWR(
    userId ? `missions-${userId}` : null,
    () => fetchMissionsData(userId!),
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  );

  return {
    active: data?.active || [],
    completed: data?.completed || [],
    seasonal: data?.seasonal || null,
    groupMissions: data?.groupMissions || [],
    loading: isLoading,
    error: error || null,
  };
}

/**
 * Helper: Calculate overall mission progress
 */
export function calculateMissionProgress(missionsData: MissionsData): number {
  const { active } = missionsData;
  if (active.length === 0) return 0;

  const totalProgress = active.reduce(
    (sum, mission) => sum + (mission.progress / mission.targetValue),
    0
  );

  return Math.round((totalProgress / active.length) * 100);
}

/**
 * Helper: Get missions expiring soon (within 24 hours)
 */
export function getExpiringSoonMissions(missionsData: MissionsData): UserMission[] {
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  return missionsData.active.filter((mission) => {
    const expiresAt = new Date(mission.expiresAt.seconds * 1000);
    return expiresAt <= tomorrow && mission.status === 'active';
  });
}
