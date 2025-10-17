/**
 * PRD v1.3.7 Reference Constants
 *
 * This file exports typed string constants that map to specific paths
 * in the WLPL PRD JSON structure. Use these in TODO comments to maintain
 * traceability between code and product requirements.
 */

export const PRD_REFS = {
  // Coaching Readiness System
  COACHING_READINESS: {
    ROOT: 'coaching_readiness_system',
    ELIGIBILITY: 'coaching_readiness_system.eligibility',
    CONSISTENCY_UNLOCK: 'coaching_readiness_system.eligibility.consistency_unlock',
    PLATEAU_UNLOCK: 'coaching_readiness_system.eligibility.plateau_unlock',
    GOAL_STRUGGLE_UNLOCK: 'coaching_readiness_system.eligibility.goal_struggle_unlock',
    NIGHTLY_ANALYSIS: 'coaching_readiness_system.nightly_analysis',
    AI_COACH_STAGE: 'coaching_readiness_system.ai_coach_stage_1',
    HUMAN_COACH_UNLOCK: 'coaching_readiness_system.human_coach_unlock',
  },

  // AISA Motivational Coaching
  AISA_COACHING: {
    ROOT: 'aisa_motivational_coaching',
    WEEKLY_PLAN: 'aisa_motivational_coaching.weekly_ai_coach_plan',
    NUDGE_DELIVERY: 'aisa_motivational_coaching.nudge_delivery',
    QUIET_HOURS: 'aisa_motivational_coaching.nudge_delivery.quiet_hours',
    DAILY_LIMIT: 'aisa_motivational_coaching.nudge_delivery.daily_limit',
    AB_OPTIMIZATION: 'aisa_motivational_coaching.ab_optimization',
    TELEMETRY: 'aisa_motivational_coaching.coach_telemetry',
  },

  // Retention Loop System
  RETENTION: {
    ROOT: 'retention_loop_system',
    WEEKLY_MISSIONS: 'retention_loop_system.weekly_missions',
    SEASONAL_CHALLENGES: 'retention_loop_system.seasonal_challenges',
    MISSION_PROGRESS: 'retention_loop_system.mission_progress_tracking',
    XP_AWARDS: 'retention_loop_system.xp_awards',
  },

  // Social Retention & Group Missions
  SOCIAL: {
    ROOT: 'social_retention_and_group_missions',
    GROUP_MISSIONS: 'social_retention_and_group_missions.group_missions',
    SHARED_XP: 'social_retention_and_group_missions.shared_xp_calculation',
    TRUST_SCORE: 'social_retention_and_group_missions.trust_score',
    GROUP_RECOVERY: 'social_retention_and_group_missions.group_recovery_missions',
    INACTIVE_DETECTION: 'social_retention_and_group_missions.inactive_member_detection',
  },

  // XP Fairness & Integrity
  XP_INTEGRITY: {
    ROOT: 'xp_fairness_and_integrity',
    DAILY_CAP: 'xp_fairness_and_integrity.daily_soft_cap',
    REPEAT_PENALTY: 'xp_fairness_and_integrity.repeat_action_penalty',
    DUPLICATE_DETECTION: 'xp_fairness_and_integrity.duplicate_detection',
    GRACE_DAY: 'xp_fairness_and_integrity.grace_day_mechanics',
    AUDIT_LOG: 'xp_fairness_and_integrity.audit_log',
  },

  // AI & Data Governance
  GOVERNANCE: {
    ROOT: 'ai_and_data_governance',
    PII_HANDLING: 'ai_and_data_governance.pii_handling',
    PROMPT_LOGGING: 'ai_and_data_governance.prompt_logging_rules',
  },
} as const;

export type PrdRefPath = typeof PRD_REFS[keyof typeof PRD_REFS][keyof typeof PRD_REFS[keyof typeof PRD_REFS]];
