/**
 * Recipe Import Module
 *
 * Imports recipes from URLs by:
 * 1. Parsing Schema.org Recipe structured data (JSON-LD)
 * 2. Fallback to AI extraction using Gemini
 * 3. Calculate nutrition using AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { MealSuggestion, MealType, DietaryTag } from './meal-suggestions'

export interface SchemaOrgRecipe {
  '@type': 'Recipe'
  name: string
  author?: {
    '@type': 'Person' | 'Organization'
    name: string
  } | string
  description?: string
  image?: string | string[] | { url: string }[]
  datePublished?: string
  prepTime?: string // ISO 8601 duration (e.g., "PT30M")
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number // Servings
  recipeCategory?: string
  recipeCuisine?: string
  recipeIngredient?: string[]
  recipeInstructions?: string | { text: string }[] | { '@type': 'HowToStep', text: string }[]
  nutrition?: {
    '@type': 'NutritionInformation'
    calories?: string
    proteinContent?: string
    carbohydrateContent?: string
    fatContent?: string
    fiberContent?: string
  }
  keywords?: string
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: number
    ratingCount: number
  }
  suitableForDiet?: string[]
}

export interface ImportedRecipe {
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  imageUrl?: string
  prepTime?: number // minutes
  cookTime?: number // minutes
  totalTime?: number // minutes
  servings?: number
  cuisine?: string
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  dietaryTags?: DietaryTag[]
  sourceUrl: string
  author?: string
  rating?: number
  ratingCount?: number
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

/**
 * Parse ISO 8601 duration to minutes
 * Example: "PT30M" -> 30, "PT1H30M" -> 90
 */
function parseDuration(isoDuration: string): number {
  const hourMatch = isoDuration.match(/(\d+)H/)
  const minuteMatch = isoDuration.match(/(\d+)M/)

  const hours = hourMatch ? parseInt(hourMatch[1]) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0

  return hours * 60 + minutes
}

/**
 * Extract first image URL from Schema.org image field
 */
function extractImageUrl(image: string | string[] | { url: string }[] | undefined): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    const first = image[0]
    if (typeof first === 'string') return first
    if (typeof first === 'object' && 'url' in first) return first.url
  }
  return undefined
}

/**
 * Extract instructions from Schema.org recipeInstructions field
 */
