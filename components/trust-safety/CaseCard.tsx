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
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'escalated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-green-600';
  };

  const isHighPriority = disputeCase.riskScore >= 70;
  const slaDeadline = disputeCase.slaDeadline ? new Date(disputeCase.slaDeadline) : null;
  const isOverdue = slaDeadline && slaDeadline < new Date();

  return (
    <div
      className={`border rounded-lg p-5 hover:shadow-md transition-all cursor-pointer ${
        isHighPriority ? 'border-red-300 bg-red-50' : 'bg-white border-gray-200'
      }`}
      onClick={() => onClick?.(disputeCase.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">Case #{disputeCase.id.slice(0, 8)}</h3>
            {isHighPriority && (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" title="High Priority" />
            )}
          </div>
          <p className="text-sm text-gray-600 capitalize">{disputeCase.reason.replace(/_/g, ' ')}</p>
        </div>

        {/* Status Badge */}
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(disputeCase.status)}`}>
          {disputeCase.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Risk Score */}
      <div className="flex items-center space-x-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Risk Score</div>
          <div className={`text-2xl font-bold ${getRiskLevelColor(disputeCase.riskScore)}`}>
            {disputeCase.riskScore}
          </div>
        </div>

        {/* Confidence */}
        {disputeCase.confidence !== undefined && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Confidence</div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(disputeCase.confidence * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {disputeCase.recommendation && (
        <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
            Recommended Action
          </div>
          <div className="text-sm text-blue-800 capitalize">
            {disputeCase.recommendation.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {/* SLA Deadline */}
      {slaDeadline && (
        <div className={`flex items-center space-x-2 text-sm mb-3 ${
          isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'
        }`}>
          <ClockIcon className="h-4 w-4" />
          <span>
            {isOverdue ? 'OVERDUE: ' : 'Due: '}
            {slaDeadline.toLocaleDateString()} {slaDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
        <div>
          Filed: {new Date(disputeCase.createdAt).toLocaleDateString()}
        </div>
        {disputeCase.assignedTo && (
          <div>Assigned: {disputeCase.assignedTo}</div>
        )}
        {disputeCase.resolvedAt && (
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircleIcon className="h-4 w-4" />
            <span>Resolved {new Date(disputeCase.resolvedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
