/**
 * Age calculation and validation utilities for health and safety compliance
 */

/**
 * Calculate age from birthdate
 *
 * @param birthDate - User's date of birth
 * @returns Current age in years
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Validation result for age-based health compliance
 */
export interface AgeValidation {
  valid: boolean
  age: number
  warning?: string
  error?: string
  requiresParentalConsent?: boolean
}

/**
 * Validate age for health app usage with COPPA and safety compliance
 *
 * @param birthDate - User's date of birth
 * @returns Validation result with age, errors, and warnings
 */
export function validateAge(birthDate: Date | string): AgeValidation {
  const age = calculateAge(birthDate)

  // Under 13: COPPA violation - not allowed
  if (age < 13) {
    return {
      valid: false,
      age,
      error: 'You must be at least 13 years old to use this app. This is required by law (COPPA).'
    }
  }

  // 13-17: Legal but requires parental consent
  if (age < 18) {
    return {
      valid: true,
      age,
      requiresParentalConsent: true,
      warning: 'As a minor, please consult with a parent/guardian and healthcare provider before starting any weight loss program. Growing teens have unique nutritional needs.'
    }
  }

  // Over 120: Likely input error
  if (age > 120) {
    return {
      valid: false,
      age,
      error: 'Please enter a valid birth date.'
    }
  }

  // 18-64: Normal adult range
  return { valid: true, age }
}

/**
 * Get age-appropriate calorie range with safety limits
 *
 * @param age - User's age in years
 * @param gender - User's gender
 * @returns Minimum and maximum safe calorie intake
 */
export function getAgeAppropriateCalorieRange(age: number, gender: string): {
  min: number
  max: number
  warning?: string
} {
  // Teens (13-18): Higher minimums due to growth needs
  if (age >= 13 && age <= 18) {
    return {
      min: gender === 'female' ? 1800 : 2200,
      max: gender === 'female' ? 2400 : 3200,
      warning: 'Growing teens need adequate calories for healthy development. Severely restricting calories can affect growth, bone density, and hormonal balance.'
    }
  }

  // Young adults (19-30): Peak calorie needs
  if (age >= 19 && age <= 30) {
    return {
      min: gender === 'female' ? 1200 : 1500,
      max: gender === 'female' ? 2400 : 3000
    }
  }

  // Middle age (31-50): Slightly lower needs
  if (age >= 31 && age <= 50) {
    return {
      min: gender === 'female' ? 1200 : 1500,
      max: gender === 'female' ? 2200 : 2800
    }
  }

  // Older adults (51-64): Lower calorie needs but adequate nutrition critical
  if (age >= 51 && age <= 64) {
    return {
      min: gender === 'female' ? 1200 : 1500,
      max: gender === 'female' ? 2000 : 2600,
      warning: 'Maintaining adequate nutrition is important as metabolism slows with age.'
    }
  }

  // Seniors (65+): Lower calorie needs, focus on nutrient density
  if (age >= 65) {
    return {
      min: gender === 'female' ? 1200 : 1500,
      max: gender === 'female' ? 2000 : 2400,
      warning: 'Seniors have lower calorie needs but require nutrient-dense foods. Consult with your healthcare provider before making dietary changes.'
    }
  }

  // Default adult range
  return {
    min: 1200,
    max: gender === 'female' ? 2400 : 3000
  }
}

/**
 * Get health warnings for specific age groups
 *
 * @param age - User's age in years
 * @returns Array of relevant health warnings/notices
 */
export function getAgeSpecificHealthNotices(age: number): Array<{ type: 'warning' | 'info'; message: string }> {
  const notices: Array<{ type: 'warning' | 'info'; message: string }> = []

  // Teens
  if (age >= 13 && age <= 17) {
    notices.push({
      type: 'warning',
      message: '⚠️ As a teenager, your body has unique nutritional needs for growth and development. Please consult with a healthcare provider or registered dietitian before starting any weight loss program.'
    })
  }

  // Young women (eating disorder risk)
  if (age >= 15 && age <= 25) {
    notices.push({
      type: 'info',
      message: 'If you have concerns about your relationship with food or body image, please reach out to a mental health professional. National Eating Disorders Association: 1-800-931-2237'
    })
  }

  // Seniors
  if (age >= 65) {
    notices.push({
      type: 'info',
      message: 'ℹ️ We recommend consulting with your healthcare provider to ensure our recommendations align with your health needs and any medications you may be taking.'
    })
  }

  return notices
}

/**
 * Format date for HTML date input (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get maximum birth date (13 years ago - minimum age for COPPA)
 *
 * @returns Date string for max attribute
 */
export function getMaxBirthDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 13)
  return formatDateForInput(date)
}

/**
 * Get minimum birth date (120 years ago - reasonable maximum age)
 *
 * @returns Date string for min attribute
 */
export function getMinBirthDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 120)
  return formatDateForInput(date)
}
