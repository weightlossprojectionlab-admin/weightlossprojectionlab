// Shadow effects for depth and visual hierarchy

export interface ShadowConfig {
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

/**
 * Apply shadow to canvas context
 */
export const applyShadow = (
  ctx: CanvasRenderingContext2D,
  config: ShadowConfig
): void => {
  ctx.shadowOffsetX = config.offsetX
  ctx.shadowOffsetY = config.offsetY
  ctx.shadowBlur = config.blur
  ctx.shadowColor = config.color
}

/**
 * Clear shadow from canvas context
 */
export const clearShadow = (ctx: CanvasRenderingContext2D): void => {
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}

/**
 * Execute drawing with shadow, then clear shadow
 */
export const withShadow = (
  ctx: CanvasRenderingContext2D,
  config: ShadowConfig,
  draw: () => void
): void => {
  applyShadow(ctx, config)
  draw()
  clearShadow(ctx)
}

// Preset shadow styles
export const PRESET_SHADOWS = {
  // Subtle shadows for minimalist design
  'soft': {
    offsetX: 0,
    offsetY: 4,
    blur: 12,
    color: 'rgba(0, 0, 0, 0.08)'
  },
  'soft-lg': {
    offsetX: 0,
    offsetY: 8,
    blur: 24,
    color: 'rgba(0, 0, 0, 0.1)'
  },

  // Medium shadows for cards and elements
  'medium': {
    offsetX: 0,
    offsetY: 6,
    blur: 20,
    color: 'rgba(0, 0, 0, 0.15)'
  },
  'medium-lg': {
    offsetX: 0,
    offsetY: 12,
    blur: 32,
    color: 'rgba(0, 0, 0, 0.18)'
  },

  // Strong shadows for bold designs
  'strong': {
    offsetX: 0,
    offsetY: 10,
    blur: 30,
    color: 'rgba(0, 0, 0, 0.25)'
  },
  'strong-lg': {
    offsetX: 0,
    offsetY: 20,
    blur: 50,
    color: 'rgba(0, 0, 0, 0.3)'
  },

  // Colored shadows for vibrant designs
  'colored-purple': {
    offsetX: 0,
    offsetY: 8,
    blur: 24,
    color: 'rgba(139, 92, 246, 0.4)'
  },
  'colored-blue': {
    offsetX: 0,
    offsetY: 8,
    blur: 24,
    color: 'rgba(59, 130, 246, 0.4)'
  },
  'colored-pink': {
    offsetX: 0,
    offsetY: 8,
    blur: 24,
    color: 'rgba(236, 72, 153, 0.4)'
  },
  'colored-green': {
    offsetX: 0,
    offsetY: 8,
    blur: 24,
    color: 'rgba(34, 197, 94, 0.4)'
  },

  // Inner glow effect (negative offset for top lighting)
  'inner-glow': {
    offsetX: 0,
    offsetY: -2,
    blur: 8,
    color: 'rgba(255, 255, 255, 0.5)'
  },

  // Text shadows
  'text-subtle': {
    offsetX: 0,
    offsetY: 2,
    blur: 4,
    color: 'rgba(0, 0, 0, 0.1)'
  },
  'text-bold': {
    offsetX: 2,
    offsetY: 2,
    blur: 4,
    color: 'rgba(0, 0, 0, 0.3)'
  },
  'text-neon': {
    offsetX: 0,
    offsetY: 0,
    blur: 20,
    color: 'rgba(255, 255, 255, 0.8)'
  }
}

/**
 * Apply preset shadow
 */
export const applyPresetShadow = (
  ctx: CanvasRenderingContext2D,
  presetName: keyof typeof PRESET_SHADOWS
): void => {
  applyShadow(ctx, PRESET_SHADOWS[presetName])
}

/**
 * Execute drawing with preset shadow
 */
export const withPresetShadow = (
  ctx: CanvasRenderingContext2D,
  presetName: keyof typeof PRESET_SHADOWS,
  draw: () => void
): void => {
  withShadow(ctx, PRESET_SHADOWS[presetName], draw)
}
