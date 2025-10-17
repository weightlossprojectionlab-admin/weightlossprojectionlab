// Feature Flags for Phase 3
// PRD Reference: Phase 3 - Feature-flagged systems

export const FEATURE_FLAGS = {
  // Sponsor Perks System
  SPONSOR_PERKS_ENABLED:
    process.env.NEXT_PUBLIC_PERKS_ENABLED === 'true',

  // AI Orchestration
  AI_ORCHESTRATION_ENABLED:
    process.env.NEXT_PUBLIC_AI_ORCHESTRATION === 'true',

  // Trust & Safety Dashboard
  TRUST_SAFETY_DASHBOARD:
    process.env.NEXT_PUBLIC_TS_DASHBOARD === 'true',

  // Group Features
  GROUP_MISSIONS_ENABLED: true,  // Always on per PRD
  GROUP_TRUST_SCORES_ENABLED: true,

  // Coaching Features
  AI_COACH_ENABLED: true,
  HUMAN_COACH_ENABLED: true,

  // Analytics & Monitoring
  ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS === 'true',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] === true;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlagKey[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key as FeatureFlagKey);
}
