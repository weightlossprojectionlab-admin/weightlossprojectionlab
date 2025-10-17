/**
 * AISA Motivational Coaching System
 * PRD: aisa_motivational_coaching
 *
 * Builds AI coach plans, schedules nudges, and optimizes engagement
 */

import { adminDb } from '../../lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  AICoachPlan,
  NudgeQueue,
  CoachTelemetry,
  UserProfile,
} from '../../schemas/firestore';
import { PRD_REFS } from '../../lib/prdRefs';

// PRD: aisa_motivational_coaching.nudge_delivery
const NUDGE_CONFIG = {
  MAX_DAILY_NUDGES: 2,
  DEFAULT_QUIET_START: 22, // 10 PM
  DEFAULT_QUIET_END: 7, // 7 AM
  FATIGUE_THRESHOLD: 0.6,
  WINDOW_HOURS: 4, // 4-hour delivery window
};

/**
 * Build weekly AI coach plan based on user progress and goals
 * Schedule: Monday 06:00 local time
 * PRD: aisa_motivational_coaching.weekly_ai_coach_plan
 */
export async function buildWeeklyAICoachPlan(uid: string): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid);

    // Check if AI coach is active
    const coachingStatus = await userRef
      .collection('coachingStatus')
      .doc('current')
      .get();

    if (!coachingStatus.exists || !coachingStatus.data()?.aiCoachActive) {
      return; // AI coach not active for this user
    }

    // Fetch user data for personalization
    const [telemetry, missions, weightLogs] = await Promise.all([
      getRecentTelemetry(uid, 7),
      getRecentMissions(uid),
      getRecentWeightLogs(uid, 14),
    ]);

    // Calculate readiness and fatigue
    const readinessLevel = calculateReadinessLevel(telemetry, missions);
    const fatigueLevel = calculateFatigueLevel(telemetry);

    // Determine focus areas based on user performance
    const focusAreas = determineFocusAreas(missions, weightLogs, telemetry);

    // Create new plan
    const planId = `plan_${uid}_${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const plan: AICoachPlan = {
      planId,
      focusAreas: focusAreas as [string, string, string],
      readinessLevel,
      fatigueLevel,
      startDate: FieldValue.serverTimestamp(),
      endDate: Timestamp.fromDate(endDate),
      nextReviewAt: Timestamp.fromDate(endDate),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.collection('aiCoachPlan').doc('current').set(plan);

    // Schedule nudges for the week
    await scheduleDailyNudges(uid, plan);
  } catch (error) {
    console.error(`Error building AI coach plan for ${uid}:`, error);
    throw error;
  }
}

/**
 * Schedule daily nudges based on AI coach plan
 * PRD: aisa_motivational_coaching.nudge_delivery
 */
export async function scheduleDailyNudges(
  uid: string,
  plan: AICoachPlan
): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);

  // Get user profile for timezone and quiet hours
  const profileDoc = await userRef.get();
  const profile = profileDoc.data() as UserProfile | undefined;

  const quietStart = profile?.quietHoursStart ?? NUDGE_CONFIG.DEFAULT_QUIET_START;
  const quietEnd = profile?.quietHoursEnd ?? NUDGE_CONFIG.DEFAULT_QUIET_END;
  const timezone = profile?.timezone ?? 'America/New_York';

  // Generate nudges for next 7 days
  const nudges: NudgeQueue[] = [];
  const startDate = new Date();

  for (let day = 0; day < 7; day++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + day);

    // Morning nudge (08:00-12:00)
    const morningWindow = calculateDeliveryWindow(
      targetDate,
      8,
      12,
      quietStart,
      quietEnd
    );
    if (morningWindow) {
      nudges.push(
        createNudge(
          uid,
          'motivational',
          plan.focusAreas[day % 3],
          morningWindow,
          'morning'
        )
      );
    }

    // Evening nudge (17:00-20:00)
    const eveningWindow = calculateDeliveryWindow(
      targetDate,
      17,
      20,
      quietStart,
      quietEnd
    );
    if (eveningWindow) {
      nudges.push(
        createNudge(
          uid,
          'educational',
          plan.focusAreas[(day + 1) % 3],
          eveningWindow,
          'evening'
        )
      );
    }
  }

  // Save nudges to queue
  const batch = adminDb.batch();
  nudges.forEach(nudge => {
    const nudgeRef = userRef.collection('nudgeQueue').doc(nudge.nudgeId);
    batch.set(nudgeRef, nudge);
  });

  await batch.commit();
}

/**
 * Deliver pending nudges (respects quiet hours and daily limit)
 * Schedule: Every 10 minutes
 * PRD: aisa_motivational_coaching.nudge_delivery
 */
export async function deliverNudges(): Promise<void> {
  try {
    const now = new Date();

    // Query pending nudges that are within delivery window
    const nudgesSnapshot = await adminDb
      .collectionGroup('nudgeQueue')
      .where('status', '==', 'pending')
      .where('windowStart', '<=', now)
      .where('windowEnd', '>=', now)
      .limit(100)
      .get();

    // Group nudges by user
    const nudgesByUser = new Map<string, any[]>();
    nudgesSnapshot.docs.forEach(doc => {
      const uid = doc.ref.parent.parent!.id;
      if (!nudgesByUser.has(uid)) {
        nudgesByUser.set(uid, []);
      }
      nudgesByUser.get(uid)!.push({ id: doc.id, ...doc.data() });
    });

    // Process each user's nudges
    for (const [uid, userNudges] of nudgesByUser) {
      await processUserNudges(uid, userNudges);
    }
  } catch (error) {
    console.error('Error delivering nudges:', error);
    throw error;
  }
}

/**
 * Process nudges for a single user (enforce limits and fatigue)
 * PRD: aisa_motivational_coaching.nudge_delivery
 */
async function processUserNudges(uid: string, nudges: any[]): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);

  // Check today's telemetry
  const today = new Date().toISOString().split('T')[0];
  const telemetryDoc = await userRef
    .collection('coachTelemetry')
    .doc(today)
    .get();

  const telemetry = telemetryDoc.exists
    ? (telemetryDoc.data() as CoachTelemetry)
    : {
        date: today,
        nudgesSent: 0,
        nudgesActed: 0,
        completionMap: {},
        fatigueScore: 0,
        engagementScore: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

  // Check daily limit
  // PRD: aisa_motivational_coaching.nudge_delivery.daily_limit
  if (telemetry.nudgesSent >= NUDGE_CONFIG.MAX_DAILY_NUDGES) {
    // Mark remaining nudges as skipped
    await markNudgesSkipped(uid, nudges);
    return;
  }

  // Check fatigue level
  // PRD: aisa_motivational_coaching.nudge_delivery.fatigue_backoff
  if (telemetry.fatigueScore >= NUDGE_CONFIG.FATIGUE_THRESHOLD) {
    console.log(`User ${uid} fatigue too high (${telemetry.fatigueScore}), skipping nudges`);
    await markNudgesSkipped(uid, nudges);
    return;
  }

  // Send nudges up to daily limit
  const remainingSlots = NUDGE_CONFIG.MAX_DAILY_NUDGES - telemetry.nudgesSent;
  const nudgesToSend = nudges.slice(0, remainingSlots);

  const batch = adminDb.batch();
  nudgesToSend.forEach(nudge => {
    const nudgeRef = userRef.collection('nudgeQueue').doc(nudge.id);
    batch.update(nudgeRef, {
      status: 'sent',
      sentAt: FieldValue.serverTimestamp(),
    });
  });

  // Update telemetry
  const telemetryRef = userRef.collection('coachTelemetry').doc(today);
  batch.set(
    telemetryRef,
    {
      ...telemetry,
      nudgesSent: telemetry.nudgesSent + nudgesToSend.length,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  // TODO: Actual delivery via push notification, email, etc.
  // This would integrate with notification services
  console.log(`Delivered ${nudgesToSend.length} nudges to user ${uid}`);
}

/**
 * Track nudge outcome (user acted on nudge)
 * PRD: aisa_motivational_coaching.coach_telemetry
 */
export async function trackNudgeOutcome(
  uid: string,
  nudgeId: string,
  acted: boolean
): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  const nudgeRef = userRef.collection('nudgeQueue').doc(nudgeId);

  const batch = adminDb.batch();

  // Update nudge status
  if (acted) {
    batch.update(nudgeRef, {
      status: 'acted',
      actedAt: FieldValue.serverTimestamp(),
    });
  }

  // Update telemetry
  const today = new Date().toISOString().split('T')[0];
  const telemetryRef = userRef.collection('coachTelemetry').doc(today);

  batch.set(
    telemetryRef,
    {
      nudgesActed: FieldValue.increment(acted ? 1 : 0),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * A/B test optimization for nudge templates
 * PRD: aisa_motivational_coaching.ab_optimization
 */
export async function abOptimizeNudges(templateKey: string): Promise<void> {
  // Query all nudges with this template
  const nudgesSnapshot = await adminDb
    .collectionGroup('nudgeQueue')
    .where('copyKey', '==', templateKey)
    .where('status', 'in', ['sent', 'acted'])
    .limit(1000)
    .get();

  // Calculate CTR by variant
  const variantStats = new Map<string, { sent: number; acted: number }>();

  nudgesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const variant = data.abVariant || 'control';

    if (!variantStats.has(variant)) {
      variantStats.set(variant, { sent: 0, acted: 0 });
    }

    const stats = variantStats.get(variant)!;
    stats.sent += 1;
    if (data.status === 'acted') {
      stats.acted += 1;
    }
  });

  // Log results (would integrate with analytics system)
  variantStats.forEach((stats, variant) => {
    const ctr = stats.sent > 0 ? stats.acted / stats.sent : 0;
    console.log(`Template ${templateKey} variant ${variant}: CTR ${ctr.toFixed(3)} (${stats.acted}/${stats.sent})`);
  });

  // TODO: Store results in analytics collection
}

// Helper functions

function calculateReadinessLevel(
  telemetry: CoachTelemetry[],
  missions: any[]
): number {
  if (telemetry.length === 0) return 5;

  const avgEngagement =
    telemetry.reduce((sum, t) => sum + (t.engagementScore || 0), 0) /
    telemetry.length;
  const completionRate =
    missions.filter(m => m.status === 'completed').length / Math.max(missions.length, 1);

  // Scale 0-1 to 1-10
  return Math.round(((avgEngagement + completionRate) / 2) * 9 + 1);
}

function calculateFatigueLevel(telemetry: CoachTelemetry[]): number {
  if (telemetry.length === 0) return 0;

  const avgFatigue =
    telemetry.reduce((sum, t) => sum + (t.fatigueScore || 0), 0) / telemetry.length;

  return Math.min(avgFatigue, 1.0);
}

function determineFocusAreas(
  missions: any[],
  weightLogs: any[],
  telemetry: CoachTelemetry[]
): string[] {
  const areas: string[] = [];

  // Check weight progress
  if (weightLogs.length >= 2) {
    const recentWeight = weightLogs[0].weight;
    const oldWeight = weightLogs[weightLogs.length - 1].weight;
    if (recentWeight >= oldWeight) {
      areas.push('nutrition');
    }
  }

  // Check mission completion
  const completionRate =
    missions.filter(m => m.status === 'completed').length / Math.max(missions.length, 1);
  if (completionRate < 0.5) {
    areas.push('motivation');
  }

  // Default areas
  if (areas.length === 0) areas.push('nutrition');
  if (areas.length === 1) areas.push('activity');
  if (areas.length === 2) areas.push('mindset');

  return areas.slice(0, 3);
}

function calculateDeliveryWindow(
  date: Date,
  startHour: number,
  endHour: number,
  quietStart: number,
  quietEnd: number
): { start: Date; end: Date } | null {
  // PRD: aisa_motivational_coaching.nudge_delivery.quiet_hours
  // Check if window overlaps with quiet hours
  if (
    (startHour >= quietStart && startHour < 24) ||
    (endHour > 0 && endHour <= quietEnd) ||
    (quietStart > quietEnd && (startHour >= quietStart || endHour <= quietEnd))
  ) {
    return null; // Overlaps with quiet hours
  }

  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);

  return { start, end };
}

function createNudge(
  uid: string,
  type: 'motivational' | 'educational' | 'challenge' | 'social',
  intent: string,
  window: { start: Date; end: Date },
  timeOfDay: string
): NudgeQueue {
  const nudgeId = `nudge_${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    nudgeId,
    type,
    intent,
    windowStart: Timestamp.fromDate(window.start),
    windowEnd: Timestamp.fromDate(window.end),
    status: 'pending',
    channel: 'push',
    copyKey: `${type}_${intent}_${timeOfDay}`,
    abVariant: Math.random() < 0.5 ? 'control' : 'variant_a',
    sentAt: null,
    actedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  };
}

async function markNudgesSkipped(uid: string, nudges: any[]): Promise<void> {
  const batch = adminDb.batch();
  const userRef = adminDb.collection('users').doc(uid);

  nudges.forEach(nudge => {
    const nudgeRef = userRef.collection('nudgeQueue').doc(nudge.id);
    batch.update(nudgeRef, { status: 'skipped' });
  });

  await batch.commit();
}

async function getRecentTelemetry(
  uid: string,
  days: number
): Promise<CoachTelemetry[]> {
  const snapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('coachTelemetry')
    .orderBy('date', 'desc')
    .limit(days)
    .get();

  return snapshot.docs.map(doc => doc.data() as CoachTelemetry);
}

async function getRecentMissions(uid: string): Promise<any[]> {
  const snapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('missions_active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getRecentWeightLogs(uid: string, days: number): Promise<any[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const snapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('weightLogs')
    .where('loggedAt', '>=', cutoffDate)
    .orderBy('loggedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
