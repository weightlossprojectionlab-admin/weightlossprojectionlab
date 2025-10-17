// Sponsor Perks Types
// PRD Reference: Phase 3 - Sponsor Perks feature-flagged system

import { Timestamp } from 'firebase/firestore';

export type PerkTier = 'Bronze' | 'Silver' | 'Champion';
export type RedemptionType = 'code' | 'link' | 'webhook';
export type RedemptionStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface Perk {
  perkId: string;
  partnerId: string;
  partnerName: string;
  partnerLogo?: string;
  title: string;
  description: string;
  value: string;           // "$10 off", "Free month", "20% discount"
  tier: PerkTier;
  redemptionType: RedemptionType;
  redemptionUrl?: string;
  webhookUrl?: string;
  termsUrl?: string;
  maxRedemptionsPerUser: number;
  totalAvailable?: number;
  remainingCount?: number;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  enabled: boolean;
  category: string;        // "Fitness", "Nutrition", "Wellness", etc.
  imageUrl?: string;
}

export interface PerkRedemption {
  redemptionId: string;
  userId: string;
  perkId: string;
  partnerId: string;
  redeemedAt: Timestamp;
  expiresAt: Timestamp;
  code?: string;
  link?: string;
  status: RedemptionStatus;
  webhookVerified: boolean;
  webhookVerifiedAt?: Timestamp;
  usedAt?: Timestamp;
  revokedAt?: Timestamp;
  revokedReason?: string;
  metadata?: Record<string, any>;
}

export interface EligibilityCheck {
  eligible: boolean;
  tier: PerkTier;
  totalXP: number;
  xpToNextTier: number;
  optInRequired: boolean;
  optInStatus: boolean;
  blockers: string[];      // Reasons if not eligible
}

export interface WebhookVerificationPayload {
  redemptionId: string;
  userId: string;
  perkId: string;
  timestamp: string;
  signature: string;       // HMAC signature for security
}

export interface WebhookVerificationResponse {
  verified: boolean;
  code?: string;
  link?: string;
  expiresAt?: string;
  error?: string;
}

export interface PerksData {
  eligible: boolean;
  tier: PerkTier;
  totalXP: number;
  xpToNextTier: number;
  availablePerks: Perk[];
  redeemedPerks: PerkRedemption[];
  redemptionsRemaining: Record<string, number>;  // perkId -> count
}

// XP thresholds per tier
export const XP_TIER_THRESHOLDS: Record<PerkTier, number> = {
  Bronze: 0,
  Silver: 5000,
  Champion: 10000,
};
