/**
 * Coaching Readiness System
 * PRD: coaching_readiness_system
 *
 * Analyzes user progress and determines eligibility for AI and human coaching
 */

import { adminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CoachingStatus, EligibilityReason, WeightLog } from '../../schemas/firestore';
import { PRD_REFS } from '../../lib/prdRefs';

// PRD: coaching_readiness_system.eligibility.consistency_unlock
const CONSISTENCY_REQUIREMENTS = {
  MIN_STREAK_DAYS: 14,
  MIN_WEIGHT_LOGS: 10,
  MIN_ADHERENCE: 0.8,
};

// PRD: coaching_readiness_system.eligibility.plateau_unlock
const PLATEAU_REQUIREMENTS = {
  MIN_DAYS_NO_CHANGE: 21,
  MIN_ADHERENCE: 0.8,
  WEIGHT_CHANGE_THRESHOLD: 0.01, // 1% threshold
};

// PRD: coaching_readiness_system.eligibility.goal_struggle_unlock
const GOAL_STRUGGLE_REQUIREMENTS = {
  MIN_FAILED_MISSIONS: 2,
  MIN_ENGAGEMENT: 0.75,
};

// PRD: coaching_readiness_system.ai_coach_stage_1
const AI_COACH_DURATION_DAYS = 7;

/**
 * Nightly cron job to analyze user progress and update coaching eligibility
 * Schedule: 02:00 local time daily
 * PRD: coaching_readiness_system.nightly_analysis
 */
export async function analyzeUserProgress(uid: string): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const coachingStatusRef = userRef.collection('coachingStatus').doc('current');

    // Fetch user data
    const [streakData, weightLogs, adherenceData, missionData] = await Promise.all([
      getUserStreak(uid),
      getUserWeightLogs(uid),
      getUserAdherence(uid),
      getUserMissionStats(uid),
    ]);

    // Calculate eligibility
    const eligibility = calculateEligibility(
      streakData,
      weightLogs,
      adherenceData,
      missionData
    );

    // Update coaching status
    const statusUpdate: Partial<CoachingStatus> = {
      eligible: eligibility.eligible,
      eligibleReason: eligibility.reason,
      streakDays: streakData.currentStreak,
      adherence: adherenceData.adherence,
      weightLogCount: weightLogs.length,
      lastAnalyzedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await coachingStatusRef.set(statusUpdate, { merge: true });

    // Auto-unlock coaching if eligible and not already active
    if (eligibility.eligible) {
      await unlockCoachingIfEligible(uid);
    }
  } catch (error) {
    console.error(`Error analyzing user progress for ${uid}:`, error);
    throw error;
  }
}

/**
 * Calculate coaching eligibility based on multiple criteria
 * PRD: coaching_readiness_system.eligibility
 */
function calculateEligibility(
  streakData: { currentStreak: number },
  weightLogs: WeightLog[],
  adherenceData: { adherence: number },
  missionData: { failedCount: number; engagementScore: number }
): { eligible: boolean; reason: EligibilityReason } {
  // Check consistency unlock
  // PRD: coaching_readiness_system.eligibility.consistency_unlock
  if (
    streakData.currentStreak >= CONSISTENCY_REQUIREMENTS.MIN_STREAK_DAYS &&
    weightLogs.length >= CONSISTENCY_REQUIREMENTS.MIN_WEIGHT_LOGS &&
    adherenceData.adherence >= CONSISTENCY_REQUIREMENTS.MIN_ADHERENCE
  ) {
    return { eligible: true, reason: 'consistency' };
  }

  // Check plateau unlock
  // PRD: coaching_readiness_system.eligibility.plateau_unlock
  const plateauDetected = detectPlateau(weightLogs);
  if (
    plateauDetected &&
    adherenceData.adherence >= PLATEAU_REQUIREMENTS.MIN_ADHERENCE
  ) {
    return { eligible: true, reason: 'plateau' };
  }

  // Check goal struggle unlock
  // PRD: coaching_readiness_system.eligibility.goal_struggle_unlock
  if (
    missionData.failedCount >= GOAL_STRUGGLE_REQUIREMENTS.MIN_FAILED_MISSIONS &&
    missionData.engagementScore >= GOAL_STRUGGLE_REQUIREMENTS.MIN_ENGAGEMENT
  ) {
    return { eligible: true, reason: 'goal_struggle' };
  }

  return { eligible: false, reason: 'none' };
}

/**
 * Detect weight plateau (no significant change for 21+ days)
 * PRD: coaching_readiness_system.eligibility.plateau_unlock
 */
function detectPlateau(weightLogs: WeightLog[]): boolean {
  if (weightLogs.length < 2) return false;

  // Sort by timestamp (most recent first)
  const sortedLogs = [...weightLogs].sort((a, b) => {
    const aTime = a.loggedAt instanceof Date ? a.loggedAt.getTime() : (a.loggedAt as any).toMillis();
    const bTime = b.loggedAt instanceof Date ? b.loggedAt.getTime() : (b.loggedAt as any).toMillis();
    return bTime - aTime;
  });

  // Get logs from last 21 days
  const now = Date.now();
  const twentyOneDaysAgo = now - 21 * 24 * 60 * 60 * 1000;
  const recentLogs = sortedLogs.filter(log => {
    const logTime = log.loggedAt instanceof Date ? log.loggedAt.getTime() : (log.loggedAt as any).toMillis();
    return logTime >= twentyOneDaysAgo;
  });

  if (recentLogs.length < 3) return false;

  // Check if weight change is less than threshold
  const firstWeight = recentLogs[recentLogs.length - 1].weight;
  const lastWeight = recentLogs[0].weight;
  const percentChange = Math.abs((lastWeight - firstWeight) / firstWeight);

  return percentChange < PLATEAU_REQUIREMENTS.WEIGHT_CHANGE_THRESHOLD;
}

