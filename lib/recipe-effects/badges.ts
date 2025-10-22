// Badge overlays for visual interest and social proof

export type BadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type BadgeStyle = 'pill' | 'rounded-square' | 'circle' | 'ribbon'

export interface BadgeConfig {
  text: string
  emoji?: string
  position: BadgePosition
  style: BadgeStyle
  backgroundColor: string
  textColor: string
  fontSize?: number
  padding?: number
}

/**
 * Helper to draw rounded rectangle
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
 * Calculate badge position coordinates
 */
const getBadgeCoordinates = (
  position: BadgePosition,
  canvasWidth: number,
  canvasHeight: number,
  badgeWidth: number,
  badgeHeight: number,
  margin: number = 40
): { x: number; y: number } => {
  switch (position) {
    case 'top-left':
      return { x: margin, y: margin }
    case 'top-right':
      return { x: canvasWidth - badgeWidth - margin, y: margin }
    case 'bottom-left':
      return { x: margin, y: canvasHeight - badgeHeight - margin }
    case 'bottom-right':
      return { x: canvasWidth - badgeWidth - margin, y: canvasHeight - badgeHeight - margin }
  }
}

/**
 * Draw badge on canvas
 */
export const drawBadge = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: BadgeConfig
): void => {
  const fontSize = config.fontSize || 32
  const padding = config.padding || 20

  // Measure text
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  const fullText = config.emoji ? `${config.emoji} ${config.text}` : config.text
  const textMetrics = ctx.measureText(fullText)
  const textWidth = textMetrics.width

  // Calculate badge dimensions
  let badgeWidth: number
  let badgeHeight: number

  if (config.style === 'circle') {
    const diameter = Math.max(textWidth, fontSize) + padding * 2
    badgeWidth = diameter
    badgeHeight = diameter
  } else {
    badgeWidth = textWidth + padding * 2
    badgeHeight = fontSize + padding * 1.5
  }

  // Get position
  const coords = getBadgeCoordinates(
    config.position,
    canvasWidth,
    canvasHeight,
    badgeWidth,
    badgeHeight
  )

  // Draw badge background
  ctx.fillStyle = config.backgroundColor

  switch (config.style) {
    case 'pill':
      roundRect(ctx, coords.x, coords.y, badgeWidth, badgeHeight, badgeHeight / 2)
      ctx.fill()
      break

    case 'rounded-square':
      roundRect(ctx, coords.x, coords.y, badgeWidth, badgeHeight, 12)
      ctx.fill()
      break

    case 'circle':
      ctx.beginPath()
      ctx.arc(
        coords.x + badgeWidth / 2,
        coords.y + badgeHeight / 2,
        badgeWidth / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      break

    case 'ribbon':
      // Ribbon with angled edges
      ctx.beginPath()
      ctx.moveTo(coords.x + 10, coords.y)
      ctx.lineTo(coords.x + badgeWidth - 10, coords.y)
      ctx.lineTo(coords.x + badgeWidth, coords.y + badgeHeight / 2)
      ctx.lineTo(coords.x + badgeWidth - 10, coords.y + badgeHeight)
      ctx.lineTo(coords.x + 10, coords.y + badgeHeight)
      ctx.lineTo(coords.x, coords.y + badgeHeight / 2)
      ctx.closePath()
      ctx.fill()
      break
  }

  // Draw text
  ctx.fillStyle = config.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    fullText,
    coords.x + badgeWidth / 2,
    coords.y + badgeHeight / 2
  )
}

// Preset badge configurations
export const PRESET_BADGES = {
  'trending': {
    text: 'Trending',
    emoji: '🔥',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#EF4444',
    textColor: '#FFFFFF'
  },
  'high-protein': {
    text: 'High Protein',
    emoji: '💪',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#10B981',
    textColor: '#FFFFFF'
  },
  'quick-prep': {
    text: 'Quick Prep',
    emoji: '⚡',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#F59E0B',
    textColor: '#FFFFFF'
  },
  'vegan': {
    text: 'Vegan',
    emoji: '🌱',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#10B981',
    textColor: '#FFFFFF'
  },
  'keto': {
    text: 'Keto',
    emoji: '🥑',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#8B5CF6',
    textColor: '#FFFFFF'
  },
  'low-calorie': {
    text: 'Low Cal',
    emoji: '✨',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#06B6D4',
    textColor: '#FFFFFF'
  },
  'new': {
    text: 'NEW',
    emoji: '✨',
    style: 'rounded-square' as BadgeStyle,
    backgroundColor: '#EC4899',
    textColor: '#FFFFFF'
  },
  'popular': {
    text: 'Popular',
    emoji: '⭐',
    style: 'pill' as BadgeStyle,
    backgroundColor: '#6366F1',
    textColor: '#FFFFFF'
  }
}

/**
 * Draw preset badge
 */
export const drawPresetBadge = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  badgeName: keyof typeof PRESET_BADGES,
  position: BadgePosition
): void => {
  const preset = PRESET_BADGES[badgeName]
  drawBadge(ctx, canvasWidth, canvasHeight, {
    ...preset,
    position
  })
}

/**
 * Auto-select badge based on recipe properties
 */
export const getRecommendedBadge = (
  recipe: {
    prepTime: number
    macros: { protein: number }
    calories: number
    dietaryTags: string[]
  }
): keyof typeof PRESET_BADGES | null => {
  // Quick prep (< 15 min)
  if (recipe.prepTime < 15) {
    return 'quick-prep'
  }

  // High protein (> 30g)
  if (recipe.macros.protein > 30) {
    return 'high-protein'
  }

  // Low calorie (< 300)
  if (recipe.calories < 300) {
    return 'low-calorie'
  }

  // Vegan
  if (recipe.dietaryTags.includes('vegan')) {
    return 'vegan'
  }

  // Keto
  if (recipe.dietaryTags.includes('keto')) {
    return 'keto'
  }

  // Default to popular
  return 'popular'
}
