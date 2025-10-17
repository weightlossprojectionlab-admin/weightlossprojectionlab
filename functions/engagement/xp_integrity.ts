/**
 * XP Fairness & Integrity System
 * PRD: xp_fairness_and_integrity
 *
 * Enforces XP caps, prevents duplicates, applies penalties, and maintains audit logs
 */

import { adminDb } from '../../lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  XPAuditLog,
  DailyXPTracker,
  UserXPEvent,
  UserStats,
  XPEventType,
} from '../../schemas/firestore';
import { PRD_REFS } from '../../lib/prdRefs';
import crypto from 'crypto';

// PRD: xp_fairness_and_integrity.daily_soft_cap
const XP_CONFIG = {
  DAILY_SOFT_CAP: 500,
  REPEAT_PENALTY_THRESHOLD: 3,
  REPEAT_PENALTY_MULTIPLIER: 0.5,
  DUPLICATE_WINDOW_HOURS: 24,
  WEIGHT_LOG_MIN_INTERVAL_HOURS: 12,
  WEIGHT_DELTA_SANITY_THRESHOLD: 0.1, // 10% change threshold
};

interface XPEventInput {
  eventType: XPEventType;
  baseXP: number;
  metadata?: Record<string, any>;
}

/**
 * Main entry point for all XP events
 * PRD: xp_fairness_and_integrity
 */
