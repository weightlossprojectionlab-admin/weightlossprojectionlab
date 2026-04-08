'use client'

/**
 * usePlatformSettings — React hook subscribing to the platform settings doc.
 *
 * Lives in /hooks (separate from lib/platform-settings.ts) so the
 * non-React types and constants in that lib file remain importable from
 * server-side code (API routes) without dragging in React.
 *
 * Reactive: changes to admin/platform_settings via the admin UI propagate
 * to every open client tab within seconds via Firestore onSnapshot.
 */

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  PLATFORM_SETTINGS_DOC_PATH,
  DEFAULT_PLATFORM_SETTINGS,
  INACTIVITY_TIMEOUT_DEFAULT_MINUTES,
  validateInactivityTimeoutMinutes,
  type PlatformSettings,
} from '@/lib/platform-settings'

export function usePlatformSettings(): { settings: PlatformSettings; loading: boolean } {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const ref = doc(db, PLATFORM_SETTINGS_DOC_PATH)
    const unsub = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PlatformSettings>
          const validated = validateInactivityTimeoutMinutes(data.inactivityTimeoutMinutes)
          setSettings({
            inactivityTimeoutMinutes: validated ?? INACTIVITY_TIMEOUT_DEFAULT_MINUTES,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          })
        } else {
          // Doc doesn't exist yet — use defaults. Will be created the first
          // time a super-admin saves a setting from the admin UI.
          setSettings(DEFAULT_PLATFORM_SETTINGS)
        }
        setLoading(false)
      },
      err => {
        logger.warn('[platform-settings] Failed to subscribe', { error: err.message })
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { settings, loading }
}
