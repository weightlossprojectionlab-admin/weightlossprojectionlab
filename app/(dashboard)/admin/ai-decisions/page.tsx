'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import {
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

interface AIDecision {
  id: string
  type: 'meal-analysis' | 'health-profile' | 'meal-safety'
  userId: string
  payload: any
  confidence: number
  reviewStatus: 'unreviewed' | 'approved' | 'rejected' | 'reversed'
  adminNotes?: string
  reviewedAt?: Date
  reviewedBy?: string
  createdAt: Date
  // Legacy fields (for backward compatibility with old AI system)
  decisionId?: string
  timestamp?: Date
  decision?: string
  rationale?: string
  policyReference?: string
  model?: string
  modelTier?: string
  executedBy?: string
  templateId?: string
  dataSensitivity?: string
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
  const [filterType, setFilterType] = useState<'all' | 'meal-analysis' | 'health-profile' | 'meal-safety'>('all')
  const [filterConfidence, setFilterConfidence] = useState<number>(0.8)
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    if (isAdmin) {
      loadDecisions()
      loadStats()
    }
  }, [isAdmin, filterReviewed, filterType, filterConfidence])

  const loadDecisions = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      const queryParams = new URLSearchParams({
        reviewed: filterReviewed,
        maxConfidence: filterConfidence.toString()
      })
      if (filterType !== 'all') {
        queryParams.append('type', filterType)
      }
      const response = await fetch(
        `/api/admin/ai-decisions?${queryParams.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (!response.ok) throw new Error('Failed to load AI decisions')
      const data = await response.json()
      setDecisions(data.decisions || [])
    } catch (err) {
      logger.error('Error loading AI decisions:', err as Error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/ai-decisions/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to load stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      logger.error('Error loading stats:', err as Error)
    }
  }

  const handleReview = async (decisionId: string, action: 'approve' | 'reject' | 'modify') => {
    if (!reviewNotes.trim() && action === 'reject') {
      alert('Please provide a reason for rejecting this decision')
      return
    }

    setActionLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/ai-decisions/${decisionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          notes: reviewNotes,
        }),
      })

      if (!response.ok) throw new Error('Failed to review decision')

      const actionText = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified'
      alert(`Decision ${actionText} successfully`)
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
    if (confidence >= 0.9) return 'text-success dark:text-green-400'
    if (confidence >= 0.7) return 'text-warning'
    return 'text-error'
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 dark:bg-green-900/20'
    if (confidence >= 0.7) return 'bg-yellow-100'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  const getDecisionTitle = (decision: AIDecision): string => {
    if (decision.type === 'health-profile') {
      const conditions = decision.payload?.restrictions ?
        Object.keys(decision.payload.restrictions).filter(k => decision.payload.restrictions[k]?.limit).join(', ') :
        'No restrictions'
      return `Health Profile: ${conditions || 'General'}`
    } else if (decision.type === 'meal-safety') {
      return `Meal Safety Check: ${decision.payload?.safetyCheck?.severity || 'Unknown'}`
    }
    // Legacy or meal-analysis
    return decision.decision || 'AI Decision'
  }

  const getDecisionDescription = (decision: AIDecision): string => {
    if (decision.type === 'health-profile') {
      const restrictionsCount = decision.payload?.restrictions ?
        Object.keys(decision.payload.restrictions).filter(k => decision.payload.restrictions[k]?.limit).length :
        0
      return `Generated ${restrictionsCount} dietary restrictions based on health conditions`
    } else if (decision.type === 'meal-safety') {
      const warnings = decision.payload?.safetyCheck?.warnings || []
      return warnings.length > 0 ? warnings[0] : 'Safety check completed'
    }
    return decision.rationale || 'No description available'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'health-profile':
        return '🏥'
      case 'meal-safety':
        return '⚠️'
      case 'meal-analysis':
        return '🍽️'
      default:
        return '🤖'
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
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
        <h1 className="text-3xl font-bold text-foreground">AI Decision Review</h1>
        <p className="text-muted-foreground mt-1">
          Review and oversee low-confidence AI decisions
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <ChartBarIcon className="h-4 w-4" />
              <span>Total Decisions</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalDecisions.toLocaleString()}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-muted-foreground text-sm mb-1">Low Confidence</div>
            <div className="text-2xl font-bold text-warning">
              {stats.lowConfidenceCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-muted-foreground text-sm mb-1">Avg Confidence</div>
            <div className="text-2xl font-bold text-foreground">
              {(stats.avgConfidence * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-muted-foreground text-sm mb-1">Reversal Rate</div>
            <div className="text-2xl font-bold text-error">
              {(stats.reversalRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-muted-foreground text-sm mb-1">Unreviewed</div>
            <div className="text-2xl font-bold text-primary">
              {stats.unreviewedCount.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`bg-card rounded-lg shadow p-4 mb-6 transition-opacity ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Filters</h2>
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-sm text-primary">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span>Filtering...</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Decision Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              disabled={loading}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Types</option>
              <option value="health-profile">Health Profiles</option>
              <option value="meal-safety">Meal Safety</option>
              <option value="meal-analysis">Meal Analysis</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Review Status
            </label>
            <select
              value={filterReviewed}
              onChange={(e) => setFilterReviewed(e.target.value as any)}
              disabled={loading}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Decisions</option>
              <option value="unreviewed">Unreviewed Only</option>
              <option value="reviewed">Reviewed Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Max Confidence: {(filterConfidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filterConfidence * 100}
              onChange={(e) => setFilterConfidence(parseInt(e.target.value) / 100)}
              disabled={loading}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Decisions List */}
      <div className="bg-card rounded-lg shadow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-muted-foreground font-medium">Loading AI decisions...</p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-12">
            <CpuChipIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground dark:text-muted-foreground">No AI decisions found matching filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {decisions.map((decision) => (
              <div
                key={decision.id || decision.decisionId}
                className="p-6 hover:bg-background cursor-pointer"
                onClick={() => setSelectedDecision(decision)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{getTypeIcon(decision.type)}</span>
                      <span className="font-semibold text-foreground">
                        {getDecisionTitle(decision)}
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
                    <p className="text-sm text-muted-foreground mb-2">
                      {getDecisionDescription(decision)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground dark:text-muted-foreground">
                      <span className="capitalize">{decision.type.replace('-', ' ')}</span>
                      <span>•</span>
                      <span>User: {decision.userId?.substring(0, 8)}...</span>
                      <span>•</span>
                      <span>{new Date(decision.createdAt || decision.timestamp).toLocaleString()}</span>
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
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Decision Details</h2>
                <button
                  onClick={() => {
                    setSelectedDecision(null)
                    setReviewNotes('')
                  }}
                  className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Decision</div>
                  <div className="text-base text-foreground">{selectedDecision.decision}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Confidence</div>
                  <div className={`text-lg font-bold ${getConfidenceColor(selectedDecision.confidence)}`}>
                    {(selectedDecision.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Rationale</div>
                  <div className="text-sm text-foreground bg-muted p-3 rounded">
                    {selectedDecision.rationale}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Policy Reference</div>
                  <div className="text-sm text-foreground">{selectedDecision.policyReference}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-1">Model</div>
                    <div className="text-sm text-foreground">{selectedDecision.model}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-1">Model Tier</div>
                    <div className="text-sm text-foreground">{selectedDecision.modelTier}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Executed By</div>
                  <div className="text-sm text-foreground">{selectedDecision.executedBy}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Timestamp</div>
                  <div className="text-sm text-foreground">
                    {new Date(selectedDecision.createdAt || selectedDecision.timestamp || new Date()).toLocaleString()}
                  </div>
                </div>

                {selectedDecision.reviewedBy && (
                  <>
                    <div className="border-t border-border pt-4">
                      <div className="text-sm font-semibold text-muted-foreground mb-1">Reviewed By</div>
                      <div className="text-sm text-foreground">{selectedDecision.reviewedBy}</div>
                    </div>
                    {selectedDecision.reversalReason && (
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground mb-1">Reversal Reason</div>
                        <div className="text-sm text-foreground bg-error-light dark:bg-red-900/20 p-3 rounded">
                          {selectedDecision.reversalReason}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedDecision.reviewedBy && (
                  <>
                    <div className="border-t border-border pt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Review Notes {reviewNotes.length > 0 && `(${reviewNotes.length} chars)`}
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add notes about your review (required for reversals)..."
                        rows={3}
                        className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReview(selectedDecision.id || selectedDecision.decisionId || '', 'approve')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(selectedDecision.id || selectedDecision.decisionId || '', 'reject')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Reject
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
        <h2 className="text-lg font-semibold text-accent-dark mb-2">AI Decision Review Guidelines</h2>
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
