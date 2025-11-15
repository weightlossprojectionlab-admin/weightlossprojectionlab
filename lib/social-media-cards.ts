// Platform-specific social media card generators

import { logger } from '@/lib/logger'

export type SocialPlatform = 'instagram-story' | 'instagram-post' | 'tiktok' | 'facebook' | 'pinterest' | 'twitter'

export interface MealCardData {
  title?: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  calories: number
  macros?: {
    protein: number
    carbs: number
    fat: number
  }
  loggedAt: string | Date
  foodItems?: string[]
}

/**
 * Platform-specific marketing text overlays
 */
interface PlatformMarketingText {
  overlay: string
  subtitle: string
  footer: string
}

function getPlatformMarketingText(platform: SocialPlatform): PlatformMarketingText {
  switch (platform) {
    case 'instagram-story':
    case 'instagram-post':
      return {
        overlay: 'My Transformation Continues! 💪',
        subtitle: 'Every meal is a win!',
        footer: '#MyProgress #Consistency #FitnessJourney'
      }
    case 'tiktok':
      return {
        overlay: "POV: I'm Actually Sticking To It 💯",
        subtitle: 'Still showing up!',
        footer: '#MyJourney #Consistency #WhatIEat'
      }
    case 'facebook':
      return {
        overlay: 'Keeping Myself Accountable! 💪',
        subtitle: 'My fitness journey',
        footer: '#MyJourney #Accountability #Progress'
      }
    case 'pinterest':
      return {
        overlay: 'My Healthy Meal Idea 🥗',
        subtitle: 'Save this for later!',
        footer: '#HealthyMeals #MealIdeas #MyJourney'
      }
    case 'twitter':
      return {
        overlay: 'Making Progress! 🎯',
        subtitle: 'Consistency is key',
        footer: '#MyJourney #Tracking #Progress'
      }
    default:
      return {
        overlay: 'My Fitness Journey 💪',
        subtitle: 'Every meal counts!',
        footer: '#MyProgress #Consistency'
      }
  }
}

export interface PlatformDimensions {
  width: number
  height: number
  photoPercent: number // Percentage of canvas for photo
  name: string
  aspectRatio: string
}

/**
 * Platform-specific dimensions and settings
 */
export const PLATFORM_SPECS: Record<SocialPlatform, PlatformDimensions> = {
  'instagram-story': {
    width: 1080,
    height: 1920,
    photoPercent: 0.65,
    name: 'Instagram Story/Reel',
    aspectRatio: '9:16'
  },
  'instagram-post': {
    width: 1080,
    height: 1080,
    photoPercent: 0.5,
    name: 'Instagram Post',
    aspectRatio: '1:1'
  },
  'tiktok': {
    width: 1080,
    height: 1920,
    photoPercent: 0.65,
    name: 'TikTok',
    aspectRatio: '9:16'
  },
  'facebook': {
    width: 1200,
    height: 630,
    photoPercent: 0.6,
    name: 'Facebook Post',
    aspectRatio: '1.91:1'
  },
  'pinterest': {
    width: 1000,
    height: 1500,
    photoPercent: 0.6,
    name: 'Pinterest Pin',
    aspectRatio: '2:3'
  },
  'twitter': {
    width: 1200,
    height: 675,
    photoPercent: 0.6,
    name: 'Twitter/X Post',
    aspectRatio: '16:9'
  }
}

/**
 * Generate a social media card for a specific platform
 */
