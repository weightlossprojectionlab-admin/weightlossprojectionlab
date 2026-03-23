import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DietaryTag } from '@/lib/meal-suggestions'

export const maxDuration = 60 // Recipe imports can take time

interface ImportedRecipe {
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  imageUrl?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
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
}

interface SchemaOrgRecipe {
  '@type': 'Recipe'
  name: string
  author?: { name: string } | string
  description?: string
  image?: string | string[] | { url: string }[]
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number
  recipeCategory?: string
  recipeCuisine?: string
  recipeIngredient?: string[]
  recipeInstructions?: string | { text: string }[] | { '@type': 'HowToStep'; text: string }[]
  nutrition?: {
    calories?: string
    proteinContent?: string
    carbohydrateContent?: string
    fatContent?: string
    fiberContent?: string
  }
  keywords?: string
  suitableForDiet?: string[]
}

function parseDuration(isoDuration: string): number {
  const hourMatch = isoDuration.match(/(\d+)H/)
  const minuteMatch = isoDuration.match(/(\d+)M/)
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
  return hours * 60 + minutes
}

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

function extractInstructions(instructions: string | { text: string }[] | { '@type': 'HowToStep'; text: string }[] | undefined): string[] {
  if (!instructions) return []
  if (typeof instructions === 'string') {
    return instructions.split(/\n+|(?=\d+\.)/).map(s => s.trim()).filter(s => s.length > 0)
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

function parseNutritionValue(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = value.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : undefined
}

function parseSchemaOrgRecipe(html: string): SchemaOrgRecipe | null {
  try {
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    const matches = Array.from(html.matchAll(jsonLdRegex))
    for (const match of matches) {
      try {
        const jsonData = JSON.parse(match[1])
        const objects = Array.isArray(jsonData) ? jsonData : [jsonData]
        for (const obj of objects) {
          if (obj['@type'] === 'Recipe') return obj as SchemaOrgRecipe
          if (obj['@graph']) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const recipe = obj['@graph'].find((item: any) => item['@type'] === 'Recipe')
            if (recipe) return recipe as SchemaOrgRecipe
          }
        }
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

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
    author
  }
}

/**
 * Extract recipe data from blog post HTML by parsing headings, lists, and common patterns
 * Works for sites that don't use Schema.org Recipe but have ingredients/instructions in HTML
 */
function extractRecipeFromBlogPost(html: string): Omit<ImportedRecipe, 'sourceUrl'> | null {
  try {
    // Extract title from <h1> or <title>
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title>(.*?)<\/title>/i)
    const name = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").trim() : null
    if (!name) return null

    // Extract description from meta description
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)
    const description = descMatch ? descMatch[1].replace(/&amp;/g, '&') : ''

    // Extract image from og:image
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/)
    const imageUrl = ogImageMatch ? ogImageMatch[1] : undefined

    // Look for ingredient patterns: <li> items after "ingredients" heading
    const ingredientSection = html.match(/(?:ingredients|what you(?:'|&#8217;)ll need)[\s\S]*?<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i)
    const ingredients: string[] = []
    if (ingredientSection) {
      const liMatches = ingredientSection[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
      for (const m of liMatches) {
        const text = m[1].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
        if (text.length > 2 && text.length < 200) ingredients.push(text)
      }
    }

    // Look for instruction patterns: <li> or <p> items after "instructions/directions" heading
    const instructionSection = html.match(/(?:instructions|directions|how to make|steps|method)[\s\S]*?<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i)
    const instructions: string[] = []
    if (instructionSection) {
      const liMatches = instructionSection[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
      for (const m of liMatches) {
        const text = m[1].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
        if (text.length > 5) instructions.push(text)
      }
    }

    // Need at least a name and some ingredients or instructions to be useful
    if (ingredients.length === 0 && instructions.length === 0) return null

    return {
      name,
      description,
      ingredients,
      instructions,
      imageUrl,
      servings: 4,
      dietaryTags: []
    }
  } catch {
    return null
  }
}

async function extractRecipeWithAI(html: string, sourceUrl: string): Promise<ImportedRecipe> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to extract JSON from AI response')

  const extracted = JSON.parse(jsonMatch[1] || jsonMatch[0])
  return { ...extracted, sourceUrl, dietaryTags: mapDietaryTags([], extracted.keywords || '') }
}

async function calculateNutritionForRecipe(recipe: ImportedRecipe): Promise<{
  calories: number; protein: number; carbs: number; fat: number; fiber: number
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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
  if (!jsonMatch) throw new Error('Failed to extract JSON from AI response')

  return JSON.parse(jsonMatch[1] || jsonMatch[0])
}

/**
 * Fetch HTML using curl (bypasses TLS fingerprinting that blocks Node.js fetch)
 */
async function fetchHtmlWithCurl(url: string): Promise<string> {
  const { execSync } = require('child_process')
  try {
    const html = execSync(
      `curl -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" "${url}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
    )
    return html.toString()
  } catch {
    // Fallback to Node.js fetch if curl fails
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`)
    return await response.text()
  }
}

/**
 * Fetch HTML content from URL directly (server-side, no CORS)
 * then parse recipe data using Schema.org or AI extraction
 */
async function importRecipeFromUrlServerSide(url: string): Promise<ImportedRecipe> {
  const html = await fetchHtmlWithCurl(url)
  const schemaRecipe = parseSchemaOrgRecipe(html)

  if (schemaRecipe) {
    logger.info('Found Schema.org Recipe data for import')
    return convertSchemaToImportedRecipe(schemaRecipe, url)
  }

  // Check for BlogPosting with recipe-like content in @graph
  const blogRecipe = extractRecipeFromBlogPost(html)
  if (blogRecipe) {
    logger.info('Extracted recipe from blog post HTML')
    return { ...blogRecipe, sourceUrl: url }
  }

  // AI extraction as last resort
  logger.info('No structured recipe data found, using AI extraction')
  return await extractRecipeWithAI(html, url)
}

/**
 * GET /api/recipes/import?url=...
 * Server-side recipe import from URL (no CORS issues)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await adminAuth.verifyIdToken(idToken)

    const rawUrl = request.nextUrl.searchParams.get('url')
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 })
    }

    // Strip URL fragment and tracking params for cleaner fetch
    const url = rawUrl.split('#')[0]

    // Import recipe server-side (direct fetch, no CORS proxy needed)
    const recipe = await importRecipeFromUrlServerSide(url)

    // Calculate nutrition if missing
    if (!recipe.calories || !recipe.protein) {
      try {
        const nutrition = await calculateNutritionForRecipe(recipe)
        recipe.calories = nutrition.calories
        recipe.protein = nutrition.protein
        recipe.carbs = nutrition.carbs
        recipe.fat = nutrition.fat
        recipe.fiber = nutrition.fiber
      } catch (nutritionErr) {
        logger.error('Failed to calculate nutrition for import', nutritionErr as Error)
      }
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/recipes/import',
      operation: 'import'
    })
  }
}

/**
 * POST /api/recipes/import (legacy — kept for backward compatibility)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    await adminAuth.verifyIdToken(idToken)

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 })
    }

    const recipe = await importRecipeFromUrlServerSide(url)

    if (!recipe.calories || !recipe.protein || !recipe.carbs || !recipe.fat) {
      try {
        const nutrition = await calculateNutritionForRecipe(recipe)
        recipe.calories = nutrition.calories
        recipe.protein = nutrition.protein
        recipe.carbs = nutrition.carbs
        recipe.fat = nutrition.fat
        recipe.fiber = nutrition.fiber
      } catch (nutritionErr) {
        logger.error('Failed to calculate nutrition for import', nutritionErr as Error)
      }
    }

    return NextResponse.json(recipe)
  } catch (error) {
    return errorResponse(error, {
      route: '/api/recipes/import',
      operation: 'import'
    })
  }
}
