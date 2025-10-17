/**
 * XP & Integrity Firestore Schema Interfaces
 * PRD: xp_fairness_and_integrity
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type XPEventType = 'weight_log' | 'meal_log' | 'mission_complete' | 'group_mission_complete' | 'support_action' | 'streak_bonus';

/**
 * xp_audit/{eventId}
 * PRD: xp_fairness_and_integrity.audit_log
 */
export interface XPAuditLog {
  eventId: string;
  uid: string;
  eventType: XPEventType;
  baseXP: number;
  multiplier: number; // Applied penalty or bonus
  finalXP: number;
  reason: string; // Why this multiplier was applied
  isDuplicate: boolean;
  isWithinDailyCap: boolean;
  dailyXPBeforeEvent: number;
  dailyXPAfterEvent: number;
  metadata: Record<string, any>; // Event-specific data (e.g., photo hash, weight delta)
  timestamp: Timestamp | FieldValue;
}

/**
 * users/{uid}/xp_daily/{date}
 * Daily XP tracking for cap enforcement
 * PRD: xp_fairness_and_integrity.daily_soft_cap
 */
export interface DailyXPTracker {
  date: string; // YYYY-MM-DD format
  totalXP: number;
  eventCounts: Record<XPEventType, number>;
  isGraceDay: boolean;
  softCapReached: boolean;
  updatedAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/xp_history/{eventId}
 * User's XP event history
 */
export interface UserXPEvent {
  eventId: string;
  eventType: XPEventType;
  xpAwarded: number;
  timestamp: Timestamp | FieldValue;
}

/**
 * users/{uid}/stats
 * User's aggregate XP and stats
 */
export interface UserStats {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  missionsCompleted: number;
  weightLogsCount: number;
  mealLogsCount: number;
  updatedAt: Timestamp | FieldValue;
}
