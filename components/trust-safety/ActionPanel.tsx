// Action Panel Component
// PRD Reference: trust_safety_moderation (PRD v1.3.7)
// Admin action buttons for moderation decisions

'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ArrowUpCircleIcon
} from '@heroicons/react/24/outline';
import type { DisputeCase, AdminAction } from '@/types/trust-safety';

interface ActionPanelProps {
  case: DisputeCase;
  onAction: (action: AdminAction, notes: string) => Promise<void>;
  disabled?: boolean;
}

export default function ActionPanel({ case: disputeCase, onAction, disabled = false }: ActionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleActionClick = (action: AdminAction) => {
    setSelectedAction(action);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedAction || isLoading) return;

    setIsLoading(true);
    try {
      await onAction(selectedAction, notes);
      setShowConfirm(false);
      setSelectedAction(null);
      setNotes('');
    } catch (error) {
      console.error('Action failed:', error);
      // Optionally show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedAction(null);
    setNotes('');
  };

  // Don't show if case is already resolved
  if (disputeCase.status === 'resolved') {
    return (
      <div className="bg-success-light border border-success rounded-lg p-6 text-center">
        <CheckCircleIcon className="h-12 w-12 text-success-dark mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-success-dark mb-1">Case Resolved</h3>
        <p className="text-sm text-success-dark">
          This case was resolved on {new Date(disputeCase.resolvedAt!).toLocaleDateString()}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Moderation Actions</h3>

      {!showConfirm ? (
        <div className="space-y-3">
          {/* Approve Full Refund */}
          <button
            onClick={() => handleActionClick('refund_full')}
            disabled={disabled}
            className="w-full flex items-center justify-between px-4 py-3 bg-success-light border border-success rounded-lg hover:bg-success-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="h-6 w-6 text-success-dark" />
              <div className="text-left">
                <div className="font-semibold text-success-dark">Approve Full Refund</div>
                <div className="text-xs text-success-dark">100% refund to disputing party</div>
              </div>
            </div>
          </button>

          {/* Approve Partial Refund */}
          <button
            onClick={() => handleActionClick('refund_partial')}
            disabled={disabled}
            className="w-full flex items-center justify-between px-4 py-3 bg-accent-light border border-accent rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="h-6 w-6 text-accent-dark" />
              <div className="text-left">
                <div className="font-semibold text-accent-dark">Approve Partial Refund</div>
                <div className="text-xs text-accent-dark">50% refund to both parties</div>
              </div>
            </div>
          </button>

          {/* Deny Dispute */}
          <button
            onClick={() => handleActionClick('deny')}
            disabled={disabled}
            className="w-full flex items-center justify-between px-4 py-3 bg-error-light border border-error rounded-lg hover:bg-error-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <XCircleIcon className="h-6 w-6 text-error-dark" />
              <div className="text-left">
                <div className="font-semibold text-error-dark">Deny Dispute</div>
                <div className="text-xs text-error-dark">No refund, maintain original transaction</div>
              </div>
            </div>
          </button>

          {/* Escalate */}
          <button
            onClick={() => handleActionClick('escalate')}
            disabled={disabled}
            className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <ArrowUpCircleIcon className="h-6 w-6 text-orange-600" />
              <div className="text-left">
                <div className="font-semibold text-orange-900">Escalate Case</div>
                <div className="text-xs text-orange-700">Requires senior admin review</div>
              </div>
            </div>
          </button>

          {/* Recommendation Hint */}
          {disputeCase.recommendation && (
            <div className="mt-4 p-3 bg-accent-light border border-accent rounded-lg">
              <div className="text-xs font-semibold text-accent-dark uppercase tracking-wide mb-1">
                AI Recommendation
              </div>
              <div className="text-sm text-accent-dark capitalize">
                {disputeCase.recommendation.replace(/_/g, ' ')}
                {disputeCase.confidence && (
                  <span className="ml-2 text-xs">
                    ({Math.round(disputeCase.confidence * 100)}% confidence)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Confirmation */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">
              Confirm Action: {selectedAction?.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <p className="text-sm text-yellow-800">
              This action will be recorded in the case history and cannot be undone.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
              Admin Notes (Required)
            </label>
            <textarea
              id="notes"
              rows={4}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide reasoning for this decision..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleConfirm}
              disabled={isLoading || !notes.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLoading || !notes.trim()
                  ? 'bg-muted-dark text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {isLoading ? 'Processing...' : 'Confirm Action'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
