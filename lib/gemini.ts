/**
 * Gemini AI Wrapper for Health Profile & Meal Safety Features
 *
 * This module provides Gemini-powered functions for:
 * 1. Health profile generation from user conditions
 * 2. Meal safety checks against health restrictions
 *
 * Uses structured JSON output with schemas for type safety
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { AIHealthProfile, MealSafetyCheck, UserProfile } from '@/types'
import { logger } from '@/lib/logger'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Schema for health profile generation
 * Ensures Gemini returns structured, type-safe data
 */
const healthProfileSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    restrictions: {
      type: SchemaType.OBJECT as const,
      properties: {
        sodium: {
          type: SchemaType.OBJECT as const,
          properties: {
            limit: { type: SchemaType.NUMBER as const },
            unit: { type: SchemaType.STRING as const },
            reason: { type: SchemaType.STRING as const }
          },
          required: []
        },
        potassium: {
          type: SchemaType.OBJECT as const,
          properties: {
            limit: { type: SchemaType.NUMBER as const },
            unit: { type: SchemaType.STRING as const },
            reason: { type: SchemaType.STRING as const }
          },
          required: []
        },
        protein: {
          type: SchemaType.OBJECT as const,
          properties: {
            limit: { type: SchemaType.NUMBER as const },
            unit: { type: SchemaType.STRING as const },
            reason: { type: SchemaType.STRING as const }
          },
          required: []
        },
        sugar: {
          type: SchemaType.OBJECT as const,
          properties: {
            limit: { type: SchemaType.NUMBER as const },
            unit: { type: SchemaType.STRING as const },
            reason: { type: SchemaType.STRING as const }
          },
          required: []
        },
        carbs: {
          type: SchemaType.OBJECT as const,
          properties: {
            limit: { type: SchemaType.NUMBER as const },
            unit: { type: SchemaType.STRING as const },
            reason: { type: SchemaType.STRING as const }
          },
          required: []
        }
      },
      required: []
    },
    calorieAdjustment: {
      type: SchemaType.OBJECT as const,
      properties: {
        multiplier: { type: SchemaType.NUMBER as const },
        reason: { type: SchemaType.STRING as const }
      },
      required: []
    },
    monitorNutrients: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const }
    },
    criticalWarnings: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const }
    },
    confidence: { type: SchemaType.NUMBER as const }
  },
  required: ['restrictions', 'confidence']
}

/**
 * Schema for meal safety check
 */
const mealSafetySchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    isSafe: { type: SchemaType.BOOLEAN as const },
    warnings: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const }
    },
    severity: { type: SchemaType.STRING as const }, // 'safe' | 'caution' | 'critical'
    nutrientBreakdown: {
      type: SchemaType.OBJECT as const,
      properties: {},
      required: []
    },
    confidence: { type: SchemaType.NUMBER as const }
  },
  required: ['isSafe', 'warnings', 'severity', 'confidence']
}

/**
 * Generate AI health profile from user's health conditions
 *
 * @param profile - User profile with health conditions
 * @returns Structured health profile with dietary restrictions
 */
export async function callGeminiHealthProfile(profile: {
  healthConditions?: string[]
  age?: number
  gender?: string
  currentWeight?: number
  height?: number
  activityLevel?: string
  units?: 'metric' | 'imperial'
}): Promise<Omit<AIHealthProfile, 'reviewStatus' | 'generatedAt' | 'lastReviewedBy'>> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: healthProfileSchema,
        temperature: 0.3 // Lower temperature for more consistent medical advice
      }
    })

    // Calculate BMI if height and weight available
    let bmi: number | undefined
    if (profile.height && profile.currentWeight && profile.units) {
      if (profile.units === 'imperial') {
        // BMI = (weight in lbs / (height in inches)^2) * 703
        bmi = (profile.currentWeight / Math.pow(profile.height, 2)) * 703
      } else {
        // BMI = weight in kg / (height in m)^2
        const heightInMeters = profile.height / 100
        bmi = profile.currentWeight / Math.pow(heightInMeters, 2)
      }
    }

    const prompt = `You are a medical nutrition AI assistant. Analyze the following health profile and generate personalized dietary restrictions and safety guidelines.

USER PROFILE:
- Health Conditions: ${profile.healthConditions?.join(', ') || 'None reported'}
- Age: ${profile.age || 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- BMI: ${bmi ? bmi.toFixed(1) : 'Unknown'}
- Activity Level: ${profile.activityLevel || 'Unknown'}

TASK:
Generate dietary restrictions based on medical guidelines for each condition. Consider:

1. **Chronic Kidney Disease (CKD)**:
   - Stage 1-2: 2,300mg sodium/day, monitor protein
   - Stage 3-4: 1,500-2,000mg sodium/day, 0.6-0.8g protein/kg body weight, limit potassium (2,000mg/day) and phosphorus
   - Stage 5/Dialysis: 1,500mg sodium/day, restrict potassium/phosphorus

2. **Hypertension/High Blood Pressure**:
   - Sodium: 1,500-2,300mg/day (DASH diet)

3. **Type 2 Diabetes**:
   - Carbs: 45-60g per meal, total sugar <50g/day
   - Focus on complex carbs, monitor glucose

4. **Heart Disease/Cardiovascular**:
   - Sodium: <2,000mg/day
   - Saturated fat: <7% calories
   - Cholesterol: <200mg/day

5. **Cancer (active treatment)**:
   - May need higher calories (1.2-1.5x normal)
   - High protein for healing

6. **PCOS**:
   - Lower carbs (30-35% of calories vs 45-50%)
   - Focus on low glycemic index foods

7. **Thyroid Disorders**:
   - Hypothyroid: May need 10% fewer calories
   - Hyperthyroid: May need 10-20% more calories

8. **Pregnancy/Nursing**:
   - Minimum 1,800 calories/day
   - Avoid: alcohol, high mercury fish, unpasteurized foods

IMPORTANT:
- Only include restrictions relevant to reported conditions
- Provide specific numeric limits with units (mg, g, %, etc.)
- Include clear medical reasoning
- List nutrients that should be monitored prominently
- Flag critical warnings (medication interactions, allergens)
- Return confidence score (0-100) based on condition specificity

If NO health conditions are reported, return empty restrictions with 100 confidence.`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    const parsed = JSON.parse(response)

    logger.info('[Gemini] Health profile generated', {
      conditions: profile.healthConditions,
      confidence: parsed.confidence,
      restrictionsCount: Object.keys(parsed.restrictions || {}).length
    })

    return parsed
  } catch (error) {
    logger.error('[Gemini] Health profile generation failed', error as Error)

    // Fallback: return safe defaults
    return {
      restrictions: {},
      confidence: 0,
      monitorNutrients: [],
      criticalWarnings: ['AI analysis failed - manual review required']
    }
  }
}

