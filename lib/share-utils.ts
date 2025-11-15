// Utility functions for social media sharing

import { logger } from '@/lib/logger'

/**
 * Detect if user is on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false

  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i

  // Check screen size (mobile typically < 768px)
  const isSmallScreen = window.innerWidth < 768

  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen
}

interface MealShareData {
  title?: string
  mealType: string
  photoUrl?: string
  totalCalories: number
  macros?: {
    protein: number
    carbs: number
    fat: number
  }
  loggedAt: string
  foodItems?: any[]
}

/**
 * Generate a shareable image card for a meal
 * Creates a canvas with meal information and returns as blob
 */
export const generateMealShareCard = async (meal: MealShareData): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  // Set canvas dimensions (9:16 vertical format for Stories/Reels/TikTok: 1080x1920)
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#667eea') // Indigo
  gradient.addColorStop(1, '#764ba2') // Purple
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // If meal has photo, draw it
  if (meal.photoUrl) {
    try {
      const img = await loadImage(meal.photoUrl)

      // Draw photo in top section (centered, cover style) - 65% of canvas
      const photoHeight = height * 0.65
      const scale = Math.max(width / img.width, photoHeight / img.height)
      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale
      const x = (width - scaledWidth) / 2
      const y = (photoHeight - scaledHeight) / 2

      ctx.save()
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, photoHeight)
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
      ctx.restore()
    } catch (error) {
      logger.error('Failed to load meal photo', error as Error)
    }
  }

  // Content area - positioned below photo
  const contentY = meal.photoUrl ? height * 0.65 : height * 0.25

  // White rounded rectangle for content
  ctx.fillStyle = 'white'
  roundRect(ctx, 40, contentY + 40, width - 80, height - contentY - 80, 20)
  ctx.fill()

  // Meal type emoji and title
  ctx.fillStyle = '#1F2937'
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'

  const mealEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  }
  const emoji = mealEmojis[meal.mealType] || '🍽️'

  let textY = contentY + 100
  ctx.fillText(emoji, width / 2, textY)

  // Title or meal type
  textY += 70
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
  const displayTitle = meal.title || meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)
  ctx.fillText(displayTitle, width / 2, textY)

  // Calories (large)
  textY += 100
  ctx.fillStyle = '#4F46E5'
  ctx.font = 'bold 80px system-ui, -apple-system, sans-serif'
  ctx.fillText(`${meal.totalCalories}`, width / 2, textY)

  textY += 45
  ctx.fillStyle = '#6B7280'
  ctx.font = '32px system-ui, -apple-system, sans-serif'
  ctx.fillText('calories', width / 2, textY)

  // Macros
  if (meal.macros) {
    textY += 80
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#1F2937'

    const macrosText = `P: ${meal.macros.protein}g  •  C: ${meal.macros.carbs}g  •  F: ${meal.macros.fat}g`
    ctx.fillText(macrosText, width / 2, textY)
  }

  // Footer branding
  textY = height - 70
  ctx.font = '28px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#9CA3AF'
  ctx.fillText('Tracked with Weight Loss Project Lab', width / 2, textY)

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create image blob'))
      }
    }, 'image/png')
  })
}

/**
 * Helper function to load an image
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Helper function to draw rounded rectangle
 */
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Generate caption text for social media (platform-specific)
 */
