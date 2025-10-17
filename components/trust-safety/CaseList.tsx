// Case List Component
// PRD Reference: trust_safety_moderation (PRD v1.3.7)
// Displays list of dispute cases with filtering and sorting

'use client';

import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import CaseCard from './CaseCard';
import type { DisputeCase } from '@/types/trust-safety';

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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'sla':
        if (!a.slaDeadline || !b.slaDeadline) return 0;
        return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      default:
        return 0;
    }
  });

  // Calculate stats
  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const underReviewCount = cases.filter(c => c.status === 'under_review').length;
  const escalatedCount = cases.filter(c => c.status === 'escalated').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;

  // Calculate overdue cases
  const overdueCount = cases.filter(c => {
    if (!c.slaDeadline || c.status === 'resolved') return false;
    return new Date(c.slaDeadline) < new Date();
  }).length;

  if (cases.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-gray-400 mb-3">
          <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Cases</h3>
        <p className="text-sm text-gray-600">All clear! No dispute cases at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{underReviewCount}</div>
            <div className="text-xs text-gray-600">Under Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{escalatedCount}</div>
            <div className="text-xs text-gray-600">Escalated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
            <div className="text-xs text-gray-600">Resolved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('under_review')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'under_review'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Under Review
            </button>
            <button
              onClick={() => setStatusFilter('escalated')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'escalated'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Escalated
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No cases found with the selected filter.</p>
        </div>
      )}
    </div>
  );
}