function extractInstructions(instructions: string | { text: string }[] | { '@type': 'HowToStep', text: string }[] | undefined): string[] {
  if (!instructions) return []

  if (typeof instructions === 'string') {
    // Split by newlines or numbered steps
    return instructions
      .split(/\n+|(?=\d+\.)/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  if (Array.isArray(instructions)) {
    return instructions.map(step => {
      if (typeof step === 'string') return step
      if (typeof step === 'object' && 'text' in step) return step.text
      return ''
    }).filter(s => s.length > 0)
  }

  return []
}

/**
 * Map Schema.org suitableForDiet to our DietaryTag
 */
function mapDietaryTags(suitableForDiet: string[] | undefined, keywords: string | undefined): DietaryTag[] {
  const tags: DietaryTag[] = []
  const allText = [...(suitableForDiet || []), keywords || ''].join(' ').toLowerCase()

  if (allText.includes('vegan')) tags.push('vegan')
  if (allText.includes('vegetarian')) tags.push('vegetarian')
  if (allText.includes('keto') || allText.includes('ketogenic')) tags.push('keto')
  if (allText.includes('paleo')) tags.push('paleo')
  if (allText.includes('gluten-free') || allText.includes('glutenfree')) tags.push('gluten-free')
  if (allText.includes('dairy-free') || allText.includes('dairyfree')) tags.push('dairy-free')
  if (allText.includes('high-protein') || allText.includes('high protein')) tags.push('high-protein')
  if (allText.includes('low-carb') || allText.includes('low carb')) tags.push('low-carb')

  return tags
}

/**
 * Extract nutrition value from Schema.org nutrition field
 * Example: "250 calories" -> 250, "20g" -> 20
 */
function parseNutritionValue(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = value.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : undefined
}

/**
 * Fetch and parse recipe from URL
 *
 * Strategy:
 * 1. Fetch HTML content from URL
 * 2. Extract Schema.org Recipe JSON-LD
 * 3. If not found, use Gemini AI to extract recipe
 * 4. Calculate nutrition if missing
 */
export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  try {
    // Fetch HTML content
    const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()

    // Try to parse Schema.org Recipe JSON-LD
    const schemaRecipe = parseSchemaOrgRecipe(html)

    if (schemaRecipe) {
      console.log('✅ Found Schema.org Recipe data')
      return convertSchemaToImportedRecipe(schemaRecipe, url)
    }

    console.log('⚠️ No Schema.org Recipe found, using AI extraction')

    // Fallback to AI extraction
    return await extractRecipeWithAI(html, url)
  } catch (error) {
    console.error('Error importing recipe:', error)
    throw error
  }
}

/**
 * Parse Schema.org Recipe JSON-LD from HTML
 */
function parseSchemaOrgRecipe(html: string): SchemaOrgRecipe | null {
  try {
    // Find all JSON-LD script tags
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    const matches = Array.from(html.matchAll(jsonLdRegex))

    for (const match of matches) {
      try {
        const jsonData = JSON.parse(match[1])

        // Handle both single object and array of objects
        const objects = Array.isArray(jsonData) ? jsonData : [jsonData]

        for (const obj of objects) {
          // Check if this is a Recipe
          if (obj['@type'] === 'Recipe') {
            return obj as SchemaOrgRecipe
          }

          // Check nested @graph (some sites use this)
          if (obj['@graph']) {
            const recipe = obj['@graph'].find((item: any) => item['@type'] === 'Recipe')
            if (recipe) return recipe as SchemaOrgRecipe
          }
        }
      } catch (parseError) {
        // Skip invalid JSON
        continue
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing Schema.org Recipe:', error)
    return null
  }
}

/**
 * Convert Schema.org Recipe to ImportedRecipe format
 */
function convertSchemaToImportedRecipe(schema: SchemaOrgRecipe, sourceUrl: string): ImportedRecipe {
  const author = typeof schema.author === 'string' ? schema.author : schema.author?.name

  return {
    name: schema.name,
    description: schema.description || '',
    ingredients: schema.recipeIngredient || [],
    instructions: extractInstructions(schema.recipeInstructions),
    imageUrl: extractImageUrl(schema.image),
    prepTime: schema.prepTime ? parseDuration(schema.prepTime) : undefined,
    cookTime: schema.cookTime ? parseDuration(schema.cookTime) : undefined,
    totalTime: schema.totalTime ? parseDuration(schema.totalTime) : undefined,
    servings: typeof schema.recipeYield === 'number' ? schema.recipeYield : parseInt(String(schema.recipeYield || '4')),
    cuisine: schema.recipeCuisine,
    category: schema.recipeCategory,
    calories: parseNutritionValue(schema.nutrition?.calories),
    protein: parseNutritionValue(schema.nutrition?.proteinContent),
    carbs: parseNutritionValue(schema.nutrition?.carbohydrateContent),
    fat: parseNutritionValue(schema.nutrition?.fatContent),
    fiber: parseNutritionValue(schema.nutrition?.fiberContent),
    dietaryTags: mapDietaryTags(schema.suitableForDiet, schema.keywords),
    sourceUrl,
    author,
    rating: schema.aggregateRating?.ratingValue,
    ratingCount: schema.aggregateRating?.ratingCount
  }
}

/**
 * Extract recipe using Gemini AI as fallback
 */
async function extractRecipeWithAI(html: string, sourceUrl: string): Promise<ImportedRecipe> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `Extract the recipe from this HTML page. Return a JSON object with:
{
  "name": "Recipe title",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": minutes (number),
  "cookTime": minutes (number),
  "servings": number,
  "cuisine": "cuisine type",
  "category": "category (breakfast/lunch/dinner/snack/dessert)"
}

HTML (truncated to first 50KB):
${html.slice(0, 50000)}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response')
  }

  const extracted = JSON.parse(jsonMatch[1] || jsonMatch[0])

  return {
    ...extracted,
    sourceUrl,
    dietaryTags: mapDietaryTags([], extracted.keywords || '')
  }
}

/**
 * Calculate nutrition for a recipe using Gemini AI
 */
export async function calculateRecipeNutrition(recipe: ImportedRecipe): Promise<{
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `Calculate the total nutrition for this recipe (for all servings combined). Return JSON:
{
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams)
}

Recipe: ${recipe.name}
Servings: ${recipe.servings || 4}

Ingredients:
${recipe.ingredients.join('\n')}

Instructions:
${recipe.instructions.join('\n')}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response')
  }

  return JSON.parse(jsonMatch[1] || jsonMatch[0])
}
