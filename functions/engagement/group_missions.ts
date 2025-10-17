/**
 * Social Retention & Group Missions System
 * PRD: social_retention_and_group_missions
 *
 * Manages group missions, trust scores, and social engagement
 */

import { adminDb } from '../../lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  GroupMission,
  GroupMember,
  GroupRecoveryMission,
  SupportAction,
} from '../../schemas/firestore';
import { PRD_REFS } from '../../lib/prdRefs';
import { onXPEventWrite } from './xp_integrity';

// PRD: social_retention_and_group_missions.group_missions
const GROUP_MISSION_CONFIG = {
  BASE_XP: 100,
  AVG_COMPLETION_BONUS: 50,
  SUPPORT_ACTION_XP: 2,
  INACTIVE_THRESHOLD_DAYS: 7,
};

// PRD: social_retention_and_group_missions.trust_score
const TRUST_SCORE_WEIGHTS = {
  CONSISTENCY: 0.4,
  CONTRIBUTION: 0.3,
  SUPPORT: 0.3,
};

/**
 * Assign group missions to active groups
 * Schedule: Monday 08:00 local time
 * PRD: social_retention_and_group_missions.group_missions
 */
export async function assignGroupMissions(groupId: string): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      console.error(`Group ${groupId} not found`);
      return;
    }

    const groupData = groupDoc.data();
    const memberIds = groupData?.memberIds || [];

    if (memberIds.length < 2) {
      console.log(`Group ${groupId} has insufficient members`);
      return;
    }

    // Check for existing active missions
    const activeMissions = await groupRef
      .collection('socialMissions')
      .where('status', '==', 'active')
      .get();

    if (!activeMissions.empty) {
      console.log(`Group ${groupId} already has active missions`);
      return;
    }

    // Create new group mission
    const missionId = `group_mission_${groupId}_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const targetProgress = memberIds.length * 10; // 10 logs per member

    const mission: GroupMission = {
      missionId,
      groupId,
      title: 'Team Logger Challenge',
      description: `Log ${targetProgress} meals/weights as a group this week`,
      baseXP: GROUP_MISSION_CONFIG.BASE_XP,
      totalProgress: 0,
      targetProgress,
      memberContributions: {},
      status: 'active',
      expiresAt: Timestamp.fromDate(expiresAt),
      completedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await groupRef.collection('socialMissions').doc(missionId).set(mission);

    console.log(`Assigned group mission to ${groupId}`);
  } catch (error) {
    console.error(`Error assigning group mission to ${groupId}:`, error);
    throw error;
  }
}

/**
 * Update group mission progress when member logs activity
 * PRD: social_retention_and_group_missions.group_missions
 */
export async function updateGroupProgress(
  groupId: string,
  uid: string,
  progressIncrement: number
): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);

    // Get active missions
    const missionsSnapshot = await groupRef
      .collection('socialMissions')
      .where('status', '==', 'active')
      .get();

    if (missionsSnapshot.empty) return;

    const batch = adminDb.batch();

    for (const missionDoc of missionsSnapshot.docs) {
      const mission = missionDoc.data() as GroupMission;

      const currentContribution = mission.memberContributions[uid] || 0;
      const newContribution = currentContribution + progressIncrement;
      const newTotalProgress = mission.totalProgress + progressIncrement;

      const isComplete = newTotalProgress >= mission.targetProgress;

      const updates: Partial<GroupMission> = {
        totalProgress: newTotalProgress,
        memberContributions: {
          ...mission.memberContributions,
          [uid]: newContribution,
        },
        status: isComplete ? 'completed' : 'active',
        completedAt: isComplete ? (FieldValue.serverTimestamp() as any) : null,
        updatedAt: FieldValue.serverTimestamp() as any,
      };

      batch.update(missionDoc.ref, updates);

      // If completed, award XP to all members
      if (isComplete && mission.status !== 'completed') {
        await onGroupMissionComplete(groupId, mission);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error updating group progress for ${groupId}:`, error);
    throw error;
  }
}

/**
 * Award shared XP when group mission completes
 * PRD: social_retention_and_group_missions.shared_xp_calculation
 */
