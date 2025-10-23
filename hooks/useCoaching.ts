// useCoaching Hook
// PRD Reference: coaching_readiness_system, aisa_motivational_coaching (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § coaching_readiness_system

import useSWR from 'swr';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { timestampToDate } from '@/lib/timestamp';
import type { CoachingStatus, AICoachPlan } from '@/schemas/firestore/users';
import type { NudgeQueue } from '@/schemas/firestore/users';

export interface CoachingData {
  status: CoachingStatus | null;
  aiCoachPlan: AICoachPlan | null;
  progress: {
    actionRate: number;
    engagementScore: number;
    daysRemaining: number;
  } | null;
  actions: NudgeQueue[];
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch coaching data for a user
 * Includes: status, AI coach plan, progress, and pending actions
 */
async function fetchCoachingData(userId: string): Promise<Omit<CoachingData, 'loading' | 'error'>> {
  try {
    // Fetch coaching status
    const statusRef = doc(db, `users/${userId}/coachingStatus/current`);
    const statusSnap = await getDoc(statusRef);
    const status = statusSnap.exists() ? (statusSnap.data() as CoachingStatus) : null;

    // Fetch AI coach plan
    const planRef = doc(db, `users/${userId}/aiCoachPlan/current`);
    const planSnap = await getDoc(planRef);
    const aiCoachPlan = planSnap.exists() ? (planSnap.data() as AICoachPlan) : null;

    // Calculate progress if plan exists
    let progress = null;
    // TODO: Add status and actions properties to AICoachPlan schema
    // if (aiCoachPlan && aiCoachPlan.status === 'active') {
    if (aiCoachPlan) {
      // const completedActions = aiCoachPlan.actions.filter((a) => a.completed).length;
      // const totalActions = aiCoachPlan.actions.length;
      const actionRate = 0; // totalActions > 0 ? completedActions / totalActions : 0;

      const startDate = timestampToDate(aiCoachPlan.startDate);
      const endDate = timestampToDate(aiCoachPlan.endDate);
      const today = new Date();
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

      progress = {
        actionRate,
        engagementScore: 0, // aiCoachPlan.engagementScore || 0,
        daysRemaining,
      };
    }

    // Fetch pending nudges/actions
    const actionsQuery = query(
      collection(db, `users/${userId}/nudgeQueue`),
      where('status', '==', 'pending'),
      orderBy('scheduledFor', 'asc'),
      limit(10)
    );
    const actionsSnap = await getDocs(actionsQuery);
    const actions = actionsSnap.docs.map((doc) => doc.data() as NudgeQueue);

    return {
      status,
      aiCoachPlan,
      progress,
      actions,
    };
  } catch (error) {
    console.error('[useCoaching] Error fetching coaching data:', error);
    throw error;
  }
}

/**
 * React hook for coaching data
 *
 * @param userId - User ID
 * @param refreshInterval - Auto-refresh interval in ms (default: 30s)
 * @returns Coaching data with loading/error states
 */
export function useCoaching(
  userId: string | undefined,
  refreshInterval = 30000
): CoachingData {
  const { data, error, isLoading } = useSWR(
    userId ? `coaching-${userId}` : null,
    () => fetchCoachingData(userId!),
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  );

  return {
    status: data?.status || null,
    aiCoachPlan: data?.aiCoachPlan || null,
    progress: data?.progress || null,
    actions: data?.actions || [],
    loading: isLoading,
    error: error || null,
  };
}

/**
 * Helper: Check if user is eligible for coaching
 */
export function isEligibleForCoaching(coachingData: CoachingData): boolean {
  return coachingData.status?.eligible === true;
}

/**
 * Helper: Check if AI coach is active
 */
export function hasActiveAICoach(coachingData: CoachingData): boolean {
  // TODO: Add status property to AICoachPlan schema
  return !!coachingData.aiCoachPlan; // return coachingData.aiCoachPlan?.status === 'active';
}
