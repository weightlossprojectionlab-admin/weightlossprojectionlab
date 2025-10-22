// Bold & Vibrant Template - High energy with bold colors

import { TemplateRenderContext } from './index'
import { applyGradient, createGradient } from '../recipe-effects/gradients'
import { withPresetShadow, clearShadow } from '../recipe-effects/shadows'
import { drawPresetBadge, getRecommendedBadge } from '../recipe-effects/badges'

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
 * Wrap text to fit within max width
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const testLine = currentLine + word + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine = testLine
    }
  })
  if (currentLine) {
    lines.push(currentLine.trim())
  }

  return lines
}

/**
 * Draw starburst decoration (for visual interest)
 */
const drawStarburst = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  points: number,
  color: string
) => {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (Math.PI / points) * i
    const pointX = x + Math.cos(angle) * radius
    const pointY = y + Math.sin(angle) * radius
    if (i === 0) {
      ctx.moveTo(pointX, pointY)
    } else {
      ctx.lineTo(pointX, pointY)
    }
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * Render bold vibrant template
 */
export const renderBoldVibrantTemplate = (context: TemplateRenderContext): void => {
  const { ctx, canvas, recipe, width, height } = context

  // Choose vibrant gradient based on meal type
  let gradientName: 'sunset-fire' | 'ocean-blast' | 'neon-lime' | 'pink-burst'
  switch (recipe.mealType) {
    case 'breakfast':
      gradientName = 'sunset-fire'
      break
    case 'lunch':
      gradientName = 'neon-lime'
      break
    case 'dinner':
      gradientName = 'ocean-blast'
      break
    case 'snack':
      gradientName = 'pink-burst'
      break
    default:
      gradientName = 'ocean-blast'
  }

  // Apply vibrant background gradient
  applyGradient(ctx, width, height, gradientName)

  // Add decorative starbursts
  withPresetShadow(ctx, 'colored-purple', () => {
    drawStarburst(ctx, width * 0.15, height * 0.2, 30, 60, 8, 'rgba(255, 255, 255, 0.2)')
    drawStarburst(ctx, width * 0.85, height * 0.7, 25, 50, 8, 'rgba(255, 255, 255, 0.15)')
  })
  clearShadow(ctx)

  // Main content card with strong shadow and tilt effect
  const contentY = 80
  const contentHeight = height - 160
  const cardPadding = 50

  withPresetShadow(ctx, 'strong-lg', () => {
    ctx.fillStyle = 'white'
    roundRect(ctx, cardPadding, contentY, width - cardPadding * 2, contentHeight, 30)
    ctx.fill()
  })

  // Recipe name with bold style and neon glow
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 72px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'

  let textY = contentY + 120
  const maxWidth = width - 180
  const titleLines = wrapText(ctx, recipe.name.toUpperCase(), maxWidth)

  // Draw text with colored shadow for pop effect
  withPresetShadow(ctx, 'text-bold', () => {
    titleLines.forEach((line, index) => {
      ctx.fillText(line, width / 2, textY + (index * 85))
    })
  })
  clearShadow(ctx)

  textY += titleLines.length * 85 + 50

  // Add emoji decoration based on meal type
  let emoji = '✨'
  switch (recipe.mealType) {
    case 'breakfast':
      emoji = '☀️'
      break
    case 'lunch':
      emoji = '🌮'
      break
    case 'dinner':
      emoji = '🍽️'
      break
    case 'snack':
      emoji = '🍪'
      break
  }

  ctx.font = '64px system-ui, -apple-system, sans-serif'
  ctx.fillText(emoji, width / 2, textY)
  textY += 90

  // Description with bold style
  ctx.fillStyle = '#374151'
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
  const descLines = wrapText(ctx, recipe.description, maxWidth)
  descLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, textY + (index * 50))
  })
  textY += descLines.length * 50 + 90

  // Nutrition Grid with vibrant colored backgrounds
  const gridStartY = textY
  const gridItemWidth = (width - 200) / 3
  const nutritionItems = [
    { label: 'Calories', value: recipe.calories, color: '#EF4444' },
    { label: 'Protein', value: `${recipe.macros.protein}g`, color: '#10B981' },
    { label: 'Prep Time', value: `${recipe.prepTime} min`, color: '#F59E0B' }
  ]

  nutritionItems.forEach((item, index) => {
    const x = 100 + (index * gridItemWidth)

    // Colored background with shadow
    withPresetShadow(ctx, 'medium', () => {
      ctx.fillStyle = item.color
      roundRect(
        ctx,
        x + gridItemWidth / 2 - 90,
        gridStartY,
        180,
        180,
        20
      )
      ctx.fill()
    })
    clearShadow(ctx)

    // Value in white
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 80px system-ui, -apple-system, sans-serif'
    ctx.fillText(String(item.value), x + gridItemWidth / 2, gridStartY + 85)

    // Label below colored box
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.fillText(item.label, x + gridItemWidth / 2, gridStartY + 240)
  })

  textY = gridStartY + 300

  // Macros with bold emojis
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#111827'
  const macrosText = `🔥 C: ${recipe.macros.carbs}g  •  🥑 F: ${recipe.macros.fat}g  •  🌾 Fiber: ${recipe.macros.fiber}g`
  ctx.fillText(macrosText, width / 2, textY)

  // Dietary tags with vibrant gradient pills
  if (recipe.dietaryTags.length > 0) {
    textY += 90
    const tags = recipe.dietaryTags.slice(0, 3)
    const tagSpacing = 25
    const tagHeight = 60

    // Calculate total width for centering
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    const tagWidths = tags.map(tag => ctx.measureText(tag.toUpperCase()).width + 50)
    const totalWidth = tagWidths.reduce((sum, w) => sum + w, 0) + (tags.length - 1) * tagSpacing

    let tagX = (width - totalWidth) / 2

    const tagColors = ['#8B5CF6', '#EC4899', '#F59E0B']

    tags.forEach((tag, index) => {
      const tagWidth = tagWidths[index]

      // Colored pill background with shadow
      withPresetShadow(ctx, 'medium', () => {
        ctx.fillStyle = tagColors[index % tagColors.length]
        roundRect(ctx, tagX, textY - tagHeight / 2, tagWidth, tagHeight, tagHeight / 2)
        ctx.fill()
      })
      clearShadow(ctx)

      // Tag text
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(tag.toUpperCase(), tagX + tagWidth / 2, textY)

      tagX += tagWidth + tagSpacing
    })
  }

  // Footer branding with bold gradient
  textY = height - 150

  // Brand name with shadow
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif'
  withPresetShadow(ctx, 'text-bold', () => {
    ctx.fillStyle = '#111827'
    ctx.fillText('WEIGHT LOSS PROJECT LAB', width / 2, textY)
  })
  clearShadow(ctx)

  // Tagline with emojis
  textY += 65
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#374151'
  ctx.fillText('📸 Snap • 🤖 Analyze • 📊 Track • All in 30 sec ⚡', width / 2, textY)

  // Add recommended badge
  const badgeName = getRecommendedBadge(recipe)
  if (badgeName) {
    drawPresetBadge(ctx, width, height, badgeName, 'top-left')
  }
}
