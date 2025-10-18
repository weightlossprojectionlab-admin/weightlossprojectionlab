/**
 * Group & Social Mission Firestore Schema Interfaces
 * PRD: social_retention_and_group_missions
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type GroupMissionStatus = 'active' | 'completed' | 'failed' | 'expired';

/**
 * groups/{groupId}
 * Social group basic info
 * PRD: social_retention_and_group_missions
 */
export interface Group {
  groupId: string;
  id?: string; // Alias for groupId for UI components
  name: string;
  memberIds: string[];
  maxMembers?: number; // Maximum allowed members (default 50)
  privacy?: 'public' | 'private'; // Group privacy setting
  description?: string; // Group description
  activeMissionId?: string; // ID of currently active group mission
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * groups/{groupId}/socialMissions/{missionId}
 * PRD: social_retention_and_group_missions.group_missions
 */
export interface GroupMission {
  missionId: string;
  groupId: string;
  title: string;
  description: string;
  baseXP: number; // Base 100 per PRD
  totalProgress: number;
  targetProgress: number;
  memberContributions: Record<string, number>; // uid -> progress contributed
  status: GroupMissionStatus;
  expiresAt: Timestamp | FieldValue;
  completedAt: Timestamp | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * groups/{groupId}/members/{uid}
 * Group member tracking data
 * PRD: social_retention_and_group_missions.trust_score
 */
export interface GroupMember {
  uid: string;
  groupId: string;
  displayName: string;
  trustScore: number; // 0.0 to 1.0
  supportActionsCount: number;
  lastActiveAt: Timestamp | FieldValue;
  joinedAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * groups/{groupId}/supportActions/{actionId}
 * Track support/encouragement actions
 * PRD: social_retention_and_group_missions.shared_xp_calculation
 */
export interface SupportAction {
  actionId: string;
  fromUid: string;
  toUid: string;
  type: 'cheer' | 'tip' | 'motivation';
  timestamp: Timestamp | FieldValue;
}

/**
 * groups/{groupId}/recoveryMissions/{missionId}
 * Group recovery missions for inactive members
 * PRD: social_retention_and_group_missions.group_recovery_missions
 */
export interface GroupRecoveryMission {
  missionId: string;
  groupId: string;
  inactiveMemberUid: string;
  assignedMemberUids: string[];
  title: string;
  description: string;
  xpReward: number;
  status: GroupMissionStatus;
  expiresAt: Timestamp | FieldValue;
  completedAt: Timestamp | null;
  createdAt: Timestamp | FieldValue;
}
