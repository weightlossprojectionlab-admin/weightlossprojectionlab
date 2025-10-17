// Trust & Safety Types
// PRD Reference: trust_safety_moderation, refunds_cancellations_disputes

import { Timestamp } from 'firebase/firestore';

export type CaseStatus =
  | 'new'
  | 'triage'
  | 'awaiting_evidence'
  | 'under_review'
  | 'needs_manager'
  | 'resolved'
  | 'closed';

export type CaseReason =
  | 'scam'
  | 'abuse'
  | 'payment_dispute'
  | 'harassment'
  | 'spam'
  | 'off_platform_payment'
  | 'coach_no_show'
  | 'client_no_show'
  | 'other';

export type AdminAction =
  | 'lock'
  | 'unlock'
  | 'note'
  | 'escalate'
  | 'close'
  | 'refund_full'
  | 'refund_partial'
  | 'deny'
  | 'add_strike'
  | 'remove_strike';

export type SentimentTrend = 'improving' | 'declining' | 'stable';

export type TSRole = 'ts_agent' | 'ts_lead' | 'auditor' | 'system';

export interface Evidence {
  type: 'stripe' | 'zoom' | 'app' | 'chat' | 'screenshot' | 'other';
  source: string;
  data: Record<string, any>;
  collectedAt: Timestamp;
  verifiedBy?: string;
}

export interface AdminActionRecord {
  actionId: string;
  action: AdminAction;
  executedBy: string;
  executedAt: Timestamp;
  reason: string;
  duration?: number;      // For lock (hours)
  note?: string;
  metadata?: Record<string, any>;
}

export interface ModerationCase {
  caseId: string;
  reporterId: string;
  targetId: string;        // User or group ID
  targetType: 'user' | 'group';
  status: CaseStatus;
  reason: CaseReason;
  description: string;
  riskScore: number;       // 0-100
  evidence: Evidence[];
  actions: AdminActionRecord[];
  sentimentTrend?: SentimentTrend;
  groupHealth?: number;    // 0-1.0 for group-related cases
  assignedTo?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  slaDeadline: Timestamp;
  firstResponseAt?: Timestamp;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskSignal {
  signal:
    | 'client_no_show'
    | 'coach_no_show'
    | 'dup_payment'
    | 'short_duration'
    | 'prior_disputes'
    | 'blocked_keywords'
    | 'rapid_messages'
    | 'off_platform_mention';
  weight: number;
  detected: boolean;
  metadata?: Record<string, any>;
}

export interface RiskScoreResult {
  score: number;           // 0-100
  signals: RiskSignal[];
  recommendation: 'refund_full' | 'refund_partial' | 'deny' | 'review_manual';
  confidence: number;      // 0.0-1.0
  rationale: string;
}

export interface CaseFilter {
  status?: CaseStatus[];
  reason?: CaseReason[];
  assignedTo?: string;
  priority?: ('low' | 'medium' | 'high' | 'critical')[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  riskScoreRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export interface CaseStats {
  total: number;
  byStatus: Record<CaseStatus, number>;
  byReason: Record<CaseReason, number>;
  avgResolutionTimeHours: number;
  slaBreaches: number;
  autoResolveRate: number;
  reversalRate: number;
}

export interface CoachStrike {
  strikeId: string;
  coachId: string;
  caseId: string;
  reason: string;
  issuedAt: Timestamp;
  expiresAt: Timestamp;
  removedAt?: Timestamp;
  removedBy?: string;
  removedReason?: string;
}
