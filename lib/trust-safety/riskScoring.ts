// Trust & Safety Risk Scoring
// PRD Reference: trust_safety_moderation.automation.risk_score (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § trust_safety_moderation.automation.risk_score

import { RiskSignal, RiskScoreResult, ModerationCase, Evidence } from '@/types/trust-safety';
import { JsonObject } from '@/types/common';

/**
 * Risk signal weights (0-100 contribution)
 * PRD signals: client_no_show, coach_no_show, dup_payment, short_duration, prior_disputes
 */
const SIGNAL_WEIGHTS: Record<RiskSignal['signal'], number> = {
  coach_no_show: 35,        // High weight - clear coach fault
  client_no_show: 10,       // Lower weight - ambiguous
  dup_payment: 25,          // High weight - payment issues
  short_duration: 15,       // Medium weight - could be legitimate
  prior_disputes: 20,       // Medium weight - pattern detection
  blocked_keywords: 30,     // High weight - scam indicators
  rapid_messages: 10,       // Low weight - could be enthusiasm
  off_platform_mention: 40, // Very high weight - policy violation
};

/**
 * PRD Recommendations matrix:
 * >=70: refund_full
 * 40-69: refund_partial
 * <40: deny
 */
const RECOMMENDATION_THRESHOLDS = {
  FULL_REFUND: 70,
  PARTIAL_REFUND: 40,
  DENY: 0,
};

/**
 * Calculate risk score for a moderation case
 * PRD Reference: Range 0-100, signals-based calculation
 *
 * @param caseData - Moderation case data
 * @returns Risk score result with signals and recommendation
 */
export function calculateRiskScore(caseData: {
  reason: string;
  evidence: Evidence[];
  targetHistory?: {
    priorDisputes?: number;
    completedSessions?: number;
    avgSessionDuration?: number;
  };
  metadata?: JsonObject;
}): RiskScoreResult {
  const signals: RiskSignal[] = [];
  let totalScore = 0;

  // Detect signals based on evidence and metadata
  const detectedSignals = detectRiskSignals(caseData);

  for (const signal of detectedSignals) {
    if (signal.detected) {
      signals.push(signal);
      totalScore += SIGNAL_WEIGHTS[signal.signal] * signal.weight;
    }
  }

  // Cap at 100
  const score = Math.min(100, Math.round(totalScore));

  // Determine recommendation
  let recommendation: RiskScoreResult['recommendation'];
  if (score >= RECOMMENDATION_THRESHOLDS.FULL_REFUND) {
    recommendation = 'refund_full';
  } else if (score >= RECOMMENDATION_THRESHOLDS.PARTIAL_REFUND) {
    recommendation = 'refund_partial';
  } else {
    recommendation = 'deny';
  }

  // Calculate confidence based on signal count and consistency
  const confidence = calculateConfidence(signals, score);

  // Generate rationale
  const rationale = generateRationale(signals, score, recommendation);

  return {
    score,
    signals,
    recommendation,
    confidence,
    rationale,
  };
}

/**
 * Detect risk signals from case data
 */
