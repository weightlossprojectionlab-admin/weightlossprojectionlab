'use client'

import { useState } from 'react'
import { VitalSign } from '@/types/medical'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface PendingVitalApprovalsProps {
  pendingVitals: VitalSign[]
  onApprove: (vitalId: string, action: 'approve' | 'reject', reason?: string) => Promise<void>
  getDisplayName?: (userId: string) => string
}

export default function PendingVitalApprovals({
  pendingVitals,
  onApprove,
  getDisplayName
}: PendingVitalApprovalsProps) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  if (pendingVitals.length === 0) return null

  const handleApprove = async (vitalId: string) => {
    setProcessing(vitalId)
    try {
      await onApprove(vitalId, 'approve')
      toast.success('Weight entry approved')
    } catch {
      toast.error('Failed to approve')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (vitalId: string) => {
    setProcessing(vitalId)
    try {
      await onApprove(vitalId, 'reject', rejectReason || undefined)
      toast.success('Weight entry rejected')
      setRejectingId(null)
      setRejectReason('')
    } catch {
      toast.error('Failed to reject')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏳</span>
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">
          Pending Weight Approvals ({pendingVitals.length})
        </h3>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-400">
        These weight entries require your approval before appearing on charts and reports.
      </p>

      <div className="space-y-2">
        {pendingVitals.map(vital => {
          const weight = typeof vital.value === 'number' ? vital.value : 0
          const loggedBy = vital.loggedBy || vital.takenBy || 'Unknown'
          const displayName = getDisplayName ? getDisplayName(loggedBy) : loggedBy
          const date = new Date(vital.recordedAt).toLocaleDateString()
          const loggedDate = vital.loggedAt ? new Date(vital.loggedAt).toLocaleString() : date

          return (
            <div
              key={vital.id}
              className="bg-white dark:bg-background rounded-lg border border-amber-200 dark:border-amber-800 p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {weight} {vital.unit || 'lbs'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Logged by {displayName} on {loggedDate}
                  </p>
                  {vital.method === 'manual' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Self-reported (manual entry)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {rejectingId === vital.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="text-xs px-2 py-1 border border-border rounded bg-background w-32"
                      />
                      <button
                        onClick={() => handleReject(vital.id)}
                        disabled={processing === vital.id}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(vital.id)}
                        disabled={processing === vital.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(vital.id)}
                        disabled={processing === vital.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 font-medium"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
