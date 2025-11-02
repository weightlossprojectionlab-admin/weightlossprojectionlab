// Recipe Template System - Marketing-Grade Share Images
import { MealSuggestion } from '../meal-suggestions'
import { PublicRecipe } from '../types/public-recipes'
import { AspectRatio } from '../recipe-share-utils'
import { logger } from '@/lib/logger'

export type TemplateStyle = 'minimalist' | 'bold-vibrant' | 'elegant-dark' | 'photo-overlay' | 'infographic'

export interface TemplateConfig {
  style: TemplateStyle
  name: string
  description: string
  icon: string
  recommendedFor: string[]
  preview?: string
}

export interface TemplateRenderContext {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  recipe: MealSuggestion | PublicRecipe
  width: number
  height: number
  aspectRatio: AspectRatio
}

export type TemplateRenderer = (context: TemplateRenderContext) => void

// Template Registry
export const TEMPLATE_CONFIGS: Record<TemplateStyle, TemplateConfig> = {
  'minimalist': {
    style: 'minimalist',
    name: 'Minimalist Modern',
    description: 'Clean and professional design',
    icon: '✨',
    recommendedFor: ['professional', 'clean', 'simple recipes']
  },
  'bold-vibrant': {
    style: 'bold-vibrant',
    name: 'Bold & Vibrant',
    description: 'High energy with bold colors',
    icon: '🔥',
    recommendedFor: ['trending', 'viral', 'Gen Z audience']
  },
  'elegant-dark': {
    style: 'elegant-dark',
    name: 'Elegant Dark',
    description: 'Premium luxury theme',
    icon: '💎',
    recommendedFor: ['premium', 'sophisticated', 'evening meals']
  },
  'photo-overlay': {
    style: 'photo-overlay',
    name: 'Photo Overlay',
    description: 'Real food photography background',
    icon: '📸',
    recommendedFor: ['authentic', 'appetizing', 'high engagement']
  },
  'infographic': {
    style: 'infographic',
    name: 'Infographic',
    description: 'Data visualization style',
    icon: '📊',
    recommendedFor: ['educational', 'nutrition focused', 'detailed']
  }
}

// Template renderer functions
import { renderMinimalistTemplate } from './minimalist'
import { renderBoldVibrantTemplate } from './bold-vibrant'
import { renderElegantDarkTemplate } from './elegant-dark'

export { renderMinimalistTemplate, renderBoldVibrantTemplate, renderElegantDarkTemplate }

// Main template render function with error handling
export const renderTemplate = (
  style: TemplateStyle,
  context: TemplateRenderContext
): void => {
  try {
    switch (style) {
      case 'minimalist':
        renderMinimalistTemplate(context)
        break
      case 'bold-vibrant':
        renderBoldVibrantTemplate(context)
        break
      case 'elegant-dark':
        renderElegantDarkTemplate(context)
        break
      case 'photo-overlay':
        // Phase 2 - requires Unsplash API
        throw new Error('Photo overlay template not yet implemented. Please choose another template.')
      case 'infographic':
        // Phase 2 - advanced data visualization
        throw new Error('Infographic template not yet implemented. Please choose another template.')
      default:
        throw new Error(`Unknown template style: ${style}. Falling back to minimalist.`)
    }
  } catch (error) {
    // Fallback to minimalist template on any error
    logger.error('Template rendering error', error as Error)
    if (style !== 'minimalist') {
      logger.warn('Falling back to minimalist template')
      renderMinimalistTemplate(context)
    } else {
      // Re-throw if minimalist itself failed
      throw error
    }
  }
}

// Get all available templates
export const getAvailableTemplates = (): TemplateConfig[] => {
  // For Phase 1, only return implemented templates
  return [
    TEMPLATE_CONFIGS['minimalist'],
    TEMPLATE_CONFIGS['bold-vibrant'],
    TEMPLATE_CONFIGS['elegant-dark']
  ]
}

// Get template config by style
export const getTemplateConfig = (style: TemplateStyle): TemplateConfig => {
  return TEMPLATE_CONFIGS[style]
}
