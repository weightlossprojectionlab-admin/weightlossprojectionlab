// Recipe template types and utilities
import { MealSuggestion } from './meal-suggestions'
import { PublicRecipe } from './types/public-recipes'

export type TemplateStyle = 'minimalist' | 'bold' | 'elegant' | 'bold-vibrant' | 'elegant-dark'

export interface TemplateRenderContext {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  recipe: MealSuggestion | PublicRecipe
  width: number
  height: number
  aspectRatio: '1:1' | '9:16' | '3:2'
}

export interface TemplateConfig {
  style: TemplateStyle
  name: string
  description: string
  icon: string
}

export function getAvailableTemplates(): TemplateConfig[] {
  return [
    { style: 'minimalist', name: 'Minimalist', description: 'Clean and simple', icon: '✨' },
    { style: 'bold', name: 'Bold', description: 'Bold and eye-catching', icon: '💪' },
    { style: 'elegant', name: 'Elegant', description: 'Elegant and refined', icon: '👑' },
    { style: 'bold-vibrant', name: 'Bold Vibrant', description: 'Vibrant and energetic', icon: '🔥' },
    { style: 'elegant-dark', name: 'Elegant Dark', description: 'Dark and sophisticated', icon: '🌙' }
  ]
}

export function getTemplateConfig(style: TemplateStyle): TemplateConfig | undefined {
  return getAvailableTemplates().find(t => t.style === style)
}

export function renderTemplate(style: TemplateStyle, context: TemplateRenderContext): void {
  const { ctx, recipe, width, height } = context

  // Background
  ctx.fillStyle = style === 'elegant-dark' ? '#1a1a1a' : '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Title
  ctx.fillStyle = style === 'elegant-dark' ? '#ffffff' : '#000000'
  ctx.font = 'bold 48px Arial'
  ctx.fillText(recipe.name, 40, 100)

  // Calories
  ctx.font = '32px Arial'
  ctx.fillText(`${recipe.calories} cal`, 40, 160)
}
