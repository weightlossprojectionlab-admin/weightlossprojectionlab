// Elegant Dark Template - Premium luxury theme

import { TemplateRenderContext } from './index'
import { applyGradient, createGradient } from '../recipe-effects/gradients'
import { withPresetShadow, clearShadow, applyShadow } from '../recipe-effects/shadows'
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
 * Draw decorative line with gradient
 */
const drawDecorativeLine = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color1: string,
  color2: string
) => {
  const gradient = ctx.createLinearGradient(x1, y, x2, y)
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(0.5, color1)
  gradient.addColorStop(1, 'transparent')

  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
}

/**
 * Render elegant dark template
 */
export const renderElegantDarkTemplate = (context: TemplateRenderContext): void => {
  const { ctx, canvas, recipe, width, height } = context

  // Choose dark gradient
  let gradientName: 'midnight-gold' | 'royal-purple' | 'dark-emerald'
  switch (recipe.mealType) {
    case 'breakfast':
      gradientName = 'midnight-gold'
      break
    case 'lunch':
      gradientName = 'dark-emerald'
      break
    case 'dinner':
    case 'snack':
      gradientName = 'royal-purple'
      break
    default:
      gradientName = 'midnight-gold'
  }

  // Apply dark background gradient
  applyGradient(ctx, width, height, gradientName)

  // Add subtle noise texture overlay (for premium feel)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = Math.random() * 2
    ctx.fillRect(x, y, size, size)
  }

  // Main content card with dark glass effect
  const contentY = 70
  const contentHeight = height - 140
  const cardPadding = 45

  // Outer glow effect
  applyShadow(ctx, {
    offsetX: 0,
    offsetY: 0,
    blur: 40,
    color: 'rgba(255, 215, 0, 0.3)'
  })
  ctx.fillStyle = 'rgba(30, 30, 40, 0.85)'
  roundRect(ctx, cardPadding, contentY, width - cardPadding * 2, contentHeight, 28)
  ctx.fill()
  clearShadow(ctx)

  // Inner border with gradient
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'
  ctx.lineWidth = 3
  roundRect(ctx, cardPadding + 3, contentY + 3, width - cardPadding * 2 - 6, contentHeight - 6, 25)
  ctx.stroke()

  // Recipe name with elegant serif-like bold font and gold accent
  ctx.fillStyle = '#F9FAFB'
  ctx.font = 'bold 68px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'

  let textY = contentY + 110
  const maxWidth = width - 160
  const titleLines = wrapText(ctx, recipe.name, maxWidth)

  // Gold underline accent
  const firstLineWidth = ctx.measureText(titleLines[0]).width
  drawDecorativeLine(
    ctx,
    width / 2 - firstLineWidth / 2 - 50,
    textY + 80,
    width / 2 + firstLineWidth / 2 + 50,
    '#FFD700',
    '#FFA500'
  )

  // Draw title with subtle glow
  applyShadow(ctx, {
    offsetX: 0,
    offsetY: 0,
    blur: 15,
    color: 'rgba(255, 215, 0, 0.4)'
  })
  titleLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, textY + (index * 80))
  })
  clearShadow(ctx)

  textY += titleLines.length * 80 + 100

  // Description with refined typography
  ctx.fillStyle = '#D1D5DB'
  ctx.font = '36px system-ui, -apple-system, sans-serif'
  const descLines = wrapText(ctx, recipe.description, maxWidth)
  descLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, textY + (index * 48))
  })
  textY += descLines.length * 48 + 100

  // Nutrition Grid with elegant dark cards
  const gridStartY = textY
  const gridItemWidth = (width - 200) / 3
  const nutritionItems = [
    { label: 'Calories', value: recipe.calories, accent: '#FFD700' },
    { label: 'Protein', value: `${recipe.macros.protein}g`, accent: '#C0A080' },
    { label: 'Prep Time', value: `${recipe.prepTime} min`, accent: '#B8860B' }
  ]

  nutritionItems.forEach((item, index) => {
    const x = 100 + (index * gridItemWidth)
    const boxSize = 160

    // Dark card with gradient border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    roundRect(
      ctx,
      x + gridItemWidth / 2 - boxSize / 2,
      gridStartY,
      boxSize,
      boxSize,
      15
    )
    ctx.fill()

    // Accent border
    ctx.strokeStyle = item.accent
    ctx.lineWidth = 2
    roundRect(
      ctx,
      x + gridItemWidth / 2 - boxSize / 2,
      gridStartY,
      boxSize,
      boxSize,
      15
    )
    ctx.stroke()

    // Value with accent color and glow
    applyShadow(ctx, {
      offsetX: 0,
      offsetY: 0,
      blur: 10,
      color: item.accent
    })
    ctx.fillStyle = item.accent
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif'
    ctx.fillText(String(item.value), x + gridItemWidth / 2, gridStartY + 90)
    clearShadow(ctx)

    // Label below
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '30px system-ui, -apple-system, sans-serif'
    ctx.fillText(item.label, x + gridItemWidth / 2, gridStartY + 210)
  })

  textY = gridStartY + 270

  // Macros with elegant styling
  ctx.font = '42px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#E5E7EB'
  const macrosText = `Carbs: ${recipe.macros.carbs}g  •  Fat: ${recipe.macros.fat}g  •  Fiber: ${recipe.macros.fiber}g`
  ctx.fillText(macrosText, width / 2, textY)

  // Dietary tags with dark elegant pills
  if (recipe.dietaryTags.length > 0) {
    textY += 85
    const tags = recipe.dietaryTags.slice(0, 3)
    const tagSpacing = 20
    const tagHeight = 52

    // Calculate total width for centering
    ctx.font = '32px system-ui, -apple-system, sans-serif'
    const tagWidths = tags.map(tag => ctx.measureText(tag).width + 45)
    const totalWidth = tagWidths.reduce((sum, w) => sum + w, 0) + (tags.length - 1) * tagSpacing

    let tagX = (width - totalWidth) / 2

    tags.forEach((tag, index) => {
      const tagWidth = tagWidths[index]

      // Dark pill with gold border
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      roundRect(ctx, tagX, textY - tagHeight / 2, tagWidth, tagHeight, tagHeight / 2)
      ctx.fill()

      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      roundRect(ctx, tagX, textY - tagHeight / 2, tagWidth, tagHeight, tagHeight / 2)
      ctx.stroke()

      // Tag text in gold
      ctx.fillStyle = '#FFD700'
      ctx.fillText(tag, tagX + tagWidth / 2, textY)

      tagX += tagWidth + tagSpacing
    })
  }

  // Footer branding with gold accents
  textY = height - 140

  // Decorative line
  drawDecorativeLine(ctx, 100, textY - 50, width - 100, '#FFD700', '#FFA500')

  // Brand name in gold
  ctx.font = 'bold 50px system-ui, -apple-system, sans-serif'
  applyShadow(ctx, {
    offsetX: 0,
    offsetY: 0,
    blur: 15,
    color: 'rgba(255, 215, 0, 0.5)'
  })
  ctx.fillStyle = '#FFD700'
  ctx.fillText('Weight Loss Project Lab', width / 2, textY)
  clearShadow(ctx)

  // Tagline
  textY += 60
  ctx.font = '32px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#9CA3AF'
  ctx.fillText('Premium AI-Powered Nutrition Tracking', width / 2, textY)

  // Add recommended badge (customized for dark theme)
  const badgeName = getRecommendedBadge(recipe)
  if (badgeName) {
    drawPresetBadge(ctx, width, height, badgeName, 'top-right')
  }
}
