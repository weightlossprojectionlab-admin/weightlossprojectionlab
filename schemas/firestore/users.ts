/**
 * User-related Firestore Schema Interfaces
 * PRD: coaching_readiness_system, aisa_motivational_coaching
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type EligibilityReason = 'consistency' | 'plateau' | 'goal_struggle' | 'none';

/**
 * users/{uid}/coachingStatus
 * PRD: coaching_readiness_system.eligibility
 */
export interface CoachingStatus {
  eligible: boolean;
  eligibleReason: EligibilityReason;
  streakDays: number;
  adherence: number; // 0.0 to 1.0
  weightLogCount: number;
  aiCoachActive: boolean;
  aiCoachStartedAt: Timestamp | null;
  humanCoachEligible: boolean;
  humanCoachUnlockedAt: Timestamp | null;
  lastAnalyzedAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/aiCoachPlan/current
 * PRD: aisa_motivational_coaching.weekly_ai_coach_plan
 */
export interface AICoachPlan {
  planId: string;
  focusAreas: [string, string, string]; // Exactly 3 focus areas
  readinessLevel: number; // 1-10 scale
  fatigueLevel: number; // 0.0 to 1.0
  startDate: Timestamp | FieldValue;
  endDate: Timestamp | FieldValue;
  nextReviewAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/nudgeQueue/{id}
 * PRD: aisa_motivational_coaching.nudge_delivery
 */
export interface NudgeQueue {
  nudgeId: string;
  type: 'motivational' | 'educational' | 'challenge' | 'social';
  intent: string;
  windowStart: Timestamp | FieldValue;
  windowEnd: Timestamp | FieldValue;
  status: 'pending' | 'sent' | 'acted' | 'expired' | 'skipped';
  channel: 'push' | 'email' | 'in_app';
  copyKey: string; // Reference to message template
  content?: string; // Optional rendered message content for display
  abVariant: string;
  sentAt: Timestamp | null;
  actedAt: Timestamp | null;
  createdAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/coachTelemetry/daily
 * PRD: aisa_motivational_coaching.coach_telemetry
 */
export interface CoachTelemetry {
  date: string; // YYYY-MM-DD format
  nudgesSent: number;
  nudgesActed: number;
  completionMap: Record<string, boolean>; // missionId -> completed
  fatigueScore: number; // 0.0 to 1.0
  engagementScore: number; // 0.0 to 1.0
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/profile
 * Core user profile data
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  timezone: string; // IANA timezone (e.g., 'America/New_York')
  quietHoursStart: number; // Hour in 24h format (e.g., 22)
  quietHoursEnd: number; // Hour in 24h format (e.g., 7)
  createdAt: Timestamp | FieldValue;
  lastActiveAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/weightLogs/{id}
 * Weight tracking logs
 */
export interface WeightLog {
  logId: string;
  weight: number; // in kg
  loggedAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
}

/**
 * users/{uid}/mealLogs/{id}
 * Meal tracking logs
 */
export interface MealLog {
  logId: string;
  photoHash: string; // SHA-256 hash for duplicate detection
  calories: number;
  loggedAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
}