/**
 * Unlock coaching if eligible and not already active
 * PRD: coaching_readiness_system.ai_coach_stage_1
 */
export async function unlockCoachingIfEligible(uid: string): Promise<void> {
  const coachingStatusRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('coachingStatus')
    .doc('current');

  const statusDoc = await coachingStatusRef.get();
  const status = statusDoc.data() as CoachingStatus | undefined;

  if (!status || !status.eligible || status.aiCoachActive) {
    return; // Not eligible or already active
  }

  // Start AI coach stage 1
  await startAICoachPlan(uid);
}

/**
 * Start AI Coach Plan (Stage 1)
 * PRD: coaching_readiness_system.ai_coach_stage_1
 */
export async function startAICoachPlan(uid: string): Promise<void> {
  const batch = adminDb.batch();

  const coachingStatusRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('coachingStatus')
    .doc('current');

  const aiCoachPlanRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('aiCoachPlan')
    .doc('current');

  // Update coaching status
  batch.set(
    coachingStatusRef,
    {
      aiCoachActive: true,
      aiCoachStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Create AI coach plan (will be populated by ai_coach.ts)
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + AI_COACH_DURATION_DAYS);

  batch.set(aiCoachPlanRef, {
    planId: `plan_${uid}_${Date.now()}`,
    focusAreas: ['nutrition', 'activity', 'mindset'], // Default, will be personalized
    readinessLevel: 5, // Default mid-range
    fatigueLevel: 0.0,
    startDate: FieldValue.serverTimestamp(),
    endDate: reviewDate,
    nextReviewAt: reviewDate,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Review AI Coach outcome after 7 days
 * PRD: coaching_readiness_system.human_coach_unlock
 */
export async function reviewAICoachOutcome(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  const telemetrySnapshot = await userRef.collection('coachTelemetry').get();

  if (telemetrySnapshot.empty) {
    console.warn(`No telemetry data for user ${uid}`);
    return;
  }

  // Calculate engagement metrics
  let totalNudgesSent = 0;
  let totalNudgesActed = 0;
  let totalEngagement = 0;

  telemetrySnapshot.forEach(doc => {
    const data = doc.data();
    totalNudgesSent += data.nudgesSent || 0;
    totalNudgesActed += data.nudgesActed || 0;
    totalEngagement += data.engagementScore || 0;
  });

  const actionRate = totalNudgesSent > 0 ? totalNudgesActed / totalNudgesSent : 0;
  const avgEngagement = totalEngagement / telemetrySnapshot.size;

  // Unlock human coaching if engagement is high (>0.7 action rate or >0.8 engagement)
  // PRD: coaching_readiness_system.human_coach_unlock
  if (actionRate > 0.7 || avgEngagement > 0.8) {
    const coachingStatusRef = userRef.collection('coachingStatus').doc('current');
    await coachingStatusRef.set(
      {
        humanCoachEligible: true,
        humanCoachUnlockedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

// Helper functions to fetch user data

async function getUserStreak(uid: string): Promise<{ currentStreak: number }> {
  const statsDoc = await adminDb
    .collection('users')
    .doc(uid)
    .collection('stats')
    .doc('current')
    .get();

  return {
    currentStreak: statsDoc.exists ? statsDoc.data()?.currentStreak || 0 : 0,
  };
}

async function getUserWeightLogs(uid: string): Promise<WeightLog[]> {
  const logsSnapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('weightLogs')
    .orderBy('loggedAt', 'desc')
    .limit(100)
    .get();

  return logsSnapshot.docs.map(doc => ({ logId: doc.id, ...doc.data() } as WeightLog));
}

async function getUserAdherence(uid: string): Promise<{ adherence: number }> {
  // Calculate adherence as ratio of logged days in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const weightLogsSnapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('weightLogs')
    .where('loggedAt', '>=', thirtyDaysAgo)
    .get();

  const mealLogsSnapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('mealLogs')
    .where('loggedAt', '>=', thirtyDaysAgo)
    .get();

  const loggedDays = new Set<string>();
  weightLogsSnapshot.forEach(doc => {
    const date = doc.data().loggedAt.toDate().toISOString().split('T')[0];
    loggedDays.add(date);
  });
  mealLogsSnapshot.forEach(doc => {
    const date = doc.data().loggedAt.toDate().toISOString().split('T')[0];
    loggedDays.add(date);
  });

  const adherence = loggedDays.size / 30;
  return { adherence: Math.min(adherence, 1.0) };
}

async function getUserMissionStats(uid: string): Promise<{
  failedCount: number;
  engagementScore: number;
}> {
  const missionsSnapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('missions_history')
    .where('finalStatus', '==', 'failed')
    .limit(10)
    .get();

  const statsDoc = await adminDb
    .collection('users')
    .doc(uid)
    .collection('coachTelemetry')
    .orderBy('date', 'desc')
    .limit(7)
    .get();

  let totalEngagement = 0;
  statsDoc.forEach(doc => {
    totalEngagement += doc.data().engagementScore || 0;
  });

  const engagementScore = statsDoc.size > 0 ? totalEngagement / statsDoc.size : 0;

  return {
    failedCount: missionsSnapshot.size,
    engagementScore,
  };
}
