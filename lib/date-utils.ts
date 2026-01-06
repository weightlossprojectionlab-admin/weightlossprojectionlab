/**
 * Date Utility Functions
 * Centralized date formatting and validation logic
 */

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
 * Calculate age from date of birth
 * @param dateOfBirth - Date string in YYYY-MM-DD format
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0

  const birthDate = new Date(dateOfBirth)
  const today = new Date()

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Format date for display
 * @param dateString - Date string in any valid format
 * @param format - Optional format ('short', 'long', 'numeric')
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  format: 'short' | 'long' | 'numeric' = 'short'
): string {
  if (!dateString) return ''

  const date = new Date(dateString)

  switch (format) {
    case 'long':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'numeric':
      return date.toLocaleDateString('en-US')
    case 'short':
    default:
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
  }
}
