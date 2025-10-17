/**
 * Retention Loop System
 * PRD: retention_loop_system
 *
 * Manages weekly missions, seasonal challenges, and XP rewards
 */

import { adminDb } from '../../lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  UserMission,
  MissionHistory,
  WeeklyMissionTemplate,
  MissionTemplate,
  MissionStatus,
} from '../../schemas/firestore';
import { PRD_REFS } from '../../lib/prdRefs';
import { onXPEventWrite } from './xp_integrity';

// PRD: retention_loop_system.weekly_missions
const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    templateId: 'log_weight_5x',
    type: 'weekly',
    title: 'Weight Logger',
    description: 'Log your weight 5 times this week',
    xpReward: 100,
    targetProgress: 5,
    durationDays: 7,
  },
  {
    templateId: 'log_meals_14x',
    type: 'weekly',
    title: 'Meal Tracker',
    description: 'Log 14 meals this week',
    xpReward: 150,
    targetProgress: 14,
    durationDays: 7,
  },
  {
    templateId: 'maintain_streak_7d',
    type: 'weekly',
    title: 'Streak Master',
    description: 'Maintain a 7-day logging streak',
    xpReward: 200,
    targetProgress: 7,
    durationDays: 7,
  },
  {
    templateId: 'lose_1kg',
    type: 'weekly',
    title: 'Progress Maker',
    description: 'Lose 1kg this week',
    xpReward: 250,
    targetProgress: 1,
    durationDays: 7,
  },
];

/**
 * Assign weekly missions to all active users
 * Schedule: Monday 07:00 local time
 * PRD: retention_loop_system.weekly_missions
 */
export async function assignWeeklyMissions(uid: string): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid);

    // Get current week ID
    const weekId = getWeekId(new Date());

    // Check if already assigned this week
    const existingMissions = await userRef
      .collection('missions_active')
      .where('type', '==', 'weekly')
      .get();

    if (!existingMissions.empty) {
      // Check if missions are for current week
      const firstMission = existingMissions.docs[0].data();
      const missionDate = firstMission.createdAt.toDate();
      const missionWeekId = getWeekId(missionDate);

      if (missionWeekId === weekId) {
        console.log(`User ${uid} already has missions for ${weekId}`);
        return;
      }

      // Archive old missions
      await archiveExpiredMissions(uid);
    }

    // Select 3 random missions for variety
    const selectedTemplates = selectRandomMissions(MISSION_TEMPLATES, 3);

    // Create missions
    const batch = adminDb.batch();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    selectedTemplates.forEach(template => {
      const missionId = `mission_${uid}_${template.templateId}_${Date.now()}`;
      const missionRef = userRef.collection('missions_active').doc(missionId);

      const mission: UserMission = {
        missionId,
        type: template.type,
        title: template.title,
        description: template.description,
        xpReward: template.xpReward,
        progress: 0,
        targetProgress: template.targetProgress,
        status: 'active',
        expiresAt: Timestamp.fromDate(expiresAt),
        completedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(missionRef, mission);
    });

    await batch.commit();

    console.log(`Assigned ${selectedTemplates.length} missions to user ${uid}`);
  } catch (error) {
    console.error(`Error assigning missions to ${uid}:`, error);
    throw error;
  }
}

/**
 * Handle mission progress when user logs activity
 * PRD: retention_loop_system.mission_progress_tracking
 */
