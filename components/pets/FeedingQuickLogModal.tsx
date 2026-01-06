/**
 * FeedingQuickLogModal Component
 * Quick modal to mark meal as fed with appetite level
 */

'use client'

import { useState } from 'react'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useAuth } from '@/hooks/useAuth'
import { AppetiteLevel, PortionUnit } from '@/types/pet-feeding'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface FeedingQuickLogModalProps {
  isOpen: boolean
  onClose: () => void
  petId: string
  scheduledFor: string // ISO 8601
  scheduledTime: string // HH:mm
  foodProfileId: string
  foodName: string
  portionSize: number
  portionUnit: PortionUnit
  mealName?: string // "Breakfast", "Dinner", etc.
}

export function FeedingQuickLogModal({
  isOpen,
  onClose,
  petId,
  scheduledFor,
  scheduledTime,
  foodProfileId,
  foodName,
  portionSize,
  portionUnit,
  mealName
}: FeedingQuickLogModalProps) {
  const { user } = useAuth()
  const { quickLogFeeding } = useFeedingLogs({
    userId: user?.uid || '',
    petId,
    autoFetch: false
  })

  const [appetiteLevel, setAppetiteLevel] = useState<AppetiteLevel>('ate-all')
  const [fedAt, setFedAt] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [medicationHidden, setMedicationHidden] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in')
      return
    }

    setLoading(true)

    try {
      logger.debug('[FeedingQuickLogModal] Logging feeding', {
        petId,
        scheduledFor,
        appetiteLevel,
        fedAt
      })

      await quickLogFeeding(
        scheduledFor,
        foodProfileId,
        portionSize,
        portionUnit,
        appetiteLevel,
        user.uid,
        user.displayName || 'You'
      )

      // TODO: If medicationHidden or notes, update the log
      // For now, just close modal on success

      logger.info('[FeedingQuickLogModal] Feeding logged successfully')
      toast.success('Feeding logged!')
      onClose()
    } catch (error) {
      logger.error('[FeedingQuickLogModal] Error logging feeding', error as Error)
      toast.error('Failed to log feeding')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const displayMealName = mealName || (scheduledTime.startsWith('0') ? 'Breakfast' : scheduledTime.startsWith('1') ? 'Lunch' : 'Dinner')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold text-foreground">Log {displayMealName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scheduled for {scheduledTime}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Meal Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm">
              <p className="font-medium text-foreground">{foodName}</p>
              <p className="text-muted-foreground">
                {portionSize} {portionUnit}
              </p>
            </div>
          </div>

          {/* Fed At Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fed at
            </label>
            <input
              type="datetime-local"
              value={fedAt}
              onChange={(e) => setFedAt(e.target.value)}
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Actual time you fed {displayMealName.toLowerCase()}
            </p>
          </div>

          {/* Appetite Level */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              How much did they eat?
            </label>
            <div className="space-y-2">
              {[
                { value: 'ate-all' as AppetiteLevel, label: 'Ate everything', emoji: '✅', desc: '100%' },
                { value: 'ate-most' as AppetiteLevel, label: 'Ate most', emoji: '🟢', desc: '~75%' },
                { value: 'ate-some' as AppetiteLevel, label: 'Ate some', emoji: '🟡', desc: '~50%' },
                { value: 'ate-little' as AppetiteLevel, label: 'Ate a little', emoji: '🟠', desc: '~25%' },
                { value: 'refused' as AppetiteLevel, label: 'Refused food', emoji: '🔴', desc: '0%' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAppetiteLevel(option.value)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                    appetiteLevel === option.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{option.emoji}</span>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </div>
                  {appetiteLevel === option.value && (
                    <span className="text-primary font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Medication Checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={medicationHidden}
                onChange={(e) => setMedicationHidden(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Medication was mixed in food
                </p>
                <p className="text-xs text-muted-foreground">
                  Check if you hid medication in this meal
                </p>
              </div>
            </label>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations? (e.g., ate slowly, seemed hungry, etc.)"
              rows={3}
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
            />
          </div>

          {/* Warning for Refused Food */}
          {appetiteLevel === 'refused' && (
            <div className="p-4 bg-error/10 border-2 border-error/30 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-error">Refused Meal Alert</p>
                  <p className="text-xs text-error/80 mt-1">
                    If your pet refuses multiple meals in a row, contact your veterinarian.
                    Loss of appetite can be a sign of illness.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
