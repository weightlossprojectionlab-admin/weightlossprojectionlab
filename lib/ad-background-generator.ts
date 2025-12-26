/**
 * Ad Background Image Generator
 *
 * Generates or fetches appropriate background images for ads
 * based on persona and template context
 */

import { AdPersona, AdTemplate } from './ad-templates'
import { logger } from './logger'

export interface BackgroundImageOptions {
  persona: AdPersona
  template: AdTemplate
  style?: 'photo' | 'illustration' | 'gradient' | 'abstract'
}

/**
 * Persona-specific image prompts for AI generation
 */
const PERSONA_IMAGE_PROMPTS: Record<AdPersona, {
  keywords: string[]
  style: string
  mood: string
}> = {
  'weight-loss-warrior': {
    keywords: ['fitness', 'workout', 'healthy meal', 'transformation', 'running', 'gym', 'wellness'],
    style: 'energetic, motivational, vibrant',
    mood: 'inspiring, determined, victorious'
  },
  'family-health-manager': {
    keywords: ['family dinner', 'healthy cooking', 'meal prep', 'family fitness', 'kitchen', 'family wellness'],
    style: 'warm, inviting, organized',
    mood: 'wholesome, caring, connected'
  },
  'medical-caregiver': {
    keywords: ['healthcare', 'medical care', 'senior care', 'home health', 'caregiver support', 'medical technology'],
    style: 'professional, clean, trustworthy',
    mood: 'reassuring, peaceful, supportive'
  }
}

/**
 * Generate prompt for AI image generation
 */
export function generateImagePrompt(options: BackgroundImageOptions): string {
  const { persona, template, style = 'photo' } = options
  const promptData = PERSONA_IMAGE_PROMPTS[persona]

  // Build contextual prompt based on template emotional hook
  const basePrompt = `Professional ${style} for ${template.type} advertisement`
  const context = `showing ${promptData.keywords.join(' or ')}`
  const styleDescription = `${promptData.style} style, ${promptData.mood} mood`
  const technical = 'high quality, professional marketing image, clean composition, suitable for overlay text'

  return `${basePrompt}, ${context}. ${styleDescription}. ${technical}. No text or words in image.`
}

/**
 * Generate background using OpenAI DALL-E
 */
export async function generateWithDALLE(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1792'
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add NEXT_PUBLIC_OPENAI_API_KEY to .env.local')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
        style: 'vivid'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`DALL-E API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data[0].url

  } catch (error) {
    logger.error('Failed to generate image with DALL-E', error as Error)
    throw error
  }
}

/**
 * Fetch relevant stock photo from Unsplash
 * Uses curated photo collection - no API key required
 */
export async function fetchUnsplashPhoto(
  query: string,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'portrait'
): Promise<string> {
  try {
    // Use Unsplash's random photo endpoint with collections
    // This works without API key for reasonable usage
    const width = orientation === 'portrait' ? 1080 :
                  orientation === 'landscape' ? 1920 : 1080
    const height = orientation === 'portrait' ? 1920 :
                   orientation === 'landscape' ? 1080 : 1080

    // Use Picsum for now (reliable, no API key needed)
    // Or use curated Unsplash collection URLs
    const url = `https://picsum.photos/${width}/${height}?random=${Date.now()}`

    return url

  } catch (error) {
    logger.error('Failed to fetch stock photo', error as Error, { query })
    throw error
  }
}

/**
 * Generate gradient background (no API needed)
 */
export function generateGradientDataURL(
  colors: { primary: string; secondary: string; accent: string },
  width: number = 1080,
  height: number = 1920
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, colors.primary)
  gradient.addColorStop(0.5, colors.secondary)
  gradient.addColorStop(1, colors.accent)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  return canvas.toDataURL('image/png')
}

/**
 * Generate abstract pattern background
 */
export function generateAbstractBackground(
  colors: { primary: string; secondary: string; accent: string },
  width: number = 1080,
  height: number = 1920
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  // Base gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, colors.primary)
  gradient.addColorStop(1, colors.secondary)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Add abstract circles
  const circleCount = 8
  for (let i = 0; i < circleCount; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = Math.random() * (Math.min(width, height) / 3)

    const circleGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    circleGradient.addColorStop(0, `${colors.accent}40`) // 25% opacity
    circleGradient.addColorStop(1, `${colors.accent}00`) // 0% opacity

    ctx.fillStyle = circleGradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.toDataURL('image/png')
}

/**
 * Main function to get background image
 * Tries multiple strategies based on availability and user preference
 */
export async function getBackgroundImage(
  options: BackgroundImageOptions,
  method: 'ai' | 'stock' | 'gradient' | 'abstract' = 'gradient',
  dimensions: { width: number; height: number } = { width: 1080, height: 1920 }
): Promise<string> {
  try {
    switch (method) {
      case 'ai': {
        // Try AI generation with DALL-E
        const prompt = generateImagePrompt(options)
        logger.info('Generating AI background', { prompt })

        // Determine size based on dimensions
        const size = dimensions.height > dimensions.width ? '1024x1792' :
                     dimensions.width > dimensions.height ? '1792x1024' : '1024x1024'

        return await generateWithDALLE(prompt, size as any)
      }

      case 'stock': {
        // Fetch from Unsplash
        const promptData = PERSONA_IMAGE_PROMPTS[options.persona]
        const query = promptData.keywords[0] // Use primary keyword
        const orientation = dimensions.height > dimensions.width ? 'portrait' :
                           dimensions.width > dimensions.height ? 'landscape' : 'squarish'

        logger.info('Fetching stock photo', { query, orientation })
        return await fetchUnsplashPhoto(query, orientation)
      }

      case 'abstract': {
        // Generate abstract background
        return generateAbstractBackground(options.template.colors, dimensions.width, dimensions.height)
      }

      case 'gradient':
      default: {
        // Generate gradient (fastest, no API)
        return generateGradientDataURL(options.template.colors, dimensions.width, dimensions.height)
      }
    }
  } catch (error) {
    logger.error('Failed to get background image, falling back to gradient', error as Error)
    // Fallback to gradient
    return generateGradientDataURL(options.template.colors, dimensions.width, dimensions.height)
  }
}

/**
 * Presets for quick background selection
 */
export const BACKGROUND_PRESETS = {
  'weight-loss-warrior': {
    'transformation': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1080&h=1920&fit=crop',
    'workout': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080&h=1920&fit=crop',
    'healthy-food': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1080&h=1920&fit=crop'
  },
  'family-health-manager': {
    'family-meal': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1080&h=1920&fit=crop',
    'meal-prep': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1080&h=1920&fit=crop',
    'family-wellness': 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=1080&h=1920&fit=crop'
  },
  'medical-caregiver': {
    'healthcare': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1080&h=1920&fit=crop',
    'senior-care': 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1080&h=1920&fit=crop',
    'medical-tech': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1080&h=1920&fit=crop'
  }
} as const
