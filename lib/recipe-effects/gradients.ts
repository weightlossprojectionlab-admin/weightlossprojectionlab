// Gradient effects for recipe share cards

export type GradientType = 'linear' | 'radial' | 'conic'

export interface GradientStop {
  offset: number // 0-1
  color: string
}

export interface LinearGradientConfig {
  type: 'linear'
  x0: number
  y0: number
  x1: number
  y1: number
  stops: GradientStop[]
}

export interface RadialGradientConfig {
  type: 'radial'
  x0: number
  y0: number
  r0: number
  x1: number
  y1: number
  r1: number
  stops: GradientStop[]
}

export interface ConicGradientConfig {
  type: 'conic'
  startAngle: number
  x: number
  y: number
  stops: GradientStop[]
}

export type GradientConfig = LinearGradientConfig | RadialGradientConfig | ConicGradientConfig

/**
 * Create a gradient from config
 */
export const createGradient = (
  ctx: CanvasRenderingContext2D,
  config: GradientConfig
): CanvasGradient => {
  let gradient: CanvasGradient

  switch (config.type) {
    case 'linear':
      gradient = ctx.createLinearGradient(config.x0, config.y0, config.x1, config.y1)
      break
    case 'radial':
      gradient = ctx.createRadialGradient(config.x0, config.y0, config.r0, config.x1, config.y1, config.r1)
      break
    case 'conic':
      gradient = ctx.createConicGradient(config.startAngle, config.x, config.y)
      break
  }

  config.stops.forEach(stop => {
    gradient.addColorStop(stop.offset, stop.color)
  })

  return gradient
}

// Preset Gradients

export const PRESET_GRADIENTS = {
  // Minimalist gradients (subtle, professional)
  'soft-blue': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: height,
    stops: [
      { offset: 0, color: '#EBF4FF' },
      { offset: 1, color: '#C3DAFE' }
    ]
  }),
  'soft-green': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: height,
    stops: [
      { offset: 0, color: '#F0FDF4' },
      { offset: 1, color: '#BBF7D0' }
    ]
  }),
  'soft-purple': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: height,
    stops: [
      { offset: 0, color: '#FAF5FF' },
      { offset: 1, color: '#E9D5FF' }
    ]
  }),

  // Bold vibrant gradients (high energy)
  'sunset-fire': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
    stops: [
      { offset: 0, color: '#FA709A' },
      { offset: 0.5, color: '#FEE140' },
      { offset: 1, color: '#FF6B6B' }
    ]
  }),
  'ocean-blast': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
    stops: [
      { offset: 0, color: '#667EEA' },
      { offset: 0.5, color: '#64B6FF' },
      { offset: 1, color: '#4F46E5' }
    ]
  }),
  'neon-lime': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
    stops: [
      { offset: 0, color: '#A8EB12' },
      { offset: 1, color: '#06D6A0' }
    ]
  }),
  'pink-burst': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
    stops: [
      { offset: 0, color: '#FF0080' },
      { offset: 0.5, color: '#FF6B9D' },
      { offset: 1, color: '#C250D4' }
    ]
  }),

  // Elegant dark gradients (premium, luxury)
  'midnight-gold': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: height,
    stops: [
      { offset: 0, color: '#1A1A2E' },
      { offset: 0.5, color: '#16213E' },
      { offset: 1, color: '#0F3460' }
    ]
  }),
  'royal-purple': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: height,
    stops: [
      { offset: 0, color: '#1F1C2C' },
      { offset: 1, color: '#928DAB' }
    ]
  }),
  'dark-emerald': (width: number, height: number): LinearGradientConfig => ({
    type: 'linear',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: height,
    stops: [
      { offset: 0, color: '#134E4A' },
      { offset: 1, color: '#064E3B' }
    ]
  }),

  // Radial gradients (spotlight effect)
  'radial-spotlight': (width: number, height: number): RadialGradientConfig => ({
    type: 'radial',
    x0: width / 2,
    y0: height / 2,
    r0: 0,
    x1: width / 2,
    y1: height / 2,
    r1: Math.max(width, height) * 0.7,
    stops: [
      { offset: 0, color: '#FFFFFF' },
      { offset: 1, color: '#E5E7EB' }
    ]
  }),

  // Conic gradients (rainbow effect)
  'rainbow-spin': (width: number, height: number): ConicGradientConfig => ({
    type: 'conic',
    startAngle: 0,
    x: width / 2,
    y: height / 2,
    stops: [
      { offset: 0, color: '#FF0080' },
      { offset: 0.2, color: '#FF6B00' },
      { offset: 0.4, color: '#FFD600' },
      { offset: 0.6, color: '#00FF9D' },
      { offset: 0.8, color: '#0080FF' },
      { offset: 1, color: '#FF0080' }
    ]
  })
}

/**
 * Apply gradient to canvas
 */
export const applyGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gradientName: keyof typeof PRESET_GRADIENTS
): void => {
  const gradientConfig = PRESET_GRADIENTS[gradientName](width, height)
  const gradient = createGradient(ctx, gradientConfig)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}
