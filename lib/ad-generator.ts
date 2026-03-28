/**
 * Advertisement Image Generator
 *
 * Generates marketing ads for different platforms and personas
 * using canvas-based image generation
 */

import { AdTemplate, AdPersona } from './ad-templates'
import { logger } from './logger'

export type AdPlatform = 'instagram-feed' | 'instagram-story' | 'facebook-feed' | 'facebook-story' | 'twitter' | 'pinterest' | 'linkedin'

export interface AdDimensions {
  width: number
  height: number
  aspectRatio: string
  name: string
}

/**
 * Platform-specific ad dimensions
 * Optimized for paid advertising (not organic posts)
 */
export const AD_PLATFORM_SPECS: Record<AdPlatform, AdDimensions> = {
  'instagram-feed': {
    width: 1080,
    height: 1350, // 4:5 ratio
    aspectRatio: '4:5',
    name: 'Instagram Feed Ad'
  },
  'instagram-story': {
    width: 1080,
    height: 1920, // 9:16 ratio
    aspectRatio: '9:16',
    name: 'Instagram Story Ad'
  },
  'facebook-feed': {
    width: 1200,
    height: 1200, // 1:1 ratio
    aspectRatio: '1:1',
    name: 'Facebook Feed Ad'
  },
  'facebook-story': {
    width: 1080,
    height: 1920, // 9:16 ratio
    aspectRatio: '9:16',
    name: 'Facebook Story Ad'
  },
  'twitter': {
    width: 1200,
    height: 675, // 16:9 ratio
    aspectRatio: '16:9',
    name: 'Twitter Ad'
  },
  'pinterest': {
    width: 1000,
    height: 1500, // 2:3 ratio
    aspectRatio: '2:3',
    name: 'Pinterest Promoted Pin'
  },
  'linkedin': {
    width: 1200,
    height: 627, // ~1.91:1 ratio
    aspectRatio: '1.91:1',
    name: 'LinkedIn Ad'
  }
}

export interface AdGenerationOptions {
  template: AdTemplate
  platform: AdPlatform
  backgroundImage?: string // Optional background/hero image URL
  logoUrl?: string // Optional logo
  showPricing?: boolean
  pricingText?: string // e.g., "$9.99/mo"
}

/**
 * Generate advertisement image from template
 */
