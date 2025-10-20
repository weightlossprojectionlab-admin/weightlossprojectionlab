// Case Card Component
// PRD Reference: trust_safety_moderation (PRD v1.3.7)
// Displays individual dispute/case information

'use client';

import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { DisputeCase } from '@/types/trust-safety';

interface CaseCardProps {
  case: DisputeCase;
  onClick?: (caseId: string) => void;
}

export default function CaseCard({ case: disputeCase, onClick }: CaseCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-accent-light text-accent-dark';
      case 'resolved':
        return 'bg-success-light text-success-dark';
      case 'escalated':
        return 'bg-error-light text-error-dark';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 70) return 'text-error-dark';
    if (score >= 40) return 'text-orange-600';
    return 'text-success-dark';
  };

  const isHighPriority = disputeCase.riskScore >= 70;
  const slaDeadline = disputeCase.slaDeadline ? new Date(disputeCase.slaDeadline) : null;
  const isOverdue = slaDeadline && slaDeadline < new Date();

  return (
    <div
      className={`border rounded-lg p-5 hover:shadow-md transition-all cursor-pointer ${
        isHighPriority ? 'border-error bg-error-light' : 'bg-white border-border'
      }`}
      onClick={() => onClick?.(disputeCase.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">Case #{disputeCase.id.slice(0, 8)}</h3>
            {isHighPriority && (
              <ExclamationTriangleIcon className="h-5 w-5 text-error-dark" title="High Priority" />
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize">{disputeCase.reason.replace(/_/g, ' ')}</p>
        </div>

        {/* Status Badge */}
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(disputeCase.status)}`}>
          {disputeCase.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Risk Score */}
      <div className="flex items-center space-x-4 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
          <div className={`text-2xl font-bold ${getRiskLevelColor(disputeCase.riskScore)}`}>
            {disputeCase.riskScore}
          </div>
        </div>

        {/* Confidence */}
        {disputeCase.confidence !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
            <div className="text-2xl font-bold text-foreground">
              {Math.round(disputeCase.confidence * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {disputeCase.recommendation && (
        <div className="bg-white border border-accent rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-accent-dark uppercase tracking-wide mb-1">
            Recommended Action
          </div>
          <div className="text-sm text-accent-dark capitalize">
            {disputeCase.recommendation.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {/* SLA Deadline */}
      {slaDeadline && (
        <div className={`flex items-center space-x-2 text-sm mb-3 ${
          isOverdue ? 'text-error-dark font-semibold' : 'text-muted-foreground'
        }`}>
          <ClockIcon className="h-4 w-4" />
          <span>
            {isOverdue ? 'OVERDUE: ' : 'Due: '}
            {slaDeadline.toLocaleDateString()} {slaDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
        <div>
          Filed: {new Date(disputeCase.createdAt).toLocaleDateString()}
        </div>
        {disputeCase.assignedTo && (
          <div>Assigned: {disputeCase.assignedTo}</div>
        )}
        {disputeCase.resolvedAt && (
          <div className="flex items-center space-x-1 text-success-dark">
            <CheckCircleIcon className="h-4 w-4" />
            <span>Resolved {new Date(disputeCase.resolvedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