/**
 * Check meal safety against user's health profile
 *
 * @param meal - Meal data with nutritional info
 * @param healthProfile - User's AI health profile
 * @returns Safety assessment with warnings
 */
export async function callGeminiMealSafety(params: {
  meal: {
    foodItems: Array<{ name: string; portion: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; sodium?: number }>
    totalCalories: number
    totalMacros: { protein: number; carbs: number; fat: number; fiber: number }
    sodium?: number
  }
  healthProfile: AIHealthProfile | null
}): Promise<MealSafetyCheck> {
  const { meal, healthProfile } = params

  try {
    // If no health profile, meal is safe
    if (!healthProfile || Object.keys(healthProfile.restrictions).length === 0) {
      return {
        isSafe: true,
        warnings: [],
        severity: 'safe',
        confidence: 100
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: mealSafetySchema,
        temperature: 0.2 // Very low temp for consistent safety checks
      }
    })

    const prompt = `You are a medical nutrition AI assistant. Check if this meal is safe for a user with specific dietary restrictions.

MEAL DETAILS:
- Food Items: ${meal.foodItems.map(f => `${f.name} (${f.portion})`).join(', ')}
- Total Calories: ${meal.totalCalories}
- Protein: ${meal.totalMacros.protein}g
- Carbs: ${meal.totalMacros.carbs}g
- Fat: ${meal.totalMacros.fat}g
- Fiber: ${meal.totalMacros.fiber}g
- Sodium: ${meal.sodium || 'Unknown'}mg

USER'S DIETARY RESTRICTIONS:
${Object.entries(healthProfile.restrictions)
  .filter(([_, r]) => r && r.limit)
  .map(([nutrient, restriction]) => `- ${nutrient}: Max ${restriction!.limit}${restriction!.unit}/day (${restriction!.reason})`)
  .join('\n')}

MONITORED NUTRIENTS:
${healthProfile.monitorNutrients?.join(', ') || 'None'}

CRITICAL WARNINGS:
${healthProfile.criticalWarnings?.join(', ') || 'None'}

TASK:
Assess meal safety:
1. Compare meal nutrients against daily limits
2. Calculate percentage of daily limit used by this meal
3. Flag warnings if meal exceeds 30% of any restricted nutrient
4. Determine severity:
   - "safe": All nutrients within limits
   - "caution": 30-50% of daily limit for any restricted nutrient
   - "critical": >50% of daily limit, or forbidden food detected
5. Provide human-readable warnings
6. Return confidence score

IMPORTANT:
- Assume this is ONE meal out of 3-4 daily
- A meal using >30% of daily sodium is concerning
- Consider cumulative effect across the day
- Flag specific foods causing issues`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    const parsed = JSON.parse(response)

    logger.info('[Gemini] Meal safety check completed', {
      isSafe: parsed.isSafe,
      severity: parsed.severity,
      warningsCount: parsed.warnings.length,
      confidence: parsed.confidence
    })

    return parsed
  } catch (error) {
    logger.error('[Gemini] Meal safety check failed', error as Error)

    // Fallback: err on side of caution
    return {
      isSafe: false,
      warnings: ['Safety check failed - please review meal manually'],
      severity: 'caution',
      confidence: 0
    }
  }
}

/**
 * Validate Gemini API key is configured
 */
export function validateGeminiConfig(): { valid: boolean; error?: string } {
  if (!process.env.GEMINI_API_KEY) {
    return {
      valid: false,
      error: 'GEMINI_API_KEY not configured in environment variables'
    }
  }
  return { valid: true }
}
