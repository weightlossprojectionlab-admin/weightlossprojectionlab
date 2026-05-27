/**
 * Date Utility Functions
 * Centralized date formatting and validation logic
 */

/**
 * Parse a calendar-day string ("YYYY-MM-DD" or an ISO with time) as
 * a Date at LOCAL midnight — preventing the UTC-midnight timezone
 * shift bug where "1970-11-23" rendered as "11/22/1970" for users
 * east of UTC. `new Date("1970-11-23")` parses as UTC midnight which
 * in EST is Nov 22 19:00; we want the calendar day the user typed.
 *
 * Returns null for missing/unparseable input.
 */
export function parseLocalCalendarDate(input: string | undefined | null): Date | null {
  if (!input) return null
  // Take only the date portion — handles both "1970-11-23" and
  // "1970-11-23T00:00:00.000Z" identically.
  const datePart = input.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) return null
  const y = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const d = parseInt(match[3], 10)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d) // Local midnight, no TZ shift
}

/**
 * Format a birth/calendar date for display without TZ shift.
 * One place for "what day did the user type?" — every patient card,
 * profile header, AI report should call this. See
 * feedback_one_question_one_answer.
 */
export function formatBirthDate(
  input: string | undefined | null,
  format: 'short' | 'long' | 'numeric' = 'numeric',
): string {
  const date = parseLocalCalendarDate(input)
  if (!date) return ''
  switch (format) {
    case 'long':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    case 'short':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    case 'numeric':
    default:
      return date.toLocaleDateString('en-US')
  }
}

/**
 * Get today's date in YYYY-MM-DD format for date input max attribute
 */
export function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Validate that a date is not in the future
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if valid (today or past), false if future date
 */
export function isValidBirthDate(dateString: string): boolean {
  if (!dateString) return false

  const inputDate = new Date(dateString)
  const today = new Date()

  // Set time to start of day for accurate comparison
  today.setHours(0, 0, 0, 0)
  inputDate.setHours(0, 0, 0, 0)

  return inputDate <= today
}

/**
 * Get error message for invalid birth date
 */
export function getBirthDateErrorMessage(dateString: string): string {
  if (!dateString) return 'Date of birth is required'
  if (!isValidBirthDate(dateString)) {
    return 'Date of birth cannot be in the future'
  }
  return ''
}

/**
 * Calculate age from date of birth. Canonical implementation.
 *
 * Behavior:
 *   - Returns NaN for missing/null/empty/unparseable input. Callers
 *     should `Number.isFinite(age)` before using the result numerically,
 *     or fall through to a "—" display.
 *   - Calendar-day strings (YYYY-MM-DD or ISO with time) are parsed
 *     via `parseLocalCalendarDate`, avoiding the UTC-midnight TZ shift
 *     that made birthdays render one day off for users east of UTC.
 *   - Accepts `Date | string | undefined | null` so existing callers
 *     don't need to wrap their values.
 *
 * Other modules (lib/age-utils.ts, lib/health-summary-generator.ts)
 * re-export from here — one implementation, one answer. See
 * feedback_one_question_one_answer.
 */
export function calculateAge(dateOfBirth: Date | string | undefined | null): number {
  if (dateOfBirth === undefined || dateOfBirth === null || dateOfBirth === '') return NaN

  let birthDate: Date | null
  if (typeof dateOfBirth === 'string') {
    birthDate = parseLocalCalendarDate(dateOfBirth)
  } else if (dateOfBirth instanceof Date) {
    birthDate = Number.isNaN(dateOfBirth.getTime()) ? null : dateOfBirth
  } else {
    birthDate = null
  }
  if (!birthDate) return NaN

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Format date for display. Calendar-day strings (YYYY-MM-DD or ISO
 * with time) route through `parseLocalCalendarDate` to avoid the
 * TZ shift bug. Full ISO timestamps that need their time component
 * preserved should NOT use this helper.
 */
export function formatDate(
  dateString: string,
  format: 'short' | 'long' | 'numeric' = 'short'
): string {
  if (!dateString) return ''
  // Treat as calendar day — strips any time component first.
  return formatBirthDate(dateString, format)
}