export async function onXPEventWrite(
  uid: string,
  event: XPEventInput
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userRef = adminDb.collection('users').doc(uid);

    // Get daily tracker
    const dailyTrackerRef = userRef.collection('xp_daily').doc(today);
    const dailyTrackerDoc = await dailyTrackerRef.get();

    const dailyTracker: DailyXPTracker = dailyTrackerDoc.exists
      ? (dailyTrackerDoc.data() as DailyXPTracker)
      : {
          date: today,
          totalXP: 0,
          eventCounts: {} as Record<XPEventType, number>,
          isGraceDay: await isGraceDay(uid),
          softCapReached: false,
          updatedAt: FieldValue.serverTimestamp() as any,
        };

    // Run integrity checks
    const integrityCheck = await performIntegrityChecks(
      uid,
      event,
      dailyTracker
    );

    if (integrityCheck.reject) {
      console.warn(
        `XP event rejected for ${uid}: ${integrityCheck.reason}`
      );
      await logAuditEntry(uid, event, 0, integrityCheck.reason, true);
      return;
    }

    // Calculate final XP with multipliers
    let finalXP = event.baseXP * integrityCheck.multiplier;

    // Apply daily cap (unless grace day)
    // PRD: xp_fairness_and_integrity.daily_soft_cap
    const newDailyTotal = dailyTracker.totalXP + finalXP;
    if (!dailyTracker.isGraceDay && newDailyTotal > XP_CONFIG.DAILY_SOFT_CAP) {
      const excessXP = newDailyTotal - XP_CONFIG.DAILY_SOFT_CAP;
      finalXP = Math.max(finalXP - excessXP, 0);
      integrityCheck.reason += '; Daily cap applied';
    }

    if (finalXP === 0) {
      console.log(`No XP awarded to ${uid}: ${integrityCheck.reason}`);
      await logAuditEntry(uid, event, 0, integrityCheck.reason, false);
      return;
    }

    // Award XP
    const batch = adminDb.batch();

    // Update daily tracker
    const updatedEventCounts = { ...dailyTracker.eventCounts };
    updatedEventCounts[event.eventType] =
      (updatedEventCounts[event.eventType] || 0) + 1;

    batch.set(
      dailyTrackerRef,
      {
        totalXP: dailyTracker.totalXP + finalXP,
        eventCounts: updatedEventCounts,
        softCapReached: newDailyTotal >= XP_CONFIG.DAILY_SOFT_CAP,
        updatedAt: FieldValue.serverTimestamp(),
      } as Partial<DailyXPTracker>,
      { merge: true }
    );

    // Update user stats
    const statsRef = userRef.collection('stats').doc('current');
    batch.set(
      statsRef,
      {
        totalXP: FieldValue.increment(finalXP),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Record XP event
    const eventId = `xp_${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userXPEvent: UserXPEvent = {
      eventId,
      eventType: event.eventType,
      xpAwarded: finalXP,
      timestamp: FieldValue.serverTimestamp(),
    };

    const xpHistoryRef = userRef.collection('xp_history').doc(eventId);
    batch.set(xpHistoryRef, userXPEvent);

    await batch.commit();

    // Log audit entry
    await logAuditEntry(
      uid,
      event,
      finalXP,
      integrityCheck.reason,
      false,
      integrityCheck.multiplier,
      dailyTracker.totalXP,
      dailyTracker.totalXP + finalXP
    );

    console.log(
      `Awarded ${finalXP} XP to ${uid} for ${event.eventType} (multiplier: ${integrityCheck.multiplier})`
    );
  } catch (error) {
    console.error(`Error processing XP event for ${uid}:`, error);
    throw error;
  }
}

/**
 * Perform all integrity checks
 * PRD: xp_fairness_and_integrity
 */
async function performIntegrityChecks(
  uid: string,
  event: XPEventInput,
  dailyTracker: DailyXPTracker
): Promise<{
  reject: boolean;
  multiplier: number;
  reason: string;
}> {
  let multiplier = 1.0;
  let reason = 'Normal';

  // Check for duplicate events
  // PRD: xp_fairness_and_integrity.duplicate_detection
  const isDuplicate = await checkDuplicate(uid, event);
  if (isDuplicate) {
    return {
      reject: true,
      multiplier: 0,
      reason: 'Duplicate event detected',
    };
  }

  // Check for repeat action penalty
  // PRD: xp_fairness_and_integrity.repeat_action_penalty
  const eventCount = dailyTracker.eventCounts[event.eventType] || 0;
  if (eventCount >= XP_CONFIG.REPEAT_PENALTY_THRESHOLD) {
    multiplier = XP_CONFIG.REPEAT_PENALTY_MULTIPLIER;
    reason = `Repeat action penalty applied (${eventCount + 1} times today)`;
  }

  // Event-specific checks
  if (event.eventType === 'weight_log') {
    const weightCheck = await checkWeightLogValidity(uid, event.metadata);
    if (!weightCheck.valid) {
      return {
        reject: true,
        multiplier: 0,
        reason: weightCheck.reason,
      };
    }
  }

  return { reject: false, multiplier, reason };
}

/**
 * Check for duplicate events
 * PRD: xp_fairness_and_integrity.duplicate_detection
 */
async function checkDuplicate(
  uid: string,
  event: XPEventInput
): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setHours(
    windowStart.getHours() - XP_CONFIG.DUPLICATE_WINDOW_HOURS
  );

  const userRef = adminDb.collection('users').doc(uid);

  // For meal logs, check photo hash
  if (event.eventType === 'meal_log' && event.metadata?.photoHash) {
    const duplicateMeals = await userRef
      .collection('mealLogs')
      .where('photoHash', '==', event.metadata.photoHash)
      .where('createdAt', '>=', windowStart)
      .limit(1)
      .get();

    if (!duplicateMeals.empty) {
      return true;
    }
  }

  // For weight logs, check timestamp proximity
  if (event.eventType === 'weight_log') {
    const minIntervalStart = new Date();
    minIntervalStart.setHours(
      minIntervalStart.getHours() - XP_CONFIG.WEIGHT_LOG_MIN_INTERVAL_HOURS
    );

    const recentWeightLogs = await userRef
      .collection('weightLogs')
      .where('loggedAt', '>=', minIntervalStart)
      .limit(1)
      .get();

    if (!recentWeightLogs.empty) {
      return true; // Too soon since last weight log
    }
  }

  return false;
}

/**
 * Validate weight log for sanity
 * PRD: xp_fairness_and_integrity.duplicate_detection
 */
async function checkWeightLogValidity(
  uid: string,
  metadata?: Record<string, any>
): Promise<{ valid: boolean; reason: string }> {
  if (!metadata?.weight) {
    return { valid: false, reason: 'Missing weight data' };
  }

  const currentWeight = metadata.weight;

  // Get most recent weight log
  const userRef = adminDb.collection('users').doc(uid);
  const recentLogs = await userRef
    .collection('weightLogs')
    .orderBy('loggedAt', 'desc')
    .limit(1)
    .get();

  if (recentLogs.empty) {
    return { valid: true, reason: 'First weight log' };
  }

  const lastLog = recentLogs.docs[0].data();
  const lastWeight = lastLog.weight;

  // Check for unrealistic weight change
  const percentChange = Math.abs((currentWeight - lastWeight) / lastWeight);
  if (percentChange > XP_CONFIG.WEIGHT_DELTA_SANITY_THRESHOLD) {
    return {
      valid: false,
      reason: `Unrealistic weight change: ${(percentChange * 100).toFixed(1)}%`,
    };
  }

  return { valid: true, reason: 'Valid weight log' };
}

/**
 * Check if today is a grace day for the user
 * PRD: xp_fairness_and_integrity.grace_day_mechanics
 */
async function isGraceDay(uid: string): Promise<boolean> {
  // Grace day is typically the first day after joining or after a long break
  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return false;

  const userData = userDoc.data();
  const createdAt = userData?.createdAt?.toDate();

  if (!createdAt) return false;

  // Check if user joined today
  const today = new Date().toISOString().split('T')[0];
  const joinDate = createdAt.toISOString().split('T')[0];

  if (today === joinDate) {
    return true; // First day is grace day
  }

  // Check if user returned after 7+ days of inactivity
  const lastActiveAt = userData?.lastActiveAt?.toDate();
  if (lastActiveAt) {
    const daysSinceActive =
      (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive >= 7) {
      return true; // Returning after break is grace day
    }
  }

  return false;
}

/**
 * Log XP audit entry
 * PRD: xp_fairness_and_integrity.audit_log
 */
async function logAuditEntry(
  uid: string,
  event: XPEventInput,
  finalXP: number,
  reason: string,
  isDuplicate: boolean,
  multiplier: number = 1.0,
  dailyXPBefore: number = 0,
  dailyXPAfter: number = 0
): Promise<void> {
  const eventId = `audit_${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const auditLog: XPAuditLog = {
    eventId,
    uid,
    eventType: event.eventType,
    baseXP: event.baseXP,
    multiplier,
    finalXP,
    reason,
    isDuplicate,
    isWithinDailyCap: dailyXPAfter <= XP_CONFIG.DAILY_SOFT_CAP,
    dailyXPBeforeEvent: dailyXPBefore,
    dailyXPAfterEvent: dailyXPAfter,
    metadata: event.metadata || {},
    timestamp: FieldValue.serverTimestamp(),
  };

  await adminDb.collection('xp_audit').doc(eventId).set(auditLog);
}

/**
 * Generate photo hash for duplicate detection
 * PRD: xp_fairness_and_integrity.duplicate_detection
 */
export function generatePhotoHash(photoData: Buffer | string): string {
  return crypto.createHash('sha256').update(photoData).digest('hex');
}

/**
 * Get user's XP statistics
 */
export async function getUserXPStats(uid: string): Promise<{
  totalXP: number;
  todayXP: number;
  level: number;
  softCapReached: boolean;
}> {
  const userRef = adminDb.collection('users').doc(uid);

  const [statsDoc, dailyDoc] = await Promise.all([
    userRef.collection('stats').doc('current').get(),
    userRef
      .collection('xp_daily')
      .doc(new Date().toISOString().split('T')[0])
      .get(),
  ]);

  const stats = statsDoc.exists ? (statsDoc.data() as UserStats) : { totalXP: 0, level: 1 };
  const daily = dailyDoc.exists
    ? (dailyDoc.data() as DailyXPTracker)
    : { totalXP: 0, softCapReached: false };

  return {
    totalXP: stats.totalXP || 0,
    todayXP: daily.totalXP || 0,
    level: stats.level || 1,
    softCapReached: daily.softCapReached || false,
  };
}

/**
 * Recalculate user level based on total XP
 * Standard formula: level = floor(sqrt(totalXP / 100))
 */
export async function recalculateUserLevel(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  const statsRef = userRef.collection('stats').doc('current');

  const statsDoc = await statsRef.get();
  if (!statsDoc.exists) return;

  const stats = statsDoc.data() as UserStats;
  const newLevel = Math.floor(Math.sqrt(stats.totalXP / 100)) + 1;

  if (newLevel !== stats.level) {
    await statsRef.update({
      level: newLevel,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`User ${uid} leveled up to ${newLevel}`);
  }
}