export async function generatePlatformCard(
  meal: MealCardData,
  platform: SocialPlatform
): Promise<Blob> {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas not supported')
    }

  const spec = PLATFORM_SPECS[platform]
  const { width, height, photoPercent } = spec
  const marketingText = getPlatformMarketingText(platform)

  // Set canvas dimensions
  canvas.width = width
  canvas.height = height

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#667eea') // Indigo
  gradient.addColorStop(1, '#764ba2') // Purple
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // If meal has photo, draw it
  const photoHeight = height * photoPercent
  let photoLoaded = false

  if (meal.photoUrl) {
    try {
      const img = await loadImage(meal.photoUrl)

      // Draw photo in top section (centered, cover style)
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

      photoLoaded = true
    } catch (error) {
      logger.error('Failed to load meal photo for social media card', error as Error, {
        photoUrl: meal.photoUrl,
        platform
      })
      // Continue without photo - will show placeholder below
    }
  }

  // If no photo or photo failed to load, show placeholder
  if (!photoLoaded && meal.photoUrl) {
    ctx.save()
    ctx.fillStyle = '#1F2937'
    ctx.fillRect(0, 0, width, photoHeight)

    // Placeholder icon
    const iconSize = Math.min(width, photoHeight) / 4
    ctx.fillStyle = '#4B5563'
    ctx.font = `${iconSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🍽️', width / 2, photoHeight / 2)

    ctx.restore()
  }

  // Add marketing overlay on photo (whether photo loaded or placeholder shown)
  if (meal.photoUrl) {
    ctx.save()

    // Semi-transparent gradient overlay for readability (stronger)
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, photoHeight * 0.4)
    overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)')
    overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = overlayGradient
    ctx.fillRect(0, 0, width, photoHeight * 0.4)

    // Marketing text overlay with better contrast
    const overlayFontSize = Math.min(width, height) / 18

    // For vertical formats (9:16), use smaller font to prevent text cutoff
    const isVertical = height > width * 1.5
    const headingFontSize = isVertical ? overlayFontSize * 1.1 : overlayFontSize * 1.4
    const subtitleFontSize = isVertical ? overlayFontSize * 0.85 : overlayFontSize * 1

    ctx.fillStyle = 'white'
    ctx.font = `bold ${headingFontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'

    // Stronger shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.fillText(marketingText.overlay, width / 2, overlayFontSize * 2.5)

    // Subtitle with slightly lighter weight
    ctx.font = `600 ${subtitleFontSize}px system-ui, -apple-system, sans-serif`
    ctx.shadowBlur = 12
    ctx.fillText(marketingText.subtitle, width / 2, overlayFontSize * 4.2)

    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    ctx.restore()
  }

  // Content area - positioned below photo
  const contentY = meal.photoUrl ? height * photoPercent : height * 0.25
  const contentHeight = height - contentY

  // White rounded rectangle for content - responsive padding
  const horizontalPadding = width * 0.04 // 4% padding on each side
  const verticalPadding = contentHeight * 0.08 // 8% padding top/bottom
  const cornerRadius = Math.min(width, contentHeight) * 0.03 // Responsive corner radius

  ctx.fillStyle = 'white'
  roundRect(
    ctx,
    horizontalPadding,
    contentY + verticalPadding,
    width - (horizontalPadding * 2),
    contentHeight - (verticalPadding * 2),
    cornerRadius
  )
  ctx.fill()

  // Calculate font sizes based on canvas size (responsive)
  const baseFontSize = Math.min(width, height) / 20
  const emojiSize = baseFontSize * 1.2
  const titleSize = baseFontSize * 1.1
  const caloriesSize = baseFontSize * 1.8
  const macrosSize = baseFontSize * 0.8
  const footerSize = baseFontSize * 0.6

  // Meal type emoji and title
  ctx.fillStyle = '#1F2937'
  ctx.font = `bold ${emojiSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'

  const mealEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  }
  const emoji = mealEmojis[meal.mealType] || '🍽️'

  let textY = contentY + (contentHeight * 0.12)
  ctx.fillText(emoji, width / 2, textY)

  // Title or meal type - First Person
  textY += emojiSize * 1.1
  ctx.font = `bold ${titleSize}px system-ui, -apple-system, sans-serif`
  const mealTypeCap = meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)
  const displayTitle = meal.title ? `My ${meal.title} 💪` : `My ${mealTypeCap} Win! 💪`
  ctx.fillText(displayTitle, width / 2, textY)

  // Calories (large) - centered in remaining space
  textY += contentHeight * 0.18
  ctx.fillStyle = '#4F46E5'
  ctx.font = `bold ${caloriesSize}px system-ui, -apple-system, sans-serif`
  ctx.fillText(`${meal.calories}`, width / 2, textY)

  textY += caloriesSize * 0.55
  ctx.fillStyle = '#6B7280'
  ctx.font = `${macrosSize * 1.05}px system-ui, -apple-system, sans-serif`
  ctx.fillText('calories', width / 2, textY)

  // Macros
  if (meal.macros) {
    textY += contentHeight * 0.14
    ctx.font = `bold ${macrosSize}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = '#1F2937'

    const macrosText = `P: ${meal.macros.protein}g  •  C: ${meal.macros.carbs}g  •  F: ${meal.macros.fat}g`
    ctx.fillText(macrosText, width / 2, textY)
  }

  // Enhanced Footer with Marketing - positioned at bottom of white content box
  // White box ends at: contentY + verticalPadding + (contentHeight - verticalPadding * 2)
  const contentBoxBottom = contentY + contentHeight - verticalPadding
  const footerBottomPadding = baseFontSize * 1.5

  // Line 2: Hashtags (purple/primary color) - bottom-most, inside white box
  let footerY = contentBoxBottom - footerBottomPadding
  ctx.font = `${footerSize * 0.7}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = '#8B5CF6'
  ctx.fillText(marketingText.footer, width / 2, footerY)

  // Line 1: Branding (lighter) - above hashtags
  footerY -= footerSize * 2.2
  ctx.font = `${footerSize * 0.7}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = '#9CA3AF'
  ctx.fillText('Tracked with Weight Loss Project Lab', width / 2, footerY)

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
  } catch (error) {
    logger.error('Error in generatePlatformCard', error as Error, {
      platform,
      mealType: meal.mealType,
      hasPhoto: !!meal.photoUrl,
      photoUrl: meal.photoUrl
    })
    throw error
  }
}

