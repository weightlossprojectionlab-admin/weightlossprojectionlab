'use client'

/**
 * Social Sharing Utilities
 *
 * Provides Web Share API integration for mobile and fallback platform links for desktop
 */

import { logger } from '@/lib/logger'

export interface ShareContent {
  title: string
  text: string
  url?: string
  imageUrl?: string
}

export interface ShareOptions {
  type: 'meal' | 'progress' | 'achievement' | 'streak' | 'chart' | 'gallery'
  data: any
}

/**
 * Check if Web Share API is supported
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

/**
 * Share using Web Share API (mobile)
 */
export async function shareViaWebAPI(content: ShareContent): Promise<boolean> {
  if (!isWebShareSupported()) {
    logger.warn('Web Share API not supported')
    return false
  }

  try {
    await navigator.share({
      title: content.title,
      text: content.text,
      url: content.url || window.location.href
    })
    return true
  } catch (error: any) {
    // User cancelled or error occurred
    if (error.name !== 'AbortError') {
      logger.error('Error sharing', error as Error)
    }
    return false
  }
}

/**
 * Generate shareable content for different contexts
 */
export function generateShareContent(options: ShareOptions): ShareContent {
  const { type, data } = options
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://weightlossprojectlab.com'

  switch (type) {
    case 'meal':
      return {
        title: `My ${data.mealType} - Weight Loss Project Lab`,
        text: `Just logged my ${data.mealType}: ${data.foodItems?.slice(0, 3).join(', ')}${data.foodItems?.length > 3 ? '...' : ''} (${data.calories} cal)! 🍽️ #HealthyEating #WeightLoss`,
        url: `${appUrl}/meals/${data.id}`,
        imageUrl: data.photoUrl
      }

    case 'progress':
      return {
        title: 'My Weight Loss Progress',
        text: `I've lost ${Math.abs(data.weightLoss).toFixed(1)} lbs${data.daysActive ? ` in ${data.daysActive} days` : ''}! 💪 Tracking my journey with Weight Loss Project Lab. #WeightLossJourney #Fitness`,
        url: `${appUrl}/progress`
      }

    case 'achievement':
      return {
        title: `Achievement Unlocked: ${data.badgeName}`,
        text: `Just earned the "${data.badgeName}" badge! ${data.description} 🏆 #Achievement #WeightLoss`,
        url: appUrl
      }

    case 'streak':
      return {
        title: `${data.streakDays}-Day Streak!`,
        text: `I'm on a ${data.streakDays}-day logging streak! 🔥 Staying consistent with my health goals. #Consistency #HealthyHabits`,
        url: appUrl
      }

    case 'chart':
      return {
        title: 'My Progress Charts',
        text: `Check out my weight loss progress! ${data.summary || ''} 📊 #Progress #DataDriven`,
        url: `${appUrl}/progress`
      }

    case 'gallery':
      return {
        title: 'My Meal Photo Gallery',
        text: `${data.photoCount} meals logged and counting! 📸 Visualizing my healthy eating journey. #FoodDiary #HealthyLifestyle`,
        url: `${appUrl}/gallery`
      }

    default:
      return {
        title: 'Weight Loss Project Lab',
        text: 'Track your nutrition and reach your health goals with AI-powered meal analysis! 🎯',
        url: appUrl
      }
  }
}

/**
 * Generate platform-specific share URLs (fallback for desktop)
 */
export function getPlatformShareUrls(content: ShareContent) {
  const encodedText = encodeURIComponent(content.text)
  const encodedUrl = encodeURIComponent(content.url || window.location.href)
  const encodedTitle = encodeURIComponent(content.title)

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`
  }
}

/**
 * Copy share link to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
      textArea.remove()
      return true
    } catch (error) {
      logger.error('Failed to copy', error as Error)
      textArea.remove()
      return false
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    logger.error('Failed to copy', error as Error)
    return false
  }
}

/**
 * Share content with automatic method selection
 * Uses Web Share API on mobile, falls back to platform links on desktop
 */
export async function share(options: ShareOptions): Promise<{
  success: boolean
  method: 'web-api' | 'platform-links' | 'none'
}> {
  const content = generateShareContent(options)

  // Try Web Share API first (mobile)
  if (isWebShareSupported()) {
    const success = await shareViaWebAPI(content)
    return { success, method: 'web-api' }
  }

  // Desktop - return platform links for modal
  return { success: false, method: 'platform-links' }
}

/**
 * Platform metadata for UI
 */
export const SHARE_PLATFORMS = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: '𝕏',
    color: 'bg-black hover:bg-gray-800'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    color: 'bg-secondary hover:bg-secondary-hover'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: 'bg-success-light0 hover:bg-success'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'in',
    color: 'bg-blue-700 hover:bg-blue-800'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'bg-secondary-light0 hover:bg-secondary'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    id: 'email',
    name: 'Email',
    icon: '✉️',
    color: 'bg-gray-600 hover:bg-gray-700'
  }
] as const

/**
 * Generate OG (Open Graph) metadata for sharing
 */
export function generateOGMetadata(options: ShareOptions) {
  const content = generateShareContent(options)

  return {
    title: content.title,
    description: content.text,
    image: content.imageUrl || '/og-image.png',
    url: content.url
  }
}