export async function generateAdvertisement(options: AdGenerationOptions): Promise<Blob> {
  const { template, platform, backgroundImage, logoUrl, showPricing, pricingText } = options

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas not supported')
    }

    const spec = AD_PLATFORM_SPECS[platform]
    const { width, height } = spec

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Determine if vertical (9:16, 4:5, 2:3) or horizontal (16:9, 1.91:1)
    const isVertical = height > width
    const isSquare = width === height

    // Calculate layout zones FIRST (needed for image positioning)
    const padding = width * 0.08

    // Define content zones for text
    // Vertical: top 60% for text, bottom 40% available for image
    // Horizontal: left 60% for text, right 40% available for image
    const textZoneHeight = isVertical ? height * 0.6 : height
    const textZoneWidth = isVertical ? width : width * 0.6
    const imageAvailableTop = isVertical ? textZoneHeight * 0.3 : 0 // Image can start 30% into text zone
    const imageAvailableHeight = isVertical ? height - imageAvailableTop : height
    const imageAvailableLeft = isVertical ? 0 : textZoneWidth * 0.5 // Image can start 50% into text zone
    const imageAvailableWidth = isVertical ? width : width - imageAvailableLeft

    // Background - gradient or image
    if (backgroundImage) {
      try {
        const img = await loadImage(backgroundImage)

        // Clamp utility function (CSS clamp logic)
        const clamp = (min: number, preferred: number, max: number) =>
          Math.max(min, Math.min(preferred, max))

        // Calculate scale using clamp(MIN, PREFERRED, MAX)
        // Goal: Fill background while showing consistent portion of image across all aspect ratios

        const scaleToContainCanvas = Math.min(width / img.width, height / img.height) // entire image visible
        const scaleToCoverCanvas = Math.max(width / img.width, height / img.height) // fills canvas completely

        // Use cover as preferred to ensure background always fills
        // Clamp between contain and slightly larger than cover for safety
        const minScale = scaleToCoverCanvas * 0.95 // min: almost fills canvas
        const maxScale = scaleToCoverCanvas * 1.2  // max: overfills for consistency
        const preferredScale = scaleToCoverCanvas  // preferred: fills canvas exactly

        const scale = clamp(minScale, preferredScale, maxScale)

        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale

        // Position image using clamp() to fill background while maintaining focal point
        const centerX = (width - scaledWidth) / 2
        const centerY = (height - scaledHeight) / 2

        // Calculate overflow limits (negative = image larger, positive = image smaller)
        const overflowX = width - scaledWidth
        const overflowY = height - scaledHeight

        const x = clamp(
          overflowX < 0 ? overflowX * 0.4 : overflowX / 2,  // min: 40% overflow or center
          centerX,                                            // preferred: center
          overflowX < 0 ? 0 : overflowX / 2                  // max: no right overflow or center
        )

        const y = clamp(
          overflowY < 0 ? overflowY * 0.3 : overflowY / 2,  // min: 30% overflow or center
          centerY,                                           // preferred: center
          overflowY < 0 ? 0 : overflowY / 2                 // max: no bottom overflow or center
        )

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

        // Subtle top gradient for headline readability — no heavy overlay
        const overlayGradient = ctx.createLinearGradient(0, 0, 0, height)
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)')    // Top: semi-dark for text
        overlayGradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.1)')  // Fade out quickly
        overlayGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)')     // Middle: fully transparent
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')       // Bottom: fully transparent
        ctx.fillStyle = overlayGradient
        ctx.fillRect(0, 0, width, height)
      } catch (error) {
        logger.warn('Failed to load background image, using gradient', { error })
        drawGradientBackground(ctx, width, height, template.colors)
      }
    } else {
      // Gradient background using template colors
      drawGradientBackground(ctx, width, height, template.colors)
    }

    // Research-backed font sizes. For vertical: scale from width. For horizontal: scale from height.
    const baseFontSize = Math.min(width, height) / 20
    const sizeRef = isVertical ? width : height // Horizontal images are short — scale from height
    const headlineFontSize = Math.max(24, sizeRef * (isVertical ? 0.055 : 0.075))
    const subheadlineFontSize = Math.max(18, sizeRef * 0.035)
    const bodyFontSize = Math.max(16, sizeRef * 0.028)
    const ctaFontSize = Math.max(16, sizeRef * (isVertical ? 0.035 : 0.04))
    const pricingFontSize = baseFontSize * 1.5

    // 10% safe zone inset on all sides (universal best practice)
    const safeZone = width * 0.10
    const contentWidth = width - (safeZone * 2)

    // Text positioned in lower 40% of image — let the photo breathe
    // Research: image should be the hero, text ~15% coverage
    let currentY = padding

    if (isVertical) {
      // Editorial style: headline at TOP, centered. Image is the hero below.
      // Like Pinterest/Instagram editorial posts.

      currentY = safeZone * 1.5

      // Headline — centered, bold, white with text shadow
      ctx.fillStyle = 'white'
      ctx.font = `800 ${headlineFontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 2

      // Wrap headline with quotation marks for editorial feel
      const headlineText = template.headline.startsWith('"') ? template.headline : `"${template.headline}"`
      const headlineLines = wrapText(ctx, headlineText, contentWidth * 0.85)
      headlineLines.forEach((line, i) => {
        ctx.fillText(line, width / 2, currentY + (i * headlineFontSize * 1.2))
      })
      currentY += (headlineLines.length * headlineFontSize * 1.2) + safeZone * 0.4

      // Subheadline — smaller, centered, below headline
      if (template.subheadline && template.subheadline.length < 60) {
        ctx.font = `500 ${subheadlineFontSize}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.shadowBlur = 4
        const subLines = wrapText(ctx, template.subheadline, contentWidth * 0.8)
        subLines.forEach((line, i) => {
          ctx.fillText(line, width / 2, currentY + (i * subheadlineFontSize * 1.3))
        })
      }

      // Reset — no CTA on image (goes in caption instead)
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'

    } else {
      // Horizontal or square layout (LinkedIn 1.91:1, Twitter 16:9, Facebook 1:1)
      // Editorial style: headline centered, upper portion

      currentY = safeZone * 1.5

      // Headline — centered, bold
      ctx.fillStyle = 'white'
      ctx.font = `800 ${headlineFontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 2

      const headlineText = template.headline.startsWith('"') ? template.headline : `"${template.headline}"`
      const headlineLines = wrapText(ctx, headlineText, contentWidth * 0.75)
      headlineLines.forEach((line, i) => {
        ctx.fillText(line, width / 2, currentY + (i * headlineFontSize * 1.2))
      })
      currentY += (headlineLines.length * headlineFontSize * 1.2) + safeZone * 0.3

      // Subheadline
      if (template.subheadline && template.subheadline.length < 60) {
        ctx.font = `500 ${subheadlineFontSize}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.shadowBlur = 4
        const subLines = wrapText(ctx, template.subheadline, contentWidth * 0.7)
        subLines.forEach((line, i) => {
          ctx.fillText(line, width / 2, currentY + (i * subheadlineFontSize * 1.3))
        })
      }

      // No CTA on image — goes in caption
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'
    }

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create ad image blob'))
        }
      }, 'image/png')
    })

  } catch (error) {
    logger.error('Error generating advertisement', error as Error, {
      platform,
      templateId: template.id,
      persona: template.persona
    })
    throw error
  }
}

/**
 * Draw gradient background using template colors
 */
function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: { primary: string; secondary: string; accent: string }
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, colors.primary)
  gradient.addColorStop(0.5, colors.secondary)
  gradient.addColorStop(1, colors.primary)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Draw CTA button
 */
function drawCTAButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fontSize: number,
  color: string
) {
  // Button background
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 8
  roundRect(ctx, x, y, width, height, height / 2)
  ctx.fill()

  // Reset shadow for text
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Button text
  ctx.fillStyle = 'white'
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + width / 2, y + height / 2)
}

/**
 * Wrap text to fit within width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine + ' ' + word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine)

  return lines
}

/**
 * Load image helper
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Only set crossOrigin for external URLs, not data URLs
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Draw rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
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
 * Generate filename for ad
 */
export function getAdFilename(template: AdTemplate, platform: AdPlatform): string {
  const date = new Date().toISOString().split('T')[0]
  const persona = template.persona.replace(/-/g, '_')
  const platformName = platform.replace(/-/g, '_')
  return `${date}_ad_${persona}_${platformName}_${template.id}.png`
}

/**
 * Download blob as file
 */
export function downloadAd(blob: Blob, filename: string) {
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