/**
 * Helper function to extract storage path from Firebase Storage URL
 * Example: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media
 * Returns: path/to/file.jpg
 */
function getStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/)
    if (pathMatch && pathMatch[1]) {
      // Decode the URI component to get the actual path
      return decodeURIComponent(pathMatch[1])
    }
    return null
  } catch (error) {
    logger.error('Failed to parse Firebase Storage URL', error as Error, { url })
    return null
  }
}

/**
 * Helper function to load an image
 * For Firebase Storage URLs, we use a proxy API to avoid CORS issues
 */
const loadImage = async (url: string): Promise<HTMLImageElement> => {
  // For Firebase Storage URLs, use proxy API to avoid CORS
  if (url.includes('firebasestorage.googleapis.com')) {
    try {
      logger.info('Loading Firebase image via proxy API', { url })

      // Use proxy API route to fetch image (avoids CORS)
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`

      // Load image from proxy
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          logger.info('Image loaded successfully from proxy', { width: img.width, height: img.height })
          resolve(img)
        }
        img.onerror = (error) => {
          logger.error('Failed to load image from proxy API', { url, proxyUrl, error })
          reject(new Error('Failed to load image from proxy'))
        }
        // No crossOrigin needed - same origin (proxy API)
        img.src = proxyUrl
      })
    } catch (error) {
      logger.error('Failed to load Firebase image via proxy', error as Error, { url })
      throw error
    }
  }

  // For non-Firebase URLs, use standard loading with CORS
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (error) => {
      logger.error('Failed to load image for social media card', { url, error })
      reject(new Error(`Failed to load image: ${url}`))
    }
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
 * Download blob as file
 */
export function downloadCard(blob: Blob, filename: string) {
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
 * Generate filename for platform card
 */
export function getCardFilename(meal: MealCardData, platform: SocialPlatform): string {
  const date = new Date(meal.loggedAt)
  const dateStr = date.toISOString().split('T')[0]
  const mealType = meal.mealType
  const platformName = platform.replace('-', '_')
  return `${dateStr}_${mealType}_${platformName}.png`
}
