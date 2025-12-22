/**
 * AI Vision Service
 *
 * Handles meal image analysis using multiple AI providers with fallback logic.
 * Separation of concerns: Keep AI provider logic separate from API routes.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'

export interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface MealAnalysis {
  foodItems: FoodItem[]
  totalCalories: number
  totalMacros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  confidence: number
  suggestions: string[]
  suggestedMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

export interface AnalysisResult {
  analysis: MealAnalysis
  provider: 'gemini' | 'openai' | 'mock'
  error?: string
}

/**
 * Analyze meal image using Gemini Vision API
 */
async function analyzeWithGemini(
  imageData: string,
  mealType?: string
): Promise<MealAnalysis> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
    }
  })

  // Convert base64 image to Gemini format
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
  const mimeType = imageData.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
    }
  }

  const prompt = `Analyze this meal photo and provide a detailed nutritional analysis with per-item breakdown.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "foodItems": [
    {
      "name": "food item name",
      "portion": "amount with unit (e.g., 6 oz, 1 cup, 150g)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number
    }
  ],
  "totalCalories": number (sum of all food items),
  "totalMacros": {
    "protein": number (sum of all items),
    "carbs": number (sum of all items),
    "fat": number (sum of all items),
    "fiber": number (sum of all items)
  },
  "confidence": number (0-100),
  "suggestions": ["suggestion1", "suggestion2", ...],
  "suggestedMealType": "breakfast|lunch|dinner|snack"
}

Guidelines:
- Provide detailed breakdown for EACH visible food item separately
- Include specific portion sizes (weight or volume) for each item
- Calculate calories and macros per item using USDA nutrition database standards
- Be conservative with estimates (better to underestimate than overestimate)
- Confidence should reflect image quality and food visibility
- Provide 1-3 actionable, positive suggestions for the overall meal
- All macro values in grams
- Detect meal type based on the food items (e.g., pancakes/eggs = breakfast, sandwich = lunch, steak = dinner, fruit/chips = snack)
- User specified this as: ${mealType || 'unspecified'}, but analyze independently
- For mixed dishes (e.g., stir-fry, casserole), break down into main components when possible`

  // Add 8-second timeout
  const result = await Promise.race([
    model.generateContent([prompt, imagePart]),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 8 seconds')), 8000)
    )
  ]) as any

  const response = result.response
  const text = response.text()

  // Remove markdown code blocks if present
  const jsonContent = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  return JSON.parse(jsonContent)
}

/**
 * Analyze meal image using OpenAI Vision API
 */
async function analyzeWithOpenAI(
  imageData: string,
  mealType?: string
): Promise<MealAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const prompt = `Analyze this meal photo and provide a detailed nutritional analysis with per-item breakdown.

Return ONLY valid JSON with this exact structure:
{
  "foodItems": [
    {
      "name": "food item name",
      "portion": "amount with unit (e.g., 6 oz, 1 cup, 150g)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number
    }
  ],
  "totalCalories": number,
  "totalMacros": {
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number
  },
  "confidence": number (0-100),
  "suggestions": ["suggestion1", "suggestion2", ...],
  "suggestedMealType": "breakfast|lunch|dinner|snack"
}

User specified meal type: ${mealType || 'unspecified'}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: imageData
            }
          }
        ]
      }
    ],
    max_tokens: 2048,
    temperature: 0.4
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  // Remove markdown code blocks if present
  const jsonContent = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  return JSON.parse(jsonContent)
}

/**
 * Get mock analysis data (fallback when all providers fail)
 */
function getMockAnalysis(): MealAnalysis {
  const mockMeals = [
    {
      items: [
        { name: 'Grilled chicken breast', portion: '6 oz', calories: 280, protein: 53, carbs: 0, fat: 6, fiber: 0 },
        { name: 'Brown rice', portion: '1 cup', calories: 215, protein: 5, carbs: 45, fat: 2, fiber: 3 },
        { name: 'Steamed broccoli', portion: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 0, fiber: 5 }
      ],
      totalCalories: 550,
      totalMacros: { protein: 62, carbs: 56, fat: 8, fiber: 8 }
    },
    {
      items: [
        { name: 'Salmon fillet', portion: '5 oz', calories: 290, protein: 39, carbs: 0, fat: 14, fiber: 0 },
        { name: 'Quinoa', portion: '1 cup', calories: 220, protein: 8, carbs: 39, fat: 4, fiber: 5 },
        { name: 'Roasted vegetables', portion: '1.5 cups', calories: 90, protein: 3, carbs: 15, fat: 3, fiber: 5 }
      ],
      totalCalories: 600,
      totalMacros: { protein: 50, carbs: 54, fat: 21, fiber: 10 }
    }
  ]

  const randomMeal = mockMeals[Math.floor(Math.random() * mockMeals.length)]

  const hour = new Date().getHours()
  let suggestedType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch'
  if (hour >= 5 && hour < 11) suggestedType = 'breakfast'
  else if (hour >= 11 && hour < 15) suggestedType = 'lunch'
  else if (hour >= 15 && hour < 21) suggestedType = 'dinner'
  else suggestedType = 'snack'

  return {
    foodItems: randomMeal.items,
    totalCalories: randomMeal.totalCalories,
    totalMacros: randomMeal.totalMacros,
    confidence: 50,
    suggestions: ['Mock data - AI analysis unavailable'],
    suggestedMealType: suggestedType
  }
}

/**
 * Analyze meal image with automatic fallback between providers
 *
 * Tries providers in order: Gemini -> OpenAI -> Mock
 */
export async function analyzeMealImage(
  imageData: string,
  mealType?: string
): Promise<AnalysisResult> {
  // Try Gemini first
  try {
    logger.info('Attempting analysis with Gemini')
    const analysis = await analyzeWithGemini(imageData, mealType)
    logger.info('✅ Gemini analysis successful')
    return { analysis, provider: 'gemini' }
  } catch (geminiError) {
    const errorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError)
    logger.warn('Gemini failed, trying OpenAI fallback', { error: errorMsg })

    // Try OpenAI fallback
    try {
      logger.info('Attempting analysis with OpenAI')
      const analysis = await analyzeWithOpenAI(imageData, mealType)
      logger.info('✅ OpenAI analysis successful')
      return { analysis, provider: 'openai' }
    } catch (openaiError) {
      const openaiMsg = openaiError instanceof Error ? openaiError.message : String(openaiError)
      logger.warn('OpenAI failed, using mock data', { error: openaiMsg })

      // Return mock data as final fallback
      return {
        analysis: getMockAnalysis(),
        provider: 'mock',
        error: `All providers failed. Gemini: ${errorMsg}, OpenAI: ${openaiMsg}`
      }
    }
  }
}