export async function onMissionProgress(
  uid: string,
  eventType: 'weight_log' | 'meal_log' | 'streak_update',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const missionsSnapshot = await userRef
      .collection('missions_active')
      .where('status', '==', 'active')
      .get();

    if (missionsSnapshot.empty) return;

    const batch = adminDb.batch();

    for (const missionDoc of missionsSnapshot.docs) {
      const mission = missionDoc.data() as UserMission;

      // Check if this event affects this mission
      const progressIncrement = calculateProgressIncrement(
        mission,
        eventType,
        metadata
      );

      if (progressIncrement > 0) {
        const newProgress = mission.progress + progressIncrement;
        const isComplete = newProgress >= mission.targetProgress;

        batch.update(missionDoc.ref, {
          progress: newProgress,
          status: isComplete ? 'completed' : 'active',
          completedAt: isComplete ? FieldValue.serverTimestamp() : null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // If completed, award XP
        if (isComplete && mission.status !== 'completed') {
          await onMissionComplete(uid, mission);
        }
      }
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error updating mission progress for ${uid}:`, error);
    throw error;
  }
}

/**
 * Award XP when mission is completed
 * PRD: retention_loop_system.xp_awards
 */
export async function onMissionComplete(
  uid: string,
  mission: UserMission
): Promise<void> {
  try {
    // Award XP through integrity system
    await onXPEventWrite(uid, {
      eventType: 'mission_complete',
      baseXP: mission.xpReward,
      metadata: {
        missionId: mission.missionId,
        missionType: mission.type,
        title: mission.title,
      },
    });

    console.log(
      `Awarded ${mission.xpReward} XP to user ${uid} for completing ${mission.title}`
    );
  } catch (error) {
    console.error(`Error awarding XP for mission ${mission.missionId}:`, error);
    throw error;
  }
}

/**
 * Archive expired or completed missions to history
 */
async function archiveExpiredMissions(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  const now = new Date();

  const expiredMissions = await userRef
    .collection('missions_active')
    .where('expiresAt', '<=', now)
    .get();

  if (expiredMissions.empty) return;

  const batch = adminDb.batch();

  expiredMissions.docs.forEach(doc => {
    const mission = doc.data() as UserMission;

    // Move to history
    const historyRef = userRef.collection('missions_history').doc(doc.id);
    const historyEntry: MissionHistory = {
      ...mission,
      finalStatus: mission.status === 'completed' ? 'completed' : 'expired',
      archivedAt: FieldValue.serverTimestamp(),
    };

    batch.set(historyRef, historyEntry);
    batch.delete(doc.ref);
  });

  await batch.commit();
}

// Helper functions

function getWeekId(date: Date): string {
  // Format: YYYY-Www (e.g., 2025-W41)
  const year = date.getFullYear();
  const onejan = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
  );
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function selectRandomMissions(
  templates: MissionTemplate[],
  count: number
): MissionTemplate[] {
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, templates.length));
}

function calculateProgressIncrement(
  mission: UserMission,
  eventType: 'weight_log' | 'meal_log' | 'streak_update',
  metadata?: Record<string, any>
): number {
  // Map event types to mission templates
  if (mission.missionId.includes('log_weight') && eventType === 'weight_log') {
    return 1;
  }

  if (mission.missionId.includes('log_meals') && eventType === 'meal_log') {
    return 1;
  }

  if (mission.missionId.includes('maintain_streak') && eventType === 'streak_update') {
    return metadata?.streakDays || 0;
  }

  if (mission.missionId.includes('lose_') && eventType === 'weight_log') {
    // Calculate weight loss
    const weightLost = metadata?.weightLost || 0;
    return weightLost;
  }

  return 0;
}

/**
 * Batch process: Assign missions to all active users
 * This would be called by a scheduler for all users
 */
export async function assignWeeklyMissionsToAllUsers(): Promise<void> {
  try {
    // Get all users (in production, batch this in chunks)
    const usersSnapshot = await adminDb
      .collection('users')
      .limit(1000) // Process in batches
      .get();

    console.log(`Processing ${usersSnapshot.size} users for weekly missions`);

    const promises = usersSnapshot.docs.map(doc =>
      assignWeeklyMissions(doc.id).catch(err => {
        console.error(`Failed to assign missions to ${doc.id}:`, err);
      })
    );

    await Promise.all(promises);

    console.log('Weekly mission assignment completed');
  } catch (error) {
    console.error('Error in batch mission assignment:', error);
    throw error;
  }
}

/**
 * Check and update mission expiry
 * Schedule: Daily 00:00 local time
 */
export async function checkExpiredMissions(): Promise<void> {
  try {
    // This would run for all users in production
    const usersSnapshot = await adminDb
      .collection('users')
      .limit(1000)
      .get();

    const promises = usersSnapshot.docs.map(doc =>
      archiveExpiredMissions(doc.id).catch(err => {
        console.error(`Failed to archive missions for ${doc.id}:`, err);
      })
    );

    await Promise.all(promises);

    console.log('Mission expiry check completed');
  } catch (error) {
    console.error('Error checking expired missions:', error);
    throw error;
  }
}
