'use client'

/**
 * useEmergencyAlert — one place to raise a manual family alert.
 *
 * Wraps lib/emergency-alerts.ts sendEmergencyAlert (in-app notifications + FCM push
 * to every caregiver) so every entry point — the initial Emergency modal and the
 * persistent in-view button — fires the SAME action with the same states, instead of
 * each re-implementing it (or bouncing the user through an extra dialog to confirm).
 */

import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { sendEmergencyAlert } from '@/lib/emergency-alerts'
import { logger } from '@/lib/logger'

export interface EmergencyAlertResult {
  sent: number
  failed: boolean
}

export function useEmergencyAlert(patientId: string, patientName: string) {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<EmergencyAlertResult | null>(null)

  const alertFamily = useCallback(async () => {
    if (!user || sending) return
    setSending(true)
    setResult(null)
    try {
      const res = await sendEmergencyAlert({
        type: 'manual_emergency',
        severity: 'emergency',
        familyMemberId: patientId,
        familyMemberName: patientName,
        message: `${patientName} needs help — an emergency was raised from their record.`,
        guidance: 'Call them, head over, or call 911 if it may be life-threatening.',
        reportedBy: {
          uid: user.uid,
          name: user.displayName || user.email || 'A family member',
          role: 'caregiver',
        },
        timestamp: new Date(),
      })
      setResult({ sent: res.notificationsSent, failed: !res.success })
      if (!res.success) logger.warn('[useEmergencyAlert] Alert reported failure', { errors: res.errors })
    } catch (e) {
      logger.error('[useEmergencyAlert] Failed to send family alert', e as Error)
      setResult({ sent: 0, failed: true })
    } finally {
      setSending(false)
    }
  }, [user, sending, patientId, patientName])

  return { alertFamily, sending, result }
}
