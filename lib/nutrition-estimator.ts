/**
 * Server-side meal-nutrition estimator.
 *
 * Estimates a meal's TOTAL calories + macros from its ingredient list using
 * Gemini. This is the user-triggered "Estimate macros" path — a rules-only
 * (OpenFoodFacts) lookup is too rough for generic, quantity-less ingredients
 * ("scallions", "handful of spinach"), whereas an LLM handles vague amounts and
 * common foods well. It's opt-in (a button), so quota stays bounded, and the
 * result is always presented as an editable estimate.
 *
 * Mirrors the Gemini call + JSON hardening in lib/ai-recipe-generator.ts.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface NutritionEstimate {
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'low' | 'medium' | 'high'
  /** One short sentence on the key assumptions made. */
  note?: string
  /** Human-readable "ingredient: assumed amount" notes for missing quantities. */
  assumedPortions?: string[]
}

const clampInt = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))

export async function estimateMealNutrition(params: {
  ingredients: string[]
  mealType?: string
  mealName?: string
}): Promise<NutritionEstimate> {
  const list = params.ingredients.map((s) => s.trim()).filter(Boolean)
  if (list.length === 0) throw new Error('No ingredients to estimate')

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.2, // low → consistent numeric estimates
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `You are a careful nutrition estimator. Estimate the TOTAL nutrition for this ${
    params.mealType || 'meal'
  }${params.mealName ? ` ("${params.mealName}")` : ''}, summing across ALL ingredients as one serving.

Ingredients (one per line; some may lack an amount):
${list.map((i) => `- ${i}`).join('\n')}

Rules:
- Estimate for the WHOLE meal as listed (all ingredients combined).
- Use standard USDA-style values for common foods.
- When an amount is missing or vague ("handful", "a splash", "some"), assume a typical single-serving portion and record it in assumedPortions.
- calories in kcal; protein/carbs/fat in grams; whole numbers.
- Set "confidence" honestly: "low" if many amounts were missing, "high" if amounts were clear.

Return ONLY JSON with exactly these keys:
{"calories":number,"protein":number,"carbs":number,"fat":number,"confidence":"low"|"medium"|"high","note":string,"assumedPortions":string[]}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Harden JSON extraction (strip fences, grab the object) per the Gemini
    // gotchas even though responseMimeType is JSON.
    let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) clean = match[0]
    const parsed = JSON.parse(clean)

    const confidence = ['low', 'medium', 'high'].includes(parsed.confidence)
      ? (parsed.confidence as NutritionEstimate['confidence'])
      : 'low'

    return {
      calories: clampInt(parsed.calories),
      protein: clampInt(parsed.protein),
      carbs: clampInt(parsed.carbs),
      fat: clampInt(parsed.fat),
      confidence,
      note: typeof parsed.note === 'string' && parsed.note.trim() ? parsed.note.trim() : undefined,
      assumedPortions: Array.isArray(parsed.assumedPortions)
        ? parsed.assumedPortions.slice(0, 12).map((x: unknown) => String(x))
        : undefined,
    }
  } catch (err) {
    logger.error('Nutrition estimate failed', err as Error)
    throw err instanceof Error ? err : new Error('Nutrition estimate failed')
  }
}