export async function onGroupMissionComplete(
  groupId: string,
  mission: GroupMission
): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return;

    const groupData = groupDoc.data();
    const memberIds = groupData?.memberIds || [];

    // Calculate completion rate
    const avgCompletionRate =
      mission.totalProgress / Math.max(mission.targetProgress, 1);

    // Get support actions during mission
    const supportActionsSnapshot = await groupRef
      .collection('supportActions')
      .where('timestamp', '>=', mission.createdAt)
      .get();

    const supportActionsCount = supportActionsSnapshot.size;

    // PRD: social_retention_and_group_missions.shared_xp_calculation
    // Base 100 + (AvgCompletionRate*50) + (SupportActions*2)
    const totalXP =
      GROUP_MISSION_CONFIG.BASE_XP +
      avgCompletionRate * GROUP_MISSION_CONFIG.AVG_COMPLETION_BONUS +
      supportActionsCount * GROUP_MISSION_CONFIG.SUPPORT_ACTION_XP;

    // Award XP to each member
    const promises = memberIds.map((uid: string) =>
      onXPEventWrite(uid, {
        eventType: 'group_mission_complete',
        baseXP: totalXP,
        metadata: {
          groupId,
          missionId: mission.missionId,
          memberContribution: mission.memberContributions[uid] || 0,
          supportActionsCount,
        },
      }).catch(err => {
        console.error(`Failed to award XP to ${uid}:`, err);
      })
    );

    await Promise.all(promises);

    console.log(`Awarded ${totalXP} XP to ${memberIds.length} members of group ${groupId}`);
  } catch (error) {
    console.error(`Error completing group mission ${mission.missionId}:`, error);
    throw error;
  }
}

/**
 * Calculate trust score for group members
 * Schedule: Daily 03:00 local time
 * PRD: social_retention_and_group_missions.trust_score
 */
export async function calculateTrustScore(
  groupId: string,
  uid: string
): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);
    const memberRef = groupRef.collection('members').doc(uid);

    // Get member data
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      console.warn(`Member ${uid} not found in group ${groupId}`);
      return;
    }

    // Calculate consistency (last 7 days activity)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userLogsSnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('weightLogs')
      .where('loggedAt', '>=', sevenDaysAgo)
      .get();

    const loggedDays = new Set<string>();
    userLogsSnapshot.forEach(doc => {
      const date = doc.data().loggedAt.toDate().toISOString().split('T')[0];
      loggedDays.add(date);
    });

    const consistencyScore = loggedDays.size / 7;

    // Calculate contribution (group mission participation)
    const missionsSnapshot = await groupRef
      .collection('socialMissions')
      .where('status', '==', 'completed')
      .limit(5)
      .get();

    let totalContribution = 0;
    let totalPossible = 0;

    missionsSnapshot.forEach(doc => {
      const mission = doc.data() as GroupMission;
      const userContribution = mission.memberContributions[uid] || 0;
      const avgContribution =
        Object.values(mission.memberContributions).reduce((a, b) => a + b, 0) /
        Object.keys(mission.memberContributions).length;

      totalContribution += userContribution;
      totalPossible += avgContribution;
    });

    const contributionScore =
      totalPossible > 0 ? Math.min(totalContribution / totalPossible, 1) : 0.5;

    // Calculate support (giving support actions)
    const supportActionsSnapshot = await groupRef
      .collection('supportActions')
      .where('fromUid', '==', uid)
      .where('timestamp', '>=', sevenDaysAgo)
      .get();

    const supportScore = Math.min(supportActionsSnapshot.size / 10, 1); // Normalize to 10 actions

    // PRD: social_retention_and_group_missions.trust_score
    const trustScore =
      consistencyScore * TRUST_SCORE_WEIGHTS.CONSISTENCY +
      contributionScore * TRUST_SCORE_WEIGHTS.CONTRIBUTION +
      supportScore * TRUST_SCORE_WEIGHTS.SUPPORT;

    // Update member trust score
    await memberRef.set(
      {
        trustScore: Math.round(trustScore * 100) / 100,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`Updated trust score for ${uid} in ${groupId}: ${trustScore.toFixed(2)}`);
  } catch (error) {
    console.error(`Error calculating trust score for ${uid} in ${groupId}:`, error);
    throw error;
  }
}

/**
 * Check for inactive members and create recovery missions
 * Schedule: Daily 09:00 local time
 * PRD: social_retention_and_group_missions.inactive_member_detection
 */
export async function checkInactiveMember(groupId: string): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return;

    const groupData = groupDoc.data();
    const memberIds = groupData?.memberIds || [];

    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(
      inactiveThreshold.getDate() - GROUP_MISSION_CONFIG.INACTIVE_THRESHOLD_DAYS
    );

    // Check each member's activity
    for (const uid of memberIds) {
      const memberRef = groupRef.collection('members').doc(uid);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) continue;

      const memberData = memberDoc.data() as GroupMember;
      const lastActive = memberData.lastActiveAt.toDate();

      if (lastActive < inactiveThreshold) {
        // Member is inactive, create recovery mission
        await createGroupRecoveryMission(groupId, uid, memberIds);
      }
    }
  } catch (error) {
    console.error(`Error checking inactive members in ${groupId}:`, error);
    throw error;
  }
}

/**
 * Create a group recovery mission for inactive member
 * PRD: social_retention_and_group_missions.group_recovery_missions
 */
