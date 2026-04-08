/**
 * Platform Settings — types, defaults, and validation.
 *
 * This module is shared between client AND server code, so it must NOT
 * import any React APIs or browser-only Firebase APIs. The reactive React
 * hook (usePlatformSettings) lives in `hooks/usePlatformSettings.ts`
 * which is marked 'use client'.
 *
 * Stored as a single Firestore document at `admin/platform_settings`.
 * - Read by all authenticated users (so the inactivity timer can apply)
 * - Written only by super-admins (enforced by firestore.rules + API route)
 *
 * SECURITY / COMPLIANCE NOTES:
 * - The inactivity timeout is a HIPAA Security Rule § 164.312(a)(2)(iii)
 *   control. It cannot be disabled. The minimum value (5 min) prevents
 *   self-lockout; the maximum (30 min) is the upper bound for PHI access
 *   per industry standard.
 * - The setting applies to ALL authenticated users equally. There is NO
 *   per-role configuration and NO admin exemption. Privileged accounts
 *   are higher-value targets and must not have weaker session controls.
 * - All changes are audit-logged via logAdminAction.
 */

export const PLATFORM_SETTINGS_DOC_PATH = 'admin/platform_settings'

/** Compliance bounds — enforced by both the API and the settings UI. */
export const INACTIVITY_TIMEOUT_MIN_MINUTES = 5
export const INACTIVITY_TIMEOUT_MAX_MINUTES = 30
export const INACTIVITY_TIMEOUT_DEFAULT_MINUTES = 15

export interface PlatformSettings {
  /** Minutes of inactivity before automatic logout. */
  inactivityTimeoutMinutes: number
  /** ISO timestamp of last update (audit metadata, optional). */
  updatedAt?: string
  /** Email of the super-admin who last updated this doc. */
  updatedBy?: string
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  inactivityTimeoutMinutes: INACTIVITY_TIMEOUT_DEFAULT_MINUTES,
}

/**
 * Validate an inactivity timeout value against compliance bounds.
 * Returns the clamped value or null if the input is invalid.
 */
export function validateInactivityTimeoutMinutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < INACTIVITY_TIMEOUT_MIN_MINUTES) return null
  if (value > INACTIVITY_TIMEOUT_MAX_MINUTES) return null
  return Math.round(value)
}
