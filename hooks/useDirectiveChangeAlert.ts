'use client'

/**
 * useDirectiveChangeAlert — governed write for advance decisions (code status / DNR).
 *
 * When a caregiver edits an end-of-life directive, this notifies every OTHER authorized
 * caregiver so the change can't happen in secret (see plan "PART B — governed writes").
 * Reuses lib/emergency-alerts.ts sendDirectiveChangeAlert (same fan-out + audit trail as
 * every other alert); the editor themselves is excluded automatically.
 *
 * Mirrors useEmergencyAlert so reportedBy is constructed one way across every alert path.
 */

import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { sendDirectiveChangeAlert } from '@/lib/emergency-alerts'
import { logger } from '@/lib/logger'

export function useDirectiveChangeAlert(patientId: string, patientName: string) {
  const { user } = useAuth()

  const notifyDirectiveChange = useCallback(
    async (change: { field: string; fromLabel: string; toLabel: string }) => {
      if (!user) return
      try {
        const res = await sendDirectiveChangeAlert({
          patientId,
          patientName,
          field: change.field,
          fromLabel: change.fromLabel,
          toLabel: change.toLabel,
          changedBy: {
            uid: user.uid,
            name: user.displayName || user.email || 'A caregiver',
            role: 'caregiver',
          },
        })
        if (!res.success) {
          // Non-fatal: the field already saved; this is the awareness fan-out on top.
          logger.warn('[useDirectiveChangeAlert] No caregivers notified', { patientId, ...change })
        }
      } catch (e) {
        logger.error('[useDirectiveChangeAlert] Failed to notify caregivers', e as Error)
      }
    },
    [user, patientId, patientName]
  )

  return { notifyDirectiveChange }
}