async function createGroupRecoveryMission(
  groupId: string,
  inactiveUid: string,
  allMemberIds: string[]
): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);

    // Check if recovery mission already exists
    const existingRecovery = await groupRef
      .collection('recoveryMissions')
      .where('inactiveMemberUid', '==', inactiveUid)
      .where('status', '==', 'active')
      .get();

    if (!existingRecovery.empty) {
      console.log(`Recovery mission already exists for ${inactiveUid} in ${groupId}`);
      return;
    }

    // Assign to other active members
    const assignedMembers = allMemberIds.filter(id => id !== inactiveUid);

    const missionId = `recovery_${groupId}_${inactiveUid}_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3-day recovery window

    const recoveryMission: GroupRecoveryMission = {
      missionId,
      groupId,
      inactiveMemberUid: inactiveUid,
      assignedMemberUids: assignedMembers,
      title: 'Bring Back a Friend',
      description: `Help your teammate get back on track! Send encouragement and support.`,
      xpReward: 50,
      status: 'active',
      expiresAt: Timestamp.fromDate(expiresAt),
      completedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    };

    await groupRef
      .collection('recoveryMissions')
      .doc(missionId)
      .set(recoveryMission);

    console.log(`Created recovery mission for ${inactiveUid} in ${groupId}`);
  } catch (error) {
    console.error(`Error creating recovery mission:`, error);
    throw error;
  }
}

/**
 * Record a support action (cheer, tip, motivation)
 * PRD: social_retention_and_group_missions.shared_xp_calculation
 */
export async function recordSupportAction(
  groupId: string,
  fromUid: string,
  toUid: string,
  type: 'cheer' | 'tip' | 'motivation'
): Promise<void> {
  try {
    const groupRef = adminDb.collection('groups').doc(groupId);

    const actionId = `support_${groupId}_${Date.now()}`;
    const supportAction: SupportAction = {
      actionId,
      fromUid,
      toUid,
      type,
      timestamp: FieldValue.serverTimestamp(),
    };

    await groupRef.collection('supportActions').doc(actionId).set(supportAction);

    // Update support actions count for the giver
    const memberRef = groupRef.collection('members').doc(fromUid);
    await memberRef.set(
      {
        supportActionsCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Check if this completes a recovery mission
    const recoveryMissions = await groupRef
      .collection('recoveryMissions')
      .where('inactiveMemberUid', '==', toUid)
      .where('status', '==', 'active')
      .get();

    if (!recoveryMissions.empty) {
      const recoveryDoc = recoveryMissions.docs[0];
      const recovery = recoveryDoc.data() as GroupRecoveryMission;

      // Check if target member became active again
      const targetMemberRef = groupRef.collection('members').doc(toUid);
      const targetMemberDoc = await targetMemberRef.get();

      if (targetMemberDoc.exists) {
        const targetMember = targetMemberDoc.data() as GroupMember;
        const lastActive = targetMember.lastActiveAt.toDate();
        const recentlyActive =
          Date.now() - lastActive.getTime() < 24 * 60 * 60 * 1000; // Last 24 hours

        if (recentlyActive) {
          // Complete recovery mission
          await recoveryDoc.ref.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
          });

          // Award XP to assigned members
          recovery.assignedMemberUids.forEach(uid => {
            onXPEventWrite(uid, {
              eventType: 'mission_complete',
              baseXP: recovery.xpReward,
              metadata: {
                missionType: 'group_recovery',
                recoveredMember: toUid,
              },
            }).catch(err => {
              console.error(`Failed to award recovery XP to ${uid}:`, err);
            });
          });
        }
      }
    }

    console.log(`Recorded ${type} support action from ${fromUid} to ${toUid} in ${groupId}`);
  } catch (error) {
    console.error(`Error recording support action:`, error);
    throw error;
  }
}

/**
 * Batch process: Calculate trust scores for all group members
 */
export async function calculateAllTrustScores(): Promise<void> {
  try {
    const groupsSnapshot = await adminDb.collection('groups').limit(100).get();

    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      const memberIds = groupData?.memberIds || [];

      const promises = memberIds.map((uid: string) =>
        calculateTrustScore(groupDoc.id, uid).catch(err => {
          console.error(`Failed to calculate trust for ${uid}:`, err);
        })
      );

      await Promise.all(promises);
    }

    console.log('Trust score calculation completed for all groups');
  } catch (error) {
    console.error('Error in batch trust score calculation:', error);
    throw error;
  }
}

/**
 * Batch process: Check inactive members for all groups
 */
export async function checkAllInactiveMembers(): Promise<void> {
  try {
    const groupsSnapshot = await adminDb.collection('groups').limit(100).get();

    const promises = groupsSnapshot.docs.map(doc =>
      checkInactiveMember(doc.id).catch(err => {
        console.error(`Failed to check inactive members for ${doc.id}:`, err);
      })
    );

    await Promise.all(promises);

    console.log('Inactive member check completed for all groups');
  } catch (error) {
    console.error('Error in batch inactive member check:', error);
    throw error;
  }
}
