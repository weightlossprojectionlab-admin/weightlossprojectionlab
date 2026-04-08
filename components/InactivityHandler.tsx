'use client'

import { useInactivityLogout } from '@/hooks/useInactivityLogout'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { INACTIVITY_TIMEOUT_DEFAULT_MINUTES } from '@/lib/platform-settings'

/**
 * Component that handles automatic logout after inactivity. Mounted globally
 * to track user activity across the app.
 *
 * The timeout is sourced from the runtime platform settings doc and applies
 * to ALL authenticated users equally — admins, super-admins, and regular
 * users alike. This is a HIPAA Security Rule § 164.312(a)(2)(iii) control;
 * privileged accounts must not have weaker session controls than regular
 * users.
 *
 * Until the settings doc loads, the default value (15 minutes) is used.
 * Super-admins can adjust the timeout from /admin/settings within the
 * compliance bounds (5–30 minutes).
 */
export function InactivityHandler() {
  const { settings } = usePlatformSettings()

  // The hook itself reads the value at mount + reacts to changes via the
  // dep array, so settings updates from /admin/settings propagate live.
  useInactivityLogout(settings.inactivityTimeoutMinutes || INACTIVITY_TIMEOUT_DEFAULT_MINUTES)

  // This component renders nothing — it only handles the inactivity logic.
  return null
}
