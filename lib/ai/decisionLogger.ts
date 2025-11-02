// AI Decision Logger
// PRD Reference: ai_and_data_governance.ai_decision_governance (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § ai_and_data_governance.ai_decision_governance

import { adminDb } from '../firebase-admin';
import { AIDecisionLog, ModelTier, DataSensitivity } from '@/types/ai';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * Log an AI decision to Firestore for audit trail
 * PRD Requirement: retention_period_days = 365
 *
 * @param decision - AI decision log entry
 * @returns Decision ID
 */
export async function logAIDecision(
  decision: Omit<AIDecisionLog, 'decisionId' | 'timestamp'>
): Promise<string> {
  try {
    const decisionRef = adminDb.collection('ai_decisions').doc();
    const decisionId = decisionRef.id;

    const logEntry: AIDecisionLog = {
      decisionId,
      timestamp: Timestamp.now() as any,
      ...decision,
    };

    await decisionRef.set(logEntry);

    logger.info(`[AI Decision Logged] ID: ${decisionId}, Confidence: ${decision.confidence}`);

    return decisionId;
  } catch (error) {
    logger.error('[AI Decision Logger] Error logging decision', error as Error);
    throw new Error('Failed to log AI decision');
  }
}

/**
 * Retrieve AI decision by ID
 *
 * @param decisionId - Decision ID
 * @returns AI decision log or null
 */
export async function getAIDecision(
  decisionId: string
): Promise<AIDecisionLog | null> {
  try {
    const doc = await adminDb.collection('ai_decisions').doc(decisionId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as AIDecisionLog;
  } catch (error) {
    logger.error('[AI Decision Logger] Error retrieving decision', error as Error);
    return null;
  }
}

/**
 * Mark decision for human review
 * PRD: Confidence < 0.6 auto-escalates
 *
 * @param decisionId - Decision ID
 * @param reviewedBy - Reviewer ID
 * @param notes - Review notes
 */
export async function markForReview(
  decisionId: string,
  reviewedBy: string,
  notes?: string
): Promise<void> {
  try {
    await adminDb.collection('ai_decisions').doc(decisionId).update({
      reviewedBy,
      reviewedAt: Timestamp.now(),
      metadata: {
        reviewNotes: notes || '',
      },
    });

    logger.info(`[AI Decision] Marked for review: ${decisionId} by ${reviewedBy}`);
  } catch (error) {
    logger.error('[AI Decision Logger] Error marking for review', error as Error);
    throw error;
  }
}

/**
 * Reverse an AI decision (manual override)
 * PRD: manual_override_allowed = true, reversal_logging = true
 *
 * @param decisionId - Decision ID
 * @param reversalReason - Reason for reversal
 * @param reviewedBy - Reviewer performing reversal
 */
export async function reverseDecision(
  decisionId: string,
  reversalReason: string,
  reviewedBy: string
): Promise<void> {
  try {
    await adminDb.collection('ai_decisions').doc(decisionId).update({
      reversalReason,
      reviewedBy,
      reviewedAt: Timestamp.now(),
    });

    logger.info(`[AI Decision] Reversed: ${decisionId} - Reason: ${reversalReason}`);
  } catch (error) {
    logger.error('[AI Decision Logger] Error reversing decision', error as Error);
    throw error;
  }
}

/**
 * Query AI decisions with filters
 *
 * @param filters - Query filters
 * @returns Array of AI decisions
 */
export async function queryAIDecisions(filters: {
  executedBy?: 'AISA' | 'system';
  confidenceThreshold?: number;
  dataSensitivity?: DataSensitivity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AIDecisionLog[]> {
  try {
    let query = adminDb.collection('ai_decisions').orderBy('timestamp', 'desc');

    if (filters.executedBy) {
      query = query.where('executedBy', '==', filters.executedBy) as any;
    }

    if (filters.dataSensitivity) {
      query = query.where('dataSensitivity', '==', filters.dataSensitivity) as any;
    }

    if (filters.confidenceThreshold !== undefined) {
      query = query.where('confidence', '<', filters.confidenceThreshold) as any;
    }

    if (filters.startDate) {
      query = query.where('timestamp', '>=', Timestamp.fromDate(filters.startDate)) as any;
    }

    if (filters.endDate) {
      query = query.where('timestamp', '<=', Timestamp.fromDate(filters.endDate)) as any;
    }

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    } else {
      query = query.limit(100) as any;  // Default limit
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as AIDecisionLog);
  } catch (error) {
    logger.error('[AI Decision Logger] Error querying decisions', error as Error);
    return [];
  }
}

/**
 * Get decisions requiring review (confidence < threshold)
 * PRD: auto_resolve_threshold = 0.8, escalation_process: confidence < 0.6 auto-escalates
 *
 * @param confidenceThreshold - Threshold below which review is required (default 0.6)
 * @param limit - Max results
 * @returns Decisions requiring review
 */
export async function getDecisionsRequiringReview(
  confidenceThreshold = 0.6,
  limit = 50
): Promise<AIDecisionLog[]> {
  return queryAIDecisions({
    confidenceThreshold,
    limit,
  });
}

/**
 * Cleanup old AI decisions (retention policy enforcement)
 * PRD: retention_period_days = 365
 *
 * Should be run as a scheduled job
 */
export async function cleanupOldDecisions(retentionDays = 365): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const snapshot = await adminDb
      .collection('ai_decisions')
      .where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      .limit(500)  // Batch delete
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`[AI Decision Logger] Cleaned up ${snapshot.size} old decisions`);

    return snapshot.size;
  } catch (error) {
    logger.error('[AI Decision Logger] Error cleaning up old decisions', error as Error);
    return 0;
  }
}

/**
 * Get decision statistics
 *
 * @param days - Number of days to analyze
 * @returns Statistics object
 */
export async function getDecisionStats(days = 30): Promise<{
  total: number;
  avgConfidence: number;
  lowConfidenceCount: number;
  byModel: Record<string, number>;
  bySensitivity: Record<DataSensitivity, number>;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const decisions = await queryAIDecisions({
      startDate,
      limit: 10000,  // Large limit for stats
    });

    const stats = {
      total: decisions.length,
      avgConfidence: 0,
      lowConfidenceCount: 0,
      byModel: {} as Record<string, number>,
      bySensitivity: {
        Public: 0,
        PII: 0,
        PHI: 0,
        Financial: 0,
      } as Record<DataSensitivity, number>,
    };

    if (decisions.length === 0) return stats;

    let totalConfidence = 0;

    for (const decision of decisions) {
      totalConfidence += decision.confidence;

      if (decision.confidence < 0.6) {
        stats.lowConfidenceCount++;
      }

      // Count by model
      stats.byModel[decision.model] = (stats.byModel[decision.model] || 0) + 1;

      // Count by sensitivity
      stats.bySensitivity[decision.dataSensitivity]++;
    }

    stats.avgConfidence = totalConfidence / decisions.length;

    return stats;
  } catch (error) {
    logger.error('[AI Decision Logger] Error getting stats', error as Error);
    return {
      total: 0,
      avgConfidence: 0,
      lowConfidenceCount: 0,
      byModel: {},
      bySensitivity: { Public: 0, PII: 0, PHI: 0, Financial: 0 },
    };
  }
}
