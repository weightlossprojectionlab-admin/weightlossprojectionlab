/**
 * Firestore Collection Names Constants
 *
 * Single source of truth for all Firestore collection names.
 * Using constants prevents typos and provides type safety.
 *
 * USAGE:
 *   import { COLLECTIONS, SUBCOLLECTIONS } from '@/constants/firestore'
 *   const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get()
 *   const weightLogs = await userRef.collection(SUBCOLLECTIONS.USERS.WEIGHT_LOGS).get()
 */

// ============================================================================
// ROOT COLLECTIONS
// ============================================================================

/**
 * Top-level Firestore collections
 */
export const COLLECTIONS = {
  // ===== Core User & Profile =====

  /** User profiles and account data */
  USERS: 'users',

  // ===== Nutrition & Recipes =====

  /** Recipe database with nutritional information */
  RECIPES: 'recipes',

  /** Meal logging entries */
  MEAL_LOGS: 'meal_logs',

  /** Meal templates for quick logging */
  MEAL_TEMPLATES: 'meal_templates',

  /** Active cooking sessions */
  COOKING_SESSIONS: 'cooking_sessions',

  /** Queued recipes for future cooking */
  QUEUED_RECIPES: 'queued_recipes',

  // ===== Shopping & Products =====

  /** Global product database with barcode information */
  PRODUCT_DATABASE: 'product_database',

  /** ML-generated product associations (frequently bought together) */
  PRODUCT_ASSOCIATIONS: 'product_associations',

  /** Shopping items (legacy - consider deprecating in favor of subcollection) */
  SHOPPING_ITEMS: 'shopping_items',

  // ===== Health Vitals (HIPAA-sensitive) =====

  /** Blood sugar/glucose measurements */
  BLOOD_SUGAR_LOGS: 'blood-sugar-logs',

  /** Blood pressure readings */
  BLOOD_PRESSURE_LOGS: 'blood-pressure-logs',

  /** Exercise and activity logs */
  EXERCISE_LOGS: 'exercise-logs',

  /** Weight tracking logs (root level - consider deprecating) */
  WEIGHT_LOGS: 'weight_logs',

  /** Step count logs (root level - consider deprecating) */
  STEP_LOGS: 'step_logs',

  // ===== AI & Decision Tracking =====

  /** AI decision logs for transparency and debugging */
  AI_DECISIONS: 'ai_decisions',

  /** User disputes of AI decisions */
  DISPUTES: 'disputes',

  // ===== Admin & Audit =====

  /** Admin action audit trail */
  ADMIN_AUDIT_LOGS: 'admin_audit_logs',

  // ===== Social & Groups =====

  /** Social groups for group missions and support */
  GROUPS: 'groups',

  // ===== Gamification =====

  /** XP integrity audit logs */
  XP_AUDIT: 'xp_audit',

  // ===== System =====

  /** System-wide configuration and metadata */
  SYSTEM: 'system',
} as const

// ============================================================================
// SUBCOLLECTIONS
// ============================================================================

/**
 * Subcollections organized by parent collection
 *
 * IMPORTANT: These are subcollections and must be accessed via parent document:
 *   db.collection(COLLECTIONS.USERS).doc(uid).collection(SUBCOLLECTIONS.USERS.WEIGHT_LOGS)
 */
export const SUBCOLLECTIONS = {
  /**
   * Subcollections under users/{userId}/
   */
  USERS: {
    /** Weight tracking logs per user */
    WEIGHT_LOGS: 'weightLogs',

    /** Daily step count logs */
    STEP_LOGS: 'stepLogs',

    /** Meal logging entries per user */
    MEAL_LOGS: 'mealLogs',

    /** User statistics (current stats stored in 'current' doc) */
    STATS: 'stats',

    /** Shopping list items per user */
    SHOPPING_LIST: 'shopping_list',

    // === Gamification ===

    /** Daily XP tracking per user */
    XP_DAILY: 'xp_daily',

    /** XP event history */
    XP_HISTORY: 'xp_history',

    /** Active missions for user */
    MISSIONS_ACTIVE: 'missions_active',

    /** Completed/failed mission history */
    MISSIONS_HISTORY: 'missions_history',

    // === AI Coaching ===

    /** Queue of AI nudges to be delivered */
    NUDGE_QUEUE: 'nudgeQueue',

    /** Daily telemetry for AI coach */
    COACH_TELEMETRY: 'coachTelemetry',

    /** User's coaching status (current status in 'current' doc) */
    COACHING_STATUS: 'coachingStatus',

    /** AI-generated coaching plan */
    AI_COACH_PLAN: 'aiCoachPlan',

    /** AI-managed health profile for personalization */
    AI_HEALTH_PROFILE: 'aiHealthProfile',
  },

  /**
   * Subcollections under groups/{groupId}/
   */
  GROUPS: {
    /** Social missions for group challenges */
    SOCIAL_MISSIONS: 'socialMissions',

    /** Support actions between group members */
    SUPPORT_ACTIONS: 'supportActions',

    /** Group member profiles */
    MEMBERS: 'members',

    /** Recovery missions for lapsed members */
    RECOVERY_MISSIONS: 'recoveryMissions',
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Union type of all root collection names */
export type CollectionKey = keyof typeof COLLECTIONS
export type CollectionName = (typeof COLLECTIONS)[CollectionKey]

/** Union type of all user subcollection names */
export type UserSubcollectionKey = keyof typeof SUBCOLLECTIONS.USERS
export type UserSubcollectionName = (typeof SUBCOLLECTIONS.USERS)[UserSubcollectionKey]

/** Union type of all group subcollection names */
export type GroupSubcollectionKey = keyof typeof SUBCOLLECTIONS.GROUPS
export type GroupSubcollectionName = (typeof SUBCOLLECTIONS.GROUPS)[GroupSubcollectionKey]

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Get full path for a user subcollection
 * @param userId - User document ID
 * @param subcollection - Subcollection name from SUBCOLLECTIONS.USERS
 * @returns Full path like "users/{userId}/weightLogs"
 */
export function getUserSubcollectionPath(
  userId: string,
  subcollection: UserSubcollectionName
): string {
  return `${COLLECTIONS.USERS}/${userId}/${subcollection}`
}

/**
 * Get full path for a group subcollection
 * @param groupId - Group document ID
 * @param subcollection - Subcollection name from SUBCOLLECTIONS.GROUPS
 * @returns Full path like "groups/{groupId}/members"
 */
export function getGroupSubcollectionPath(
  groupId: string,
  subcollection: GroupSubcollectionName
): string {
  return `${COLLECTIONS.GROUPS}/${groupId}/${subcollection}`
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a string is a valid root collection name
 */
export function isValidCollection(name: string): name is CollectionName {
  return Object.values(COLLECTIONS).includes(name as CollectionName)
}

/**
 * Check if a string is a valid user subcollection name
 */
export function isValidUserSubcollection(name: string): name is UserSubcollectionName {
  return Object.values(SUBCOLLECTIONS.USERS).includes(name as UserSubcollectionName)
}

/**
 * Check if a string is a valid group subcollection name
 */
export function isValidGroupSubcollection(name: string): name is GroupSubcollectionName {
  return Object.values(SUBCOLLECTIONS.GROUPS).includes(name as GroupSubcollectionName)
}
