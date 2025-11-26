// Case List Component
// PRD Reference: trust_safety_moderation (PRD v1.3.7)
// Displays list of dispute cases with filtering and sorting

'use client';

import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import CaseCard from './CaseCard';
import type { DisputeCase } from '@/types/trust-safety';
import { toDate } from '@/types/common';

interface CaseListProps {
  cases: DisputeCase[];
  onViewCase?: (caseId: string) => void;
}

export default function CaseList({ cases, onViewCase }: CaseListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'risk' | 'date' | 'sla'>('risk');

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  // Sort cases
  const sortedCases = [...filteredCases].sort((a, b) => {
    switch (sortBy) {
      case 'risk':
        return b.riskScore - a.riskScore;
      case 'date':
        return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime();
      case 'sla':
        if (!a.slaDeadline || !b.slaDeadline) return 0;
        return toDate(a.slaDeadline).getTime() - toDate(b.slaDeadline).getTime();
      default:
        return 0;
    }
  });

  // Calculate stats
  const pendingCount = cases.filter(c => c.status === 'new' || c.status === 'triage').length;
  const underReviewCount = cases.filter(c => c.status === 'under_review' || c.status === 'awaiting_evidence').length;
  const escalatedCount = cases.filter(c => c.status === 'needs_manager').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  // Calculate overdue cases
  const overdueCount = cases.filter(c => {
    if (!c.slaDeadline || c.status === 'resolved') return false;
    return toDate(c.slaDeadline) < new Date();
  }).length;

  if (cases.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <div className="text-muted-foreground mb-3">
          <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Cases</h3>
        <p className="text-sm text-muted-foreground">All clear! No dispute cases at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-dark">{underReviewCount}</div>
            <div className="text-xs text-muted-foreground">Under Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-dark">{escalatedCount}</div>
            <div className="text-xs text-muted-foreground">Escalated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-dark">{resolvedCount}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-dark">{overdueCount}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <FunnelIcon className="h-5 w-5 text-muted-foreground" />
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-warning text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('under_review')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'under_review'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              Under Review
            </button>
            <button
              onClick={() => setStatusFilter('escalated')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'escalated'
                  ? 'bg-error-dark text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              Escalated
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-success text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="risk">Highest Risk</option>
            <option value="date">Most Recent</option>
            <option value="sla">SLA Deadline</option>
          </select>
        </div>
      </div>

      {/* Cases Grid */}
      {sortedCases.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedCases.map((disputeCase) => (
            <CaseCard
              key={disputeCase.id}
              case={disputeCase}
              onClick={onViewCase}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No cases found with the selected filter.</p>
        </div>
      )}
    </div>
  );
}
