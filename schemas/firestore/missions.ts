/**
 * Mission-related Firestore Schema Interfaces
 * PRD: retention_loop_system
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type MissionType = 'daily' | 'weekly' | 'seasonal';
export type MissionStatus = 'active' | 'completed' | 'failed' | 'expired';

/**
 * users/{uid}/missions_active/{id}
 * PRD: retention_loop_system.weekly_missions
 */
export interface UserMission {
  missionId: string;
  id?: string; // Alias for missionId for UI components
  type: MissionType;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  targetProgress: number;
  status: MissionStatus;
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional difficulty indicator
  expiresAt: Timestamp | FieldValue;
  completedAt: Timestamp | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/missions_history/{id}
 * Historical mission records
 */
export interface MissionHistory extends UserMission {
  finalStatus: MissionStatus;
  archivedAt: Timestamp | FieldValue;
}

/**
 * missions_weekly/{weekId}
 * Global weekly mission templates
 * PRD: retention_loop_system.weekly_missions
 */
export interface WeeklyMissionTemplate {
  weekId: string; // Format: YYYY-Www (e.g., 2025-W41)
  missions: MissionTemplate[];
  startDate: Timestamp | FieldValue;
  endDate: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
}

/**
 * seasonal_challenges/{seasonId}
 * Seasonal challenge templates
 * PRD: retention_loop_system.seasonal_challenges
 */
export interface SeasonalChallenge {
  seasonId: string;
  id?: string; // Alias for seasonId for UI components
  name?: string; // Deprecated, use title instead
  title?: string; // Challenge title
  description?: string; // Challenge description
  startDate: Timestamp | FieldValue;
  endDate: Timestamp | FieldValue;
  milestones?: ChallengeMilestone[];
  badgeId?: string;
  rewards?: {
    xp?: number;
    badge?: string;
  };
  participantCount?: number; // Number of participants
  createdAt: Timestamp | FieldValue;
}

export interface MissionTemplate {
  templateId: string;
  type: MissionType;
  title: string;
  description: string;
  xpReward: number;
  targetProgress: number;
  durationDays: number;
}

export interface ChallengeMilestone {
  milestoneId: string;
  targetProgress: number;
  xpReward: number;
  badgeId: string | null;
}
