// Shared canvas utility functions to avoid duplication

/**
 * Draw rounded rectangle on canvas
 */
export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
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
 * Returns array of text lines that fit within the specified width
 */
export const wrapText = (
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
 * Template layout constants
 */
export const TEMPLATE_CONSTANTS = {
  // Padding
  CARD_PADDING: 40,
  CONTENT_PADDING: 60,

  // Font Sizes
  TITLE_FONT_SIZE: 64,
  SUBTITLE_FONT_SIZE: 36,
  BODY_FONT_SIZE: 32,
  SMALL_FONT_SIZE: 28,

  // Spacing
  SECTION_SPACING: 80,
  LINE_SPACING: 45,

  // Border Radius
  CARD_RADIUS: 24,
  BUTTON_RADIUS: 12,

  // Colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  PRIMARY: '#4F46E5',
  GRAY_DARK: '#1F2937',
  GRAY_MEDIUM: '#6B7280',
  GRAY_LIGHT: '#E5E7EB'
}
