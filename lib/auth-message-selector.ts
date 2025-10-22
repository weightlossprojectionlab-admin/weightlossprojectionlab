/**
 * Auth Loading Message Selector
 * Selects personalized funny loading messages based on user journey status
 */

import messages from './auth-loading-messages.json'

export type MessageCategory = 'newUser' | 'firstTimer' | 'streaker' | 'comebackKid' | 'powerUser' | 'weekendWarrior' | 'generic'

export interface UserJourneyData {
  onboardingCompleted?: boolean
  currentStreak?: number
  longestStreak?: number
  level?: number
  missionsCompleted?: number
  weightLogsCount?: number
  mealLogsCount?: number
}

/**
 * Get a random personalized loading message based on user's journey status
 * @param userData - Optional user journey data for personalization
 * @returns A personalized funny loading message
 */
export function getAuthLoadingMessage(userData?: UserJourneyData | null): string {
  const category = determineCategory(userData)
  const categoryMessages = messages[category]

  if (!categoryMessages || categoryMessages.length === 0) {
    // Fallback to generic if category has no messages
    return getRandomMessage(messages.generic)
  }

  const message = getRandomMessage(categoryMessages)

  // Replace {streak} placeholder if in streaker category
  if (category === 'streaker' && userData?.currentStreak) {
    return message.replace('{streak}', userData.currentStreak.toString())
  }

  return message
}

/**
 * Determine which message category to use based on user data
 */
function determineCategory(userData?: UserJourneyData | null): MessageCategory {
  // No user data = generic messages
  if (!userData) {
    return 'generic'
  }

  // Check if it's the weekend (Saturday = 6, Sunday = 0)
  const dayOfWeek = new Date().getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  // Priority 1: New users (onboarding not completed)
  if (userData.onboardingCompleted === false) {
    return 'newUser'
  }

  // Priority 2: Power users (high engagement)
  const totalActivity = (userData.weightLogsCount || 0) + (userData.mealLogsCount || 0)
  const isPowerUser = (userData.level || 0) >= 5 ||
                      (userData.missionsCompleted || 0) >= 10 ||
                      totalActivity >= 50

  if (isPowerUser) {
    return 'powerUser'
  }

  // Priority 3: Active streakers (current streak > 0)
  if ((userData.currentStreak || 0) > 0) {
    return 'streaker'
  }

  // Priority 4: Comeback kids (had a streak before, but it broke)
  if ((userData.longestStreak || 0) > 0 && (userData.currentStreak || 0) === 0) {
    return 'comebackKid'
  }

  // Priority 5: First-timers (just completed onboarding, low activity)
  if (userData.onboardingCompleted && totalActivity < 10) {
    return 'firstTimer'
  }

  // Priority 6: Weekend warriors (it's the weekend)
  if (isWeekend) {
    return 'weekendWarrior'
  }

  // Default: Generic funny messages
  return 'generic'
}

/**
 * Get a random message from an array of messages
 */
function getRandomMessage(messageArray: string[]): string {
  const randomIndex = Math.floor(Math.random() * messageArray.length)
  return messageArray[randomIndex]
}

/**
 * Get all messages for a specific category (for testing/debugging)
 */
export function getMessagesForCategory(category: MessageCategory): string[] {
  return messages[category] || []
}

/**
 * Get the category that would be selected for given user data (for testing/debugging)
 */
export function getCategoryForUser(userData?: UserJourneyData | null): MessageCategory {
  return determineCategory(userData)
}
