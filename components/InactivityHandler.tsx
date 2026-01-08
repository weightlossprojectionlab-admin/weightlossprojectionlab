'use client'

import { useInactivityLogout } from '@/hooks/useInactivityLogout'

/**
 * Component that handles automatic logout after inactivity
 * Mounted globally to track user activity across the app
 */
export function InactivityHandler() {
  // Auto-logout after 5 minutes of inactivity
  useInactivityLogout(5)

  // This component renders nothing - it only handles the inactivity logic
  return null
}
