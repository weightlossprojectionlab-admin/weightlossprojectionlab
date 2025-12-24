/**
 * BackdateConfirmModal Component
 *
 * Confirmation modal shown when user attempts to log a backdated vital.
 * Provides clear warning and explanation before proceeding.
 *
 * UX Best Practices:
 * - Clear explanation of what backdating means
 * - Visual distinction between recorded and logged dates
 * - Easy to cancel if accidental
 */

'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'

export interface BackdateConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  recordedDate: string // ISO string - when vital was actually taken
  vitalType: string
  patientName: string
  daysDifference: number
}

export default function BackdateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  recordedDate,
  vitalType,
  patientName,
  daysDifference
}: BackdateConfirmModalProps) {
  const formattedRecordedDate = new Date(recordedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedLoggedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Full-screen container - Mobile optimized */}
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <Dialog.Panel className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start gap-4 p-6 border-b border-border">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                </div>
                <div className="flex-1">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Confirm Backdated Entry
                  </Dialog.Title>
                  <p className="text-sm text-muted-foreground mt-1">
                    You're logging a vital from a previous date
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Patient and Vital Type */}
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Logging for: <span className="text-foreground">{patientName}</span>
                  </p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Vital Type: <span className="text-foreground capitalize">{vitalType.replace('_', ' ')}</span>
                  </p>
                </div>

                {/* Date Information */}
                <div className="space-y-3">
                  {/* Recorded Date */}
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">When vital was taken</p>
                      <p className="text-base font-semibold text-foreground">{formattedRecordedDate}</p>
                    </div>
                  </div>

                  {/* Logged Date */}
                  <div className="flex items-start gap-3">
                    <ClockIcon className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">When it's being logged</p>
                      <p className="text-base font-semibold text-foreground">{formattedLoggedDate}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-900 dark:text-amber-300">
                    This entry will be marked as backdated by <strong>{daysDifference} {daysDifference === 1 ? 'day' : 'days'}</strong>.
                    Both dates will be saved for accurate record-keeping and HIPAA compliance.
                  </p>
                </div>

                {/* Explanation */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• The vital will appear on {formattedRecordedDate} in your history</p>
                  <p>• Audit logs will show it was entered on {formattedLoggedDate}</p>
                  <p>• This helps maintain accurate medical records</p>
                </div>
              </div>

              {/* Actions - Mobile optimized with larger touch targets */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-border bg-muted rounded-b-2xl sm:rounded-b-xl">
                <button
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className="w-full sm:flex-1 px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors touch-manipulation"
                >
                  Confirm & Log Vital
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