export const generateShareCaption = (meal: MealShareData, platform?: string): string => {
  const mealName = meal.title || `${meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}`
  const date = new Date(meal.loggedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  let caption = ''

  // Platform-specific formatting
  switch (platform) {
    case 'instagram-story':
    case 'instagram-post':
      // Instagram: First-person, emoji-heavy, engaging
      caption = `💪 Staying on track with this ${mealName.toLowerCase()}!\n\n`
      caption += `📊 ${meal.totalCalories} cal`
      if (meal.macros) {
        caption += ` | P:${meal.macros.protein}g C:${meal.macros.carbs}g F:${meal.macros.fat}g`
      }
      caption += `\n`
      if (meal.foodItems && meal.foodItems.length > 0) {
        const foodNames = meal.foodItems
          .slice(0, 3)
          .map((item: any) => typeof item === 'string' ? item : item.name)
          .join(', ')
        caption += `🥗 ${foodNames}${meal.foodItems.length > 3 ? '...' : ''}\n\n`
      }
      caption += `\nMy fitness journey continues. Every meal counts! 💯\n\n`
      caption += `#MyFitnessJourney #Tracking #HealthGoals #Dedication #Macros #Accountability #HealthyLifestyle #WeightLossJourney #FitFam #StayingConsistent`
      break

    case 'tiktok':
      // TikTok: First-person, trendy, energetic
      caption = `POV: I'm actually sticking to my goals 💪\n\n`
      caption += `${mealName} - ${meal.totalCalories} cals ⚡\n`
      if (meal.macros) {
        caption += `P${meal.macros.protein} C${meal.macros.carbs} F${meal.macros.fat}\n\n`
      }
      caption += `Still showing up. Still tracking. 🔥\n\n`
      caption += `#MyJourney #FitnessGoals #WhatIEat #Accountability #CalorieDeficit #MacroTracking #StillGoing #FitTok #WIEIAD #ConsistencyIsKey`
      break

    case 'facebook':
      // Facebook: First-person, longer form, accountability
      caption = `Keeping myself accountable! 💪\n\n`
      caption = `Here's my ${meal.mealType} today:\n`
      caption += `• ${meal.totalCalories} calories\n`
      if (meal.macros) {
        caption += `• ${meal.macros.protein}g protein, ${meal.macros.carbs}g carbs, ${meal.macros.fat}g fat\n`
      }
      if (meal.foodItems && meal.foodItems.length > 0) {
        const foodNames = meal.foodItems
          .slice(0, 4)
          .map((item: any) => typeof item === 'string' ? item : item.name)
          .join(', ')
        caption += `\n🥗 ${foodNames}${meal.foodItems.length > 4 ? ', and more' : ''}\n`
      }
      caption += `\nI'm seeing real progress. Every meal tracked is a step toward my goal! 🎯\n\n`
      caption += `Who else is staying consistent this week? 👇\n\n`
      caption += `#MyJourney #Accountability #HealthGoals #Progress #StayingOnTrack`
      break

    case 'pinterest':
      // Pinterest: First-person but SEO-friendly
      caption = `My ${mealName} - ${meal.totalCalories} Calories\n\n`
      caption += `What I eat to stay on track: `
      if (meal.macros) {
        caption += `${meal.macros.protein}g protein, ${meal.macros.carbs}g carbs, ${meal.macros.fat}g fat. `
      }
      if (meal.foodItems && meal.foodItems.length > 0) {
        const foodNames = meal.foodItems
          .slice(0, 4)
          .map((item: any) => typeof item === 'string' ? item : item.name)
          .join(', ')
        caption += `\n\nIncludes: ${foodNames}. `
      }
      caption += `\n\nDocumenting my fitness journey one meal at a time. Consistency > Perfection 💪\n\n`
      caption += `#MyJourney #HealthyMeals #WeightLoss #MacroFriendly #NutritionGoals #FitnessFood #MealIdeas #BalancedDiet`
      break

    case 'twitter':
      // Twitter: First-person, concise, under 280 chars
      caption = `My ${meal.mealType} today: ${mealName} 🍽️\n${meal.totalCalories} cal`
      if (meal.macros) {
        caption += ` | P${meal.macros.protein} C${meal.macros.carbs} F${meal.macros.fat}`
      }
      caption += `\n\nStaying consistent! 💪\n\n#MyJourney #Tracking #Consistency`
      break

    default:
      // Default: First-person, balanced, works everywhere
      caption = `💪 Making progress with my ${meal.mealType}!\n\n`
      caption += `📊 ${meal.totalCalories} calories`
      if (meal.macros) {
        caption += ` | P:${meal.macros.protein}g C:${meal.macros.carbs}g F:${meal.macros.fat}g`
      }
      caption += `\n`
      if (meal.foodItems && meal.foodItems.length > 0) {
        const foodNames = meal.foodItems
          .slice(0, 3)
          .map((item: any) => typeof item === 'string' ? item : item.name)
          .join(', ')
        caption += `🥗 ${foodNames}${meal.foodItems.length > 3 ? ', and more' : ''}\n\n`
      }
      caption += `\nMy fitness journey continues - every meal counts! 🎯\n\n`
      caption += `#MyFitnessJourney #Tracking #HealthGoals #Progress`
  }

  return caption
}

/**
 * Share meal - returns share data for modal (desktop) or downloads directly (mobile)
 */
export const shareMeal = async (meal: MealShareData): Promise<{ imageBlob: Blob; caption: string; isMobile: boolean }> => {
  // Generate share card image
  const imageBlob = await generateMealShareCard(meal)
  const caption = generateShareCaption(meal)
  const isMobile = isMobileDevice()

  // Mobile: Direct download + copy caption
  if (isMobile) {
    downloadImage(imageBlob, 'meal-share.png')

    // Copy caption to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(caption)
      } catch (error) {
        logger.warn('Failed to copy caption to clipboard')
      }
    }
  }

  // Return data for desktop modal or mobile confirmation
  return { imageBlob, caption, isMobile }
}

/**
 * Share to specific platform (desktop only)
 */
export const shareToPlatform = async (
  platform: 'facebook' | 'twitter' | 'pinterest' | 'instagram' | 'tiktok',
  meal: MealShareData,
  imageBlob: Blob
): Promise<void> => {
  const caption = generateShareCaption(meal)
  const platformInfo = getPlatformInfo(platform)

  // For platforms that support web sharing
  if (platformInfo.supportsWebShare) {
    // Create a temporary URL for the current page (or use a custom URL)
    const shareUrl = window.location.href
    const shareLink = getPlatformShareUrl(platform, shareUrl, caption)

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400')
    }
  } else {
    // For Instagram and TikTok, download the image
    downloadImage(imageBlob, `meal-share-${platform}.png`)

    // Copy caption to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(caption)
    }
  }
}

/**
 * Download image blob as file
 */
const downloadImage = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get platform-specific share URLs and metadata
 */
export const getPlatformShareUrl = (
  platform: 'facebook' | 'twitter' | 'pinterest' | 'instagram' | 'tiktok',
  url: string,
  text: string,
  imageUrl?: string
): string => {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : ''

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    case 'pinterest':
      return imageUrl
        ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`
        : `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`
    case 'instagram':
      // Instagram doesn't support web sharing - returns empty string
      return ''
    case 'tiktok':
      // TikTok doesn't support web sharing - returns empty string
      return ''
    default:
      return ''
  }
}

/**
 * Get platform metadata (name, icon, etc.)
 */
export const getPlatformInfo = (platform: 'facebook' | 'twitter' | 'pinterest' | 'instagram' | 'tiktok') => {
  const platforms = {
    facebook: { name: 'Facebook', icon: '📘', color: '#1877F2', supportsWebShare: true },
    twitter: { name: 'X (Twitter)', icon: '✖️', color: '#000000', supportsWebShare: true },
    pinterest: { name: 'Pinterest', icon: '📍', color: '#E60023', supportsWebShare: true },
    instagram: { name: 'Instagram', icon: '📸', color: '#E4405F', supportsWebShare: false },
    tiktok: { name: 'TikTok', icon: '🎵', color: '#000000', supportsWebShare: false }
  }
  return platforms[platform]
}
