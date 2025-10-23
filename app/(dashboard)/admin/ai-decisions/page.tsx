'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import {
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

interface AIDecision {
  decisionId: string
  timestamp: Date
  decision: string
  confidence: number
  rationale: string
  policyReference: string
  model: string
  modelTier: string
  executedBy: string
  userId?: string
  templateId: string
  dataSensitivity: string
  reviewedBy?: string
  reviewedAt?: Date
  reversalReason?: string
  metadata?: any
}

interface AIStats {
  totalDecisions: number
  lowConfidenceCount: number
  avgConfidence: number
  reversalRate: number
  unreviewedCount: number
}

export default function AIDecisionsPage() {
  const { isAdmin, role } = useAdminAuth()
  const permissions = getPermissions(role)
  const [decisions, setDecisions] = useState<AIDecision[]>([])
  const [stats, setStats] = useState<AIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null)
  const [filterReviewed, setFilterReviewed] = useState<'all' | 'unreviewed' | 'reviewed'>('unreviewed')
  const [filterConfidence, setFilterConfidence] = useState<number>(0.8)
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      loadDecisions()
      loadStats()
    }
  }, [isAdmin, filterReviewed, filterConfidence])

  const loadDecisions = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/ai-decisions?reviewed=${filterReviewed}&maxConfidence=${filterConfidence}`
      )
      if (!response.ok) throw new Error('Failed to load AI decisions')
      const data = await response.json()
      setDecisions(data.decisions || [])
    } catch (err) {
      console.error('Error loading AI decisions:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/ai-decisions/stats')
      if (!response.ok) throw new Error('Failed to load stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleReview = async (decisionId: string, action: 'approve' | 'reverse') => {
    if (!reviewNotes.trim() && action === 'reverse') {
      alert('Please provide a reason for reversing this decision')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/ai-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId,
          action,
          notes: reviewNotes,
        }),
      })

      if (!response.ok) throw new Error('Failed to review decision')

      alert(action === 'approve' ? 'Decision approved' : 'Decision reversed')
      setSelectedDecision(null)
      setReviewNotes('')
      await loadDecisions()
      await loadStats()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to review decision')
    } finally {
      setActionLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 dark:bg-green-900/20'
    if (confidence >= 0.7) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access AI decision review.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Decision Review</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and oversee low-confidence AI decisions
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
              <ChartBarIcon className="h-4 w-4" />
              <span>Total Decisions</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalDecisions.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Low Confidence</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.lowConfidenceCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Avg Confidence</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {(stats.avgConfidence * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Reversal Rate</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {(stats.reversalRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Unreviewed</div>
            <div className="text-2xl font-bold text-primary">
              {stats.unreviewedCount.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Review Status
            </label>
            <select
              value={filterReviewed}
              onChange={(e) => setFilterReviewed(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Decisions</option>
              <option value="unreviewed">Unreviewed Only</option>
              <option value="reviewed">Reviewed Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Confidence: {(filterConfidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filterConfidence * 100}
              onChange={(e) => setFilterConfidence(parseInt(e.target.value) / 100)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Decisions List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-12">
            <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No AI decisions found matching filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {decisions.map((decision) => (
              <div
                key={decision.decisionId}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => setSelectedDecision(decision)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CpuChipIcon className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {decision.decision}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBgColor(decision.confidence)} ${getConfidenceColor(decision.confidence)}`}>
                        {(decision.confidence * 100).toFixed(1)}% confidence
                      </span>
                      {decision.reviewedBy && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                          Reviewed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {decision.rationale}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span>Model: {decision.model} ({decision.modelTier})</span>
                      <span>•</span>
                      <span>Policy: {decision.policyReference}</span>
                      <span>•</span>
                      <span>{new Date(decision.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Detail Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Decision Details</h3>
                <button
                  onClick={() => {
                    setSelectedDecision(null)
                    setReviewNotes('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Decision</div>
                  <div className="text-base text-gray-900 dark:text-gray-100">{selectedDecision.decision}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Confidence</div>
                  <div className={`text-lg font-bold ${getConfidenceColor(selectedDecision.confidence)}`}>
                    {(selectedDecision.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Rationale</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    {selectedDecision.rationale}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Policy Reference</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{selectedDecision.policyReference}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Model</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{selectedDecision.model}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Model Tier</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{selectedDecision.modelTier}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Executed By</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{selectedDecision.executedBy}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Timestamp</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(selectedDecision.timestamp).toLocaleString()}
                  </div>
                </div>

                {selectedDecision.reviewedBy && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Reviewed By</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">{selectedDecision.reviewedBy}</div>
                    </div>
                    {selectedDecision.reversalReason && (
                      <div>
                        <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Reversal Reason</div>
                        <div className="text-sm text-gray-900 dark:text-gray-100 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                          {selectedDecision.reversalReason}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedDecision.reviewedBy && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Review Notes {reviewNotes.length > 0 && `(${reviewNotes.length} chars)`}
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add notes about your review (required for reversals)..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReview(selectedDecision.decisionId, 'approve')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Approve Decision
                      </button>
                      <button
                        onClick={() => handleReview(selectedDecision.decisionId, 'reverse')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Reverse Decision
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h3 className="text-lg font-semibold text-accent-dark mb-2">AI Decision Review Guidelines</h3>
        <ul className="space-y-2 text-sm text-accent-dark">
          <li>• Review low-confidence decisions (typically &lt; 80%) to ensure accuracy</li>
          <li>• Approve decisions that align with policy and appear correct</li>
          <li>• Reverse decisions that are incorrect or violate policy (must provide reason)</li>
          <li>• All reviews are logged for compliance and model improvement</li>
          <li>• Reversed decisions help improve AI model accuracy over time</li>
        </ul>
      </div>
    </div>
  )
}
