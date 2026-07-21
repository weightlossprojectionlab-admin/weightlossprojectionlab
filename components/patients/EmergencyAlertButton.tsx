'use client'

/**
 * EmergencyAlertButton — one-tap "alert family members", fires immediately.
 *
 * Used by both the Emergency modal and the persistent in-view action, so the alert
 * is a single tap from either place (no bounce through another dialog). Shows inline
 * sending → result, including an honest "couldn't reach anyone" state.
 */

import { BellAlertIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useEmergencyAlert } from '@/hooks/useEmergencyAlert'

interface EmergencyAlertButtonProps {
  patientId: string
  patientName: string
  className?: string
}

export function EmergencyAlertButton({ patientId, patientName, className = '' }: EmergencyAlertButtonProps) {
  const { alertFamily, sending, result } = useEmergencyAlert(patientId, patientName)

  if (result) {
    const noRecipients = result.sent === 0
    return (
      <div
        className={`py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${
          noRecipients
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
            : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        } ${className}`}
        role="status"
      >
        {noRecipients ? (
          <span>No caregivers set up to notify — call 911 directly.</span>
        ) : (
          <>
            <CheckCircleIcon className="w-5 h-5" />
            <span>Alerted {result.sent} {result.sent === 1 ? 'person' : 'people'}{result.failed ? ' (some may have failed)' : ''}</span>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={alertFamily}
      disabled={sending}
      className={`py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${className}`}
    >
      <BellAlertIcon className="w-5 h-5" />
      {sending ? 'Alerting family…' : 'Alert family members'}
    </button>
  )
}

export default EmergencyAlertButton