function detectRiskSignals(caseData: {
  reason: string;
  evidence: Evidence[];
  targetHistory?: {
    priorDisputes?: number;
    completedSessions?: number;
    avgSessionDuration?: number;
  };
  metadata?: JsonObject;
}): RiskSignal[] {
  const signals: RiskSignal[] = [];

  // Coach no-show detection
  if (caseData.reason === 'coach_no_show') {
    signals.push({
      signal: 'coach_no_show',
      weight: 1.0,
      detected: true,
      metadata: { reason: caseData.reason },
    });
  }

  // Client no-show detection
  if (caseData.reason === 'client_no_show') {
    signals.push({
      signal: 'client_no_show',
      weight: 1.0,
      detected: true,
      metadata: { reason: caseData.reason },
    });
  }

  // Duplicate payment detection
  const hasZoomEvidence = caseData.evidence.some((e) => e.type === 'zoom');
  const hasStripeEvidence = caseData.evidence.some((e) => e.type === 'stripe');
  if (hasStripeEvidence && caseData.metadata?.duplicatePayment) {
    signals.push({
      signal: 'dup_payment',
      weight: 1.0,
      detected: true,
      metadata: { duplicateCount: caseData.metadata.duplicatePayment },
    });
  }

  // Short duration detection (session < 10 minutes)
  if (hasZoomEvidence) {
    const zoomData = caseData.evidence.find((e) => e.type === 'zoom')?.data;
    const duration = zoomData?.duration;
    if (typeof duration === 'number' && duration < 600) {  // 10 minutes in seconds
      signals.push({
        signal: 'short_duration',
        weight: 0.8,
        detected: true,
        metadata: { duration },
      });
    }
  }

  // Prior disputes detection
  if (caseData.targetHistory?.priorDisputes && caseData.targetHistory.priorDisputes > 0) {
    const weight = Math.min(1.0, caseData.targetHistory.priorDisputes * 0.3);
    signals.push({
      signal: 'prior_disputes',
      weight,
      detected: true,
      metadata: { count: caseData.targetHistory.priorDisputes },
    });
  }

  // Blocked keywords detection (PRD: scam prevention)
  const blockedKeywords = ['cashapp', 'venmo', 'paypal', 'btc', 'crypto', 'wire', 'western union'];
  const chatEvidence = caseData.evidence.find((e) => e.type === 'chat');
  if (chatEvidence?.data?.messages) {
    const messages = chatEvidence.data.messages as string[];
    const foundKeywords = blockedKeywords.filter((kw) =>
      messages.some((msg) => msg.toLowerCase().includes(kw))
    );
    if (foundKeywords.length > 0) {
      signals.push({
        signal: 'blocked_keywords',
        weight: 1.0,
        detected: true,
        metadata: { keywords: foundKeywords },
      });
    }
  }

  // Off-platform payment mention
  if (caseData.reason === 'off_platform_payment' || caseData.metadata?.offPlatformMention) {
    signals.push({
      signal: 'off_platform_mention',
      weight: 1.0,
      detected: true,
      metadata: { reason: caseData.reason },
    });
  }

  return signals;
}

/**
 * Calculate confidence in risk assessment
 * More signals + higher agreement = higher confidence
 */
function calculateConfidence(signals: RiskSignal[], score: number): number {
  if (signals.length === 0) return 0.3;  // Low confidence with no signals

  // Base confidence on signal count
  let confidence = Math.min(0.9, 0.4 + (signals.length * 0.15));

  // Reduce confidence if score is in ambiguous range (35-75)
  if (score >= 35 && score <= 75) {
    confidence *= 0.85;
  }

  // Increase confidence for extreme scores
  if (score >= 85 || score <= 15) {
    confidence = Math.min(1.0, confidence * 1.15);
  }

  return Math.round(confidence * 100) / 100;
}

/**
 * Generate human-readable rationale
 */
function generateRationale(
  signals: RiskSignal[],
  score: number,
  recommendation: string
): string {
  if (signals.length === 0) {
    return 'No risk signals detected. Low confidence assessment.';
  }

  const signalDescriptions = signals
    .filter((s) => s.detected)
    .map((s) => {
      switch (s.signal) {
        case 'coach_no_show':
          return 'Coach no-show confirmed';
        case 'client_no_show':
          return 'Client no-show reported';
        case 'dup_payment':
          return 'Duplicate payment detected';
        case 'short_duration':
          return `Session unusually short (${s.metadata?.duration}s)`;
        case 'prior_disputes':
          return `${s.metadata?.count} prior dispute(s)`;
        case 'blocked_keywords':
          return `Scam keywords detected: ${s.metadata?.keywords?.join(', ')}`;
        case 'off_platform_mention':
          return 'Off-platform payment mentioned';
        default:
          return s.signal;
      }
    });

  const rationale = `Risk score ${score}/100. Detected: ${signalDescriptions.join(', ')}. Recommendation: ${recommendation.replace('_', ' ')}.`;

  return rationale;
}

/**
 * Auto-resolve case if confidence and score are high enough
 * PRD: auto_resolve_threshold = 0.8
 *
 * @param riskResult - Risk score result
 * @returns Whether case can be auto-resolved
 */
export function canAutoResolve(riskResult: RiskScoreResult): boolean {
  const AUTO_RESOLVE_THRESHOLD = 0.8;

  if (riskResult.confidence < AUTO_RESOLVE_THRESHOLD) {
    return false;
  }

  // Only auto-resolve clear cases (very high or very low scores)
  if (riskResult.score >= 85 || riskResult.score <= 15) {
    return true;
  }

  return false;
}
