// Recipe sharing utilities extending share-utils.ts functionality
import { MealSuggestion } from './meal-suggestions'
import viralHooks from './viral-hooks.json'
import { TemplateStyle, renderTemplate, TemplateRenderContext } from './recipe-templates'

export type AspectRatio = '1:1' | '9:16' | '3:2'

/**
 * Generate a shareable image card for a recipe
 * Creates a canvas with recipe information and returns as blob
 */
export const generateRecipeShareCard = async (
  recipe: MealSuggestion,
  aspectRatio: AspectRatio = '1:1',
  templateStyle: TemplateStyle = 'minimalist'
): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  // Set canvas dimensions based on aspect ratio
  let width: number
  let height: number

  switch (aspectRatio) {
    case '9:16': // Story format (1080x1920)
      width = 1080
      height = 1920
      break
    case '3:2': // Landscape format (1080x720)
      width = 1080
      height = 720
      break
    case '1:1': // Square format (1080x1080)
    default:
      width = 1080
      height = 1080
      break
  }

  canvas.width = width
  canvas.height = height

  // Render template
  const context: TemplateRenderContext = {
    ctx,
    canvas,
    recipe,
    width,
    height,
    aspectRatio
  }

  renderTemplate(templateStyle, context)

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
 * Generate caption text for social media recipe sharing
 */
export const generateRecipeShareCaption = (recipe: MealSuggestion): string => {
  // Get a random viral hook for social sharing
  const socialHooks = viralHooks.social
  const randomHook = socialHooks[Math.floor(Math.random() * socialHooks.length)]

  let caption = `${randomHook}\n\n`
  caption += `🍽️ ${recipe.name}\n`
  caption += `📊 ${recipe.calories} cal | ${recipe.macros.protein}g protein | ${recipe.prepTime} min\n\n`

  if (recipe.description) {
    caption += `${recipe.description}\n\n`
  }

  // Add dietary tags
  if (recipe.dietaryTags.length > 0) {
    caption += `✨ ${recipe.dietaryTags.slice(0, 3).join(', ')}\n\n`
  }

  caption += `Get this recipe and 200+ more with AI-powered meal tracking.\n\n`
  caption += `#HealthyRecipes #MealPrep #NutritionTracking #HealthyEating #FitnessFood #MacroFriendly`

  return caption
}

/**
 * Generate shareable recipe URL
 */
export const getRecipeShareUrl = (recipeId: string): string => {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return `${baseUrl}/recipes/${recipeId}`
}

/**
 * Download image blob as file
 */
export const downloadImage = (blob: Blob, filename: string) => {
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
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }
  return false
}

/**
 * Share recipe - generates image and caption
 */
export const shareRecipe = async (
  recipe: MealSuggestion,
  aspectRatio: AspectRatio = '1:1',
  templateStyle: TemplateStyle = 'minimalist'
): Promise<{
  imageBlob: Blob
  caption: string
  shareUrl: string
}> => {
  const imageBlob = await generateRecipeShareCard(recipe, aspectRatio, templateStyle)
  const caption = generateRecipeShareCaption(recipe)
  const shareUrl = getRecipeShareUrl(recipe.id)

  return { imageBlob, caption, shareUrl }
}

/**
 * Check if Web Share API is supported
 */
export const canUseWebShare = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator
}

/**
 * Share using Web Share API (mobile)
 * Automatically attaches image to share
 */
export const shareViaWebShareAPI = async (
  recipe: MealSuggestion,
  imageBlob: Blob,
  caption: string,
  shareUrl: string
): Promise<boolean> => {
  if (!canUseWebShare()) {
    return false
  }

  try {
    const file = new File([imageBlob], `${recipe.id}-recipe.png`, { type: 'image/png' })
    const shareData: ShareData = {
      title: recipe.name,
      text: `${caption}\n\nView recipe: ${shareUrl}`,
      files: [file]
    }

    // Check if we can share files
    if (navigator.canShare && !navigator.canShare(shareData)) {
      // Fallback to sharing without file
      await navigator.share({
        title: recipe.name,
        text: `${caption}\n\nView recipe: ${shareUrl}`,
        url: shareUrl
      })
    } else {
      await navigator.share(shareData)
    }

    return true
  } catch (error) {
    // User cancelled or error occurred
    console.error('Web Share API failed:', error)
    return false
  }
}

/**
 * Get platform-specific share URLs
 */
export const getPlatformShareUrl = (
  platform: 'facebook' | 'twitter' | 'pinterest' | 'whatsapp',
  url: string,
  text: string
): string => {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    case 'pinterest':
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    default:
      return ''
  }
}
