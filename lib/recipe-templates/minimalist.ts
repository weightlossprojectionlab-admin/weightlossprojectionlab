// Minimalist Modern Template - Clean and professional design

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
 * Render minimalist template
 */
export const renderMinimalistTemplate = (context: TemplateRenderContext): void => {
  const { ctx, canvas, recipe, width, height } = context

  // Choose gradient based on meal type
  let gradientName: 'soft-blue' | 'soft-green' | 'soft-purple'
  switch (recipe.mealType) {
    case 'breakfast':
      gradientName = 'soft-blue'
      break
    case 'lunch':
      gradientName = 'soft-green'
      break
    case 'dinner':
    case 'snack':
      gradientName = 'soft-purple'
      break
    default:
      gradientName = 'soft-blue'
  }

  // Apply background gradient
  applyGradient(ctx, width, height, gradientName)

  // Main content card with shadow
  const contentY = 60
  const contentHeight = height - 120
  const cardPadding = 40

  withPresetShadow(ctx, 'soft-lg', () => {
    ctx.fillStyle = 'white'
    roundRect(ctx, cardPadding, contentY, width - cardPadding * 2, contentHeight, 24)
    ctx.fill()
  })

  // Recipe name with subtle shadow
  ctx.fillStyle = '#1F2937'
  ctx.font = 'bold 64px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'

  let textY = contentY + 100
  const maxWidth = width - 160
  const titleLines = wrapText(ctx, recipe.name, maxWidth)

  withPresetShadow(ctx, 'text-subtle', () => {
    titleLines.forEach((line, index) => {
      ctx.fillText(line, width / 2, textY + (index * 75))
    })
  })
  clearShadow(ctx)

  textY += titleLines.length * 75 + 40

  // Description
  ctx.fillStyle = '#6B7280'
  ctx.font = '36px system-ui, -apple-system, sans-serif'
  const descLines = wrapText(ctx, recipe.description, maxWidth)
  descLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, textY + (index * 45))
  })
  textY += descLines.length * 45 + 80

  // Nutrition Grid with subtle background
  const gridStartY = textY
  const gridItemWidth = (width - 200) / 3
  const nutritionItems = [
    { label: 'Calories', value: recipe.calories },
    { label: 'Protein', value: `${recipe.macros.protein}g` },
    { label: 'Prep Time', value: `${recipe.prepTime} min` }
  ]

  nutritionItems.forEach((item, index) => {
    const x = 100 + (index * gridItemWidth)

    // Subtle background circle
    ctx.fillStyle = '#F3F4F6'
    ctx.beginPath()
    ctx.arc(x + gridItemWidth / 2, gridStartY + 50, 50, 0, Math.PI * 2)
    ctx.fill()

    // Value
    ctx.fillStyle = '#4F46E5'
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif'
    ctx.fillText(String(item.value), x + gridItemWidth / 2, gridStartY + 80)

    // Label
    ctx.fillStyle = '#6B7280'
    ctx.font = '32px system-ui, -apple-system, sans-serif'
    ctx.fillText(item.label, x + gridItemWidth / 2, gridStartY + 140)
  })

  textY = gridStartY + 200

  // Macros with icons
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#1F2937'
  const macrosText = `C: ${recipe.macros.carbs}g  •  F: ${recipe.macros.fat}g  •  Fiber: ${recipe.macros.fiber}g`
  ctx.fillText(macrosText, width / 2, textY)

  // Dietary tags with colored pills
  if (recipe.dietaryTags.length > 0) {
    textY += 80
    const tags = recipe.dietaryTags.slice(0, 3)
    const tagSpacing = 20
    const tagHeight = 50

    // Calculate total width for centering
    ctx.font = '32px system-ui, -apple-system, sans-serif'
    const tagWidths = tags.map(tag => ctx.measureText(tag).width + 40)
    const totalWidth = tagWidths.reduce((sum, w) => sum + w, 0) + (tags.length - 1) * tagSpacing

    let tagX = (width - totalWidth) / 2

    tags.forEach((tag, index) => {
      const tagWidth = tagWidths[index]

      // Colored pill background
      ctx.fillStyle = '#059669'
      roundRect(ctx, tagX, textY - tagHeight / 2, tagWidth, tagHeight, tagHeight / 2)
      ctx.fill()

      // Tag text
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(tag, tagX + tagWidth / 2, textY)

      tagX += tagWidth + tagSpacing
    })
  }

  // Footer branding with divider
  textY = height - 140

  // Subtle divider line
  ctx.strokeStyle = '#E5E7EB'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(100, textY - 40)
  ctx.lineTo(width - 100, textY - 40)
  ctx.stroke()

  // Brand name
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#4F46E5'
  ctx.fillText('Weight Loss Project Lab', width / 2, textY)

  // Tagline
  textY += 60
  ctx.font = '32px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#6B7280'
  ctx.fillText('Snap. Analyze. Track. All in 30 seconds.', width / 2, textY)

  // Add recommended badge
  const badgeName = getRecommendedBadge(recipe)
  if (badgeName) {
    drawPresetBadge(ctx, width, height, badgeName, 'top-right')
  }
}
