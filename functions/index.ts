/**
 * WPL Functions Index
 * Exports all business logic functions for Phase 2
 */

// Coaching System
export {
  analyzeUserProgress,
  unlockCoachingIfEligible,
  startAICoachPlan,
  reviewAICoachOutcome,
} from './coaching/readiness';

export {
  buildWeeklyAICoachPlan,
  scheduleDailyNudges,
  deliverNudges,
  trackNudgeOutcome,
  abOptimizeNudges,
} from './coaching/ai_coach';

// Engagement System
export {
  assignWeeklyMissions,
  onMissionProgress,
  onMissionComplete,
  assignWeeklyMissionsToAllUsers,
  checkExpiredMissions,
} from './engagement/retention';

export {
  assignGroupMissions,
  updateGroupProgress,
  onGroupMissionComplete,
  calculateTrustScore,
  checkInactiveMember,
  recordSupportAction,
  calculateAllTrustScores,
  checkAllInactiveMembers,
} from './engagement/group_missions';

export {
  onXPEventWrite,
  generatePhotoHash,
  getUserXPStats,
  recalculateUserLevel,
} from './engagement/xp_integrity';

// Health Monitoring
export {
  sendVitalReminders,
  checkMissedVitals,
  generateDailyComplianceReports
} from './health/vital-reminders';

// Schedulers
export { SCHEDULERS, getSchedulerConfig, listSchedulers } from './schedulers';
