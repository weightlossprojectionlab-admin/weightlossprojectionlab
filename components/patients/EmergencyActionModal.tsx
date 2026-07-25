'use client'

/**
 * EmergencyActionModal — the initial prompt when the Emergency quick-action is tapped.
 *
 * Offers the immediate crisis choices; the actual family alert is the shared
 * EmergencyAlertButton (one tap, fires immediately — no bounce through a second
 * dialog), which reuses lib/emergency-alerts.ts sendEmergencyAlert. The same button
 * also lives persistently in the emergency view, so the alert is reachable even if
 * this prompt is dismissed.
 */

import { XMarkIcon, EyeIcon } from '@heroicons/react/24/outline'
import EmergencyAlertButton from '@/components/patients/EmergencyAlertButton'

interface EmergencyActionModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
}

export function EmergencyActionModal({ isOpen, onClose, patientId, patientName }: EmergencyActionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div role="dialog" aria-modal="true" aria-label={`Emergency for ${patientName}`} className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
            <span aria-hidden>🚨</span> Emergency — {patientName}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Notify everyone who cares for {patientName} right now — they&apos;ll get an urgent alert with push and sound.
          </p>

          <EmergencyAlertButton patientId={patientId} patientName={patientName} className="w-full" />

          <a
            href="tel:911"
            className="w-full py-3 border-2 border-red-600 text-red-700 dark:text-red-300 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            Call 911
          </a>

          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <EyeIcon className="w-5 h-5" />
            View emergency info
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmergencyActionModal
