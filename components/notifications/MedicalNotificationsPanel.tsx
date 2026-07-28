'use client'

/**
 * Clinical notifications for the Medical hub — reuses the global useNotifications
 * data source and the shared NotificationItem render (DOSI single source), but
 * scopes to what belongs on a clinical screen: appointments, vitals, medications,
 * health reports/episodes, documents. Non-clinical noise (shopping, chores,
 * family invites) stays on the global /notifications page.
 *
 * Time filter maps "future / present / past":
 *   Upcoming = forward-looking reminders (appointment/medication reminders)
 *   Recent   = created in the last 7 days
 *   Past     = older than that
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { Notification, NotificationType } from '@/types/notifications'

const CLINICAL_TYPES = new Set<NotificationType>([
  'appointment_scheduled', 'appointment_updated', 'appointment_cancelled', 'appointment_reminder',
  'vital_logged', 'vital_alert', 'health_trend_alert',
  'medication_added', 'medication_updated', 'medication_deleted', 'medication_dose_logged', 'medication_reminder',
  'health_report_generated', 'episode_created', 'episode_updated',
  'document_uploaded', 'weight_logged',
])

const REMINDER_TYPES = new Set<string>(['appointment_reminder', 'medication_reminder'])

type TimeBucket = 'all' | 'upcoming' | 'recent' | 'past'
const BUCKETS: { key: TimeBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'recent', label: 'Recent' },
  { key: 'past', label: 'Past' },
]
const RECENT_DAYS = 7

export function MedicalNotificationsPanel() {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, notificationsLoading, getNotifications, markAsRead, archiveNotification } =
    useNotifications(user?.uid)
  const [bucket, setBucket] = useState<TimeBucket>('all')

  // Fetch the full set for this user (getNotifications populates the hook's
  // `notifications` state). The bell's real-time array is capped at the latest
  // 5 — not enough for a filtered clinical view — so we fetch instead.
  useEffect(() => {
    if (user?.uid) getNotifications().catch(() => {})
  }, [user?.uid, getNotifications])

  const clinical = useMemo(
    () => notifications.filter((n) => n.archived !== true && CLINICAL_TYPES.has(n.type)),
    [notifications],
  )

  const filtered = useMemo(() => {
    if (bucket === 'all') return clinical
    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
    return clinical.filter((n) => {
      const isReminder = REMINDER_TYPES.has(n.type)
      const createdMs = new Date(n.createdAt).getTime()
      if (bucket === 'upcoming') return isReminder
      if (bucket === 'recent') return !isReminder && createdMs >= cutoff
      return !isReminder && createdMs < cutoff // past
    })
  }, [clinical, bucket])

  const handleClick = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id).catch(() => {})
    if (n.actionUrl) router.push(n.actionUrl)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              bucket === b.key
                ? 'bg-primary text-white'
                : 'bg-card text-foreground border border-border hover:bg-muted'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {notificationsLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
          <p className="text-muted-foreground">
            No clinical notifications{bucket !== 'all' ? ' in this view' : ' yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleClick}
              onArchive={archiveNotification}
            />
          ))}
        </div>
      )}
    </div>
  )
}
