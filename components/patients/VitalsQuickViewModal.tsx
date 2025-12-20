/**
 * Vitals Quick View Modal
 *
 * Shows today's vitals report with option to open the wizard
 * DRY: Reuses DailyVitalsSummary component
 */

'use client'

import { Dialog } from '@headlessui/react'
import { XMarkIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import DailyVitalsSummary from '@/components/vitals/DailyVitalsSummary'
import { VitalSign } from '@/types/medical'

interface VitalsQuickViewModalProps {
  isOpen: boolean
  onClose: () => void
  vitals: VitalSign[]
  patientName: string
  patientId: string
  onOpenWizard: () => void
  loading?: boolean
}

export default function VitalsQuickViewModal({
  isOpen,
  onClose,
  vitals,
  patientName,
  patientId,
  onOpenWizard,
  loading = false
}: VitalsQuickViewModalProps) {
  // Filter vitals from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayVitals = vitals.filter(vital => {
    const vitalDate = new Date(vital.recordedAt)
    vitalDate.setHours(0, 0, 0, 0)
    return vitalDate.getTime() === today.getTime()
  })

  const handleLogVitals = () => {
    onClose() // Close this modal
    onOpenWizard() // Open the wizard
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <Dialog.Title className="text-xl font-bold text-white">
                Vitals - {patientName}
              </Dialog.Title>
              <p className="text-sm text-primary-light">
                {todayVitals.length > 0
                  ? `${todayVitals.length} reading${todayVitals.length !== 1 ? 's' : ''} today`
                  : 'No vitals recorded today'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : todayVitals.length > 0 ? (
              <DailyVitalsSummary vitals={vitals} patientName={patientName} patientId={patientId} />
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No Vitals Recorded Today
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start tracking {patientName}'s health by logging vitals with AI guidance
                </p>
                <button
                  onClick={handleLogVitals}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" />
                  Log Vitals
                </button>
              </div>
            )}
          </div>

          {/* Footer - Show log vitals button if there are readings */}
          {!loading && todayVitals.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-border flex items-center justify-between flex-shrink-0">
              <p className="text-sm text-muted-foreground">
                AI-guided vital sign logging available
              </p>
              <button
                onClick={handleLogVitals}
                className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success-dark transition-colors font-medium"
              >
                <ClipboardDocumentListIcon className="w-5 h-5" />
                Log Vitals
              </button>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
