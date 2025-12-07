/**
 * Scheduler Configurations
 * PRD: Various system schedulers
 *
 * Defines cron schedules for all background jobs
 * Note: These are configuration definitions. Actual scheduling would be done
 * via Firebase Functions scheduler, AWS EventBridge, or similar service.
 */

import { analyzeUserProgress, reviewAICoachOutcome } from './coaching/readiness';
import { buildWeeklyAICoachPlan, deliverNudges } from './coaching/ai_coach';
import {
  assignWeeklyMissionsToAllUsers,
  checkExpiredMissions,
} from './engagement/retention';
import {
  assignGroupMissions,
  calculateAllTrustScores,
  checkAllInactiveMembers,
} from './engagement/group_missions';
import {
  sendVitalReminders,
  checkMissedVitals,
  generateDailyComplianceReports
} from './health/vital-reminders';

/**
 * Scheduler definitions matching PRD requirements
 */
export const SCHEDULERS = {
  // Nightly user progress analysis
  // PRD: coaching_readiness_system.nightly_analysis
  // Schedule: 02:00 local time daily
  analyzeUserProgress: {
    name: 'analyzeUserProgress',
    schedule: '0 2 * * *', // Cron: 02:00 daily
    timezone: 'local', // Per-user timezone
    handler: analyzeUserProgress,
    description: 'Analyze user progress and update coaching eligibility',
  },

  // Weekly AI coach plan building
  // PRD: aisa_motivational_coaching.weekly_ai_coach_plan
  // Schedule: Monday 06:00 local time
  buildWeeklyAICoachPlan: {
    name: 'buildWeeklyAICoachPlan',
    schedule: '0 6 * * 1', // Cron: 06:00 every Monday
    timezone: 'local',
    handler: buildWeeklyAICoachPlan,
    description: 'Build weekly AI coach plans for active users',
  },

  // Nudge delivery
  // PRD: aisa_motivational_coaching.nudge_delivery
  // Schedule: Every 10 minutes
  deliverNudges: {
    name: 'deliverNudges',
    schedule: '*/10 * * * *', // Cron: Every 10 minutes
    timezone: 'UTC',
    handler: deliverNudges,
    description: 'Deliver pending nudges to users',
  },

  // Weekly mission assignment
  // PRD: retention_loop_system.weekly_missions
  // Schedule: Monday 07:00 local time
  assignWeeklyMissions: {
    name: 'assignWeeklyMissions',
    schedule: '0 7 * * 1', // Cron: 07:00 every Monday
    timezone: 'local',
    handler: assignWeeklyMissionsToAllUsers,
    description: 'Assign weekly missions to all active users',
  },

  // Check expired missions
  // Schedule: Daily 00:00 local time
  checkExpiredMissions: {
    name: 'checkExpiredMissions',
    schedule: '0 0 * * *', // Cron: 00:00 daily
    timezone: 'local',
    handler: checkExpiredMissions,
    description: 'Archive expired missions',
  },

  // Calculate trust scores
  // PRD: social_retention_and_group_missions.trust_score
  // Schedule: Daily 03:00 local time
  calculateTrustScores: {
    name: 'calculateTrustScores',
    schedule: '0 3 * * *', // Cron: 03:00 daily
    timezone: 'UTC',
    handler: calculateAllTrustScores,
    description: 'Calculate trust scores for all group members',
  },

  // Check inactive members
  // PRD: social_retention_and_group_missions.inactive_member_detection
  // Schedule: Daily 09:00 local time
  checkInactiveMembers: {
    name: 'checkInactiveMembers',
    schedule: '0 9 * * *', // Cron: 09:00 daily
    timezone: 'UTC',
    handler: checkAllInactiveMembers,
    description: 'Check for inactive group members and create recovery missions',
  },

  // AI coach outcome review
  // PRD: coaching_readiness_system.human_coach_unlock
  // Schedule: Daily 04:00 local time
  reviewAICoachOutcome: {
    name: 'reviewAICoachOutcome',
    schedule: '0 4 * * *', // Cron: 04:00 daily
    timezone: 'local',
    handler: reviewAICoachOutcome,
    description: 'Review AI coach outcomes and unlock human coaching if eligible',
  },

  // Vital reminders
  // Schedule: Every 15 minutes
  sendVitalReminders: {
    name: 'sendVitalReminders',
    schedule: '*/15 * * * *', // Cron: Every 15 minutes
    timezone: 'UTC',
    handler: sendVitalReminders,
    description: 'Send vital sign monitoring reminders to users',
  },

  // Check missed vitals
  // Schedule: Daily 02:00 UTC
  checkMissedVitals: {
    name: 'checkMissedVitals',
    schedule: '0 2 * * *', // Cron: 02:00 daily
    timezone: 'UTC',
    handler: checkMissedVitals,
    description: 'Mark vitals as missed if past compliance window',
  },

  // Generate compliance reports
  // Schedule: Daily 03:00 UTC
  generateDailyComplianceReports: {
    name: 'generateDailyComplianceReports',
    schedule: '0 3 * * *', // Cron: 03:00 daily
    timezone: 'UTC',
    handler: generateDailyComplianceReports,
    description: 'Generate daily compliance reports for all active schedules',
  },
};

/**
 * Example: Firebase Functions implementation
 * These are example implementations commented out for reference.
 * Uncomment and adapt when deploying to Firebase Functions.
 *
 * Example functions would use firebase-functions and schedule jobs like:
 * - scheduledAnalyzeUserProgress: runs at 02:00 UTC daily
 * - scheduledDeliverNudges: runs every 10 minutes
 * - scheduledAssignWeeklyMissions: runs Monday 07:00 UTC
 * - scheduledCalculateTrustScores: runs at 03:00 UTC daily
 * - scheduledCheckInactiveMembers: runs at 09:00 UTC daily
 */

/**
 * Manual trigger functions for testing
 */
export async function triggerAllSchedulers() {
  console.log('Triggering all schedulers for testing...');

  // This would be used in development/testing to manually trigger schedulers
  // In production, use actual cron/scheduled jobs
}

/**
 * Get scheduler configuration by name
 */
export function getSchedulerConfig(name: string) {
  return Object.values(SCHEDULERS).find(s => s.name === name);
}

/**
 * List all scheduler configurations
 */
export function listSchedulers() {
  return Object.values(SCHEDULERS).map(s => ({
    name: s.name,
    schedule: s.schedule,
    description: s.description,
  }));
}
