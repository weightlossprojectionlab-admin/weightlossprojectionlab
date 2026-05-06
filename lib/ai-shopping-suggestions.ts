/**
 * AI-Powered Health-Based Shopping Suggestions
 *
 * Generates intelligent shopping suggestions based on:
 * - Patient health vitals (blood pressure, glucose, weight, etc.)
 * - Medical conditions (diabetes, hypertension, celiac, etc.)
 * - Dietary preferences and allergies
 * - Health goals (weight loss, maintain, gain)
 * - Age-appropriate nutrition needs
 *
 * Uses Gemini AI for intelligent recommendations
 */

'use client'

import { logger } from '@/lib/logger'
import type {
  HealthBasedSuggestion,
  HealthSuggestionsGroup,
  HealthSuggestionsRequest,
  HealthSuggestionsResponse,
  HealthSuggestionReason,
  ProductCategory
} from '@/types/shopping'
import type { PatientProfile, VitalSign } from '@/types/medical'
import { patientOperations, vitalOperations } from '@/lib/medical-operations'

// Extended patient profile with AI health properties (not yet in main type)
interface ExtendedPatientProfile extends PatientProfile {
  age?: number
  conditions?: string[]
  dietaryPreferences?: {
    type?: string
    restrictions?: string[]
    allergies?: string[]
  }
  dietaryRestrictions?: string[]
  allergies?: string[]
  healthGoals?: {
    weightGoal?: string
  }
}

// Cache for suggestions (5 minutes TTL)
const CACHE_TTL = 5 * 60 * 1000
const suggestionsCache = new Map<string, { data: HealthSuggestionsResponse; timestamp: number }>()

/**
 * Allergen → product-name keyword map (FDA Big 9 + canonical synonyms).
 *
 * SAFETY-CRITICAL: when a patient's `foodAllergies` contains an entry
 * whose normalized form matches a key here, every keyword in the value
 * list is treated as banned in product names. Substring match — so
 * "Whole Milk" hits 'milk', "Greek Yogurt" hits 'yogurt' (mapped under
 * `milk`), "Almond Butter" hits 'almond' under `tree nuts`, etc.
 *
 * Keys are lowercase. Anything not in the map falls back to a
 * literal-name match (so a patient with "kiwi" allergy still gets
 * filtered against any "kiwi" suggestion).
 */
const ALLERGEN_KEYWORD_MAP: Record<string, string[]> = {
  // Milk / Dairy
  milk: ['milk', 'yogurt', 'cheese', 'butter', 'cream', 'dairy', 'whey', 'casein', 'lactose', 'ghee'],
  dairy: ['milk', 'yogurt', 'cheese', 'butter', 'cream', 'dairy', 'whey', 'casein', 'lactose', 'ghee'],
  lactose: ['milk', 'yogurt', 'cheese', 'butter', 'cream', 'dairy', 'whey', 'lactose'],
  // Eggs
  egg: ['egg'],
  eggs: ['egg'],
  // Peanuts (separate from tree nuts per FDA)
  peanut: ['peanut'],
  peanuts: ['peanut'],
  // Tree nuts
  'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut'],
  'tree nut': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut'],
  nuts: ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'peanut'],
  // Fish
  fish: ['salmon', 'tuna', 'cod', 'mackerel', 'sardine', 'anchovy', 'tilapia', 'fish'],
  // Shellfish
  shellfish: ['shrimp', 'crab', 'lobster', 'oyster', 'mussel', 'clam', 'shellfish', 'prawn', 'scallop'],
  // Wheat / Gluten
  wheat: ['wheat', 'flour', 'bread', 'pasta', 'cereal', 'gluten', 'cracker'],
  gluten: ['wheat', 'flour', 'bread', 'pasta', 'cereal', 'gluten', 'barley', 'rye', 'cracker'],
  // Soy
  soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  soybean: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  // Sesame (FDA Big 9 since 2023)
  sesame: ['sesame', 'tahini'],
}

/**
 * Some allergen keywords are too broad on their own — `butter` is a
 * milk product, but "peanut butter" / "almond butter" / "apple butter"
 * are not dairy. When a keyword would match but is preceded by one of
 * its excluded prefixes (taken as the immediately preceding whitespace-
 * delimited word), we treat it as a non-match for that allergen.
 */
const KEYWORD_PREFIX_EXCLUSIONS: Record<string, string[]> = {
  butter: ['peanut', 'almond', 'cashew', 'sunflower', 'apple', 'body', 'cocoa', 'shea', 'soy', 'pumpkin', 'hazelnut', 'macadamia', 'pistachio', 'walnut'],
  // Plant-based milks: not dairy. (Tree-nut-allergic users still get
  // a hit via the 'almond'/'cashew'/'hazelnut' tree-nut keywords.)
  milk: ['almond', 'soy', 'oat', 'rice', 'coconut', 'cashew', 'hazelnut', 'hemp', 'flax', 'pea'],
}

/**
 * Allergen-check order: more-specific allergens first so that on a
 * product like "peanut butter" with `['milk', 'peanuts']`, peanut wins
 * over milk's `butter` keyword. Anything not in this list is checked
 * after the listed ones (in the user's original order).
 */
const ALLERGEN_PRIORITY = [
  'peanut', 'peanuts',
  'tree nuts', 'tree nut', 'nuts',
  'sesame',
  'fish',
  'shellfish',
  'egg', 'eggs',
  'soy', 'soybean',
  'wheat', 'gluten',
  'milk', 'dairy', 'lactose',
]

/**
 * Word-boundary keyword match. Avoids false positives like 'cream'
 * matching inside 'creamy', or 'egg' matching 'eggplant'. Honors
 * KEYWORD_PREFIX_EXCLUSIONS so e.g. "peanut butter" doesn't trip the
 * milk→butter rule.
 */
function matchesAllergenKeyword(productName: string, keyword: string): boolean {
  const lower = productName.toLowerCase()
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'i')
  const m = lower.match(re)
  if (!m || m.index === undefined) return false

  const exclusions = KEYWORD_PREFIX_EXCLUSIONS[keyword]
  if (exclusions && exclusions.length > 0) {
    const before = lower.slice(0, m.index).trim()
    const lastWord = before.split(/\s+/).pop() || ''
    if (exclusions.includes(lastWord)) return false
  }
  return true
}

/**
 * Returns true if `productName` would expose someone with any of the
 * given allergies. Exported because both the engine (filter at
 * generation) and the render layer (defense-in-depth filter at display)
 * need it — single source of truth for allergen matching.
 *
 * Implementation notes:
 *  - Word-boundary matching ('cream' won't match 'creamy', 'egg' won't
 *    match 'eggplant').
 *  - Prefix exclusions ('butter' preceded by 'peanut' / 'almond' / etc.
 *    is not dairy).
 *  - Allergen priority order: more-specific allergens (peanut, tree
 *    nuts, sesame, etc.) are checked before the broader milk/wheat
 *    families so labeling reflects the dominant allergen on compound
 *    products like "peanut butter".
 */
export function containsAllergen(
  productName: string,
  allergies: string[] | undefined
): { matched: boolean; allergen?: string; keyword?: string } {
  if (!allergies || allergies.length === 0) return { matched: false }

  const sortedAllergies = [...allergies].sort((a, b) => {
    const ai = ALLERGEN_PRIORITY.indexOf(a.toLowerCase().trim())
    const bi = ALLERGEN_PRIORITY.indexOf(b.toLowerCase().trim())
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
  })

  for (const allergy of sortedAllergies) {
    const key = allergy.toLowerCase().trim()
    if (!key) continue
    const keywords = ALLERGEN_KEYWORD_MAP[key] || [key]
    for (const kw of keywords) {
      if (matchesAllergenKeyword(productName, kw)) {
        return { matched: true, allergen: allergy, keyword: kw }
      }
    }
  }
  return { matched: false }
}

/**
 * Read the patient's allergies from any of the supported field
 * locations and return a deduplicated, trimmed list. Canonical field
 * is `foodAllergies` (per family-meal PRD); the legacy `allergies` and
 * `dietaryPreferences.allergies` are honored too so older profiles
 * still get safety filtering.
 *
 * Exported so other surfaces (shopping list rendering, log-meal
 * pre-flight, etc.) can read allergies through one canonical path.
 */
export function getPatientAllergies(patient: { foodAllergies?: string[]; allergies?: string[]; dietaryPreferences?: { allergies?: string[] } } | null | undefined): string[] {
  if (!patient) return []
  const merged = [
    ...(patient.foodAllergies || []),
    ...(patient.dietaryPreferences?.allergies || []),
    ...(patient.allergies || []),
  ]
    .map(a => (a || '').trim())
    .filter(a => a.length > 0)
  return Array.from(new Set(merged))
}

/**
 * Filter out suggestions that would expose a patient to one of their
 * allergens. SAFETY-CRITICAL: this gate runs after `filterUnhealthyFoods`
 * and before suggestions reach the response. The render layer also
 * filters as defense-in-depth (see HealthSuggestions.tsx).
 */
function filterAllergens(
  suggestions: HealthBasedSuggestion[],
  allergies: string[]
): HealthBasedSuggestion[] {
  if (!allergies || allergies.length === 0) return suggestions
  const filtered = suggestions.filter(suggestion => {
    const result = containsAllergen(suggestion.productName, allergies)
    if (result.matched) {
      logger.warn('[AI Shopping] Filtered allergen from suggestions', {
        productName: suggestion.productName,
        matchedAllergen: result.allergen,
        matchedKeyword: result.keyword,
        patientAllergies: allergies,
      })
    }
    return !result.matched
  })
  logger.info('[AI Shopping] Allergen filter applied', {
    before: suggestions.length,
    after: filtered.length,
    removed: suggestions.length - filtered.length,
    allergies,
  })
  return filtered
}

/**
 * Unhealthy Food Blacklist
 * These items should NEVER appear in health-based suggestions
 */
const UNHEALTHY_FOOD_BLACKLIST = [
  // Junk Food & Snacks
  'potato chips', 'chips', 'doritos', 'cheetos', 'pretzels',
  'candy', 'candy bars', 'chocolate bars', 'gummy bears', 'skittles', 'm&ms',
  'cookies', 'oreos', 'chips ahoy',
  'donuts', 'doughnuts',
  'ice cream', 'popsicles',

  // Sugary Drinks
  'soda', 'cola', 'pepsi', 'coke', 'sprite', 'mountain dew',
  'energy drink', 'red bull', 'monster',
  'sweet tea', 'kool-aid',

  // Processed/Fast Food
  'hot dogs', 'corn dogs',
  'frozen pizza', 'pizza rolls',
  'instant ramen', 'cup noodles',
  'chicken nuggets', 'fish sticks',
  'tv dinners', 'microwave dinners',

  // Refined Grains/Bread
  'white bread', 'wonder bread',
  'white rice', 'instant rice',
  'sugary cereal', 'fruit loops', 'frosted flakes', 'lucky charms',

  // High-Sodium/Processed
  'spam', 'vienna sausages',
  'bacon bits',
  'cheese whiz', 'velveeta',

  // Desserts
  'cake', 'brownies', 'cupcakes',
  'pie', 'pastries', 'danishes',
  'pudding cups',

  // Condiments (high sugar/sodium)
  'ketchup', 'bbq sauce',

  // Alcohol
  'beer', 'wine', 'liquor', 'vodka', 'whiskey'
]

/**
 * Check if a product name matches unhealthy blacklist
 */
function isUnhealthyFood(productName: string): boolean {
  const normalized = productName.toLowerCase().trim()
  return UNHEALTHY_FOOD_BLACKLIST.some(blacklisted =>
    normalized.includes(blacklisted) || blacklisted.includes(normalized)
  )
}

/**
 * Filter out unhealthy foods from suggestions
 */
function filterUnhealthyFoods(suggestions: HealthBasedSuggestion[]): HealthBasedSuggestion[] {
  const filtered = suggestions.filter(suggestion => {
    const isUnhealthy = isUnhealthyFood(suggestion.productName)
    if (isUnhealthy) {
      logger.warn('[AI Shopping] Filtered unhealthy food from suggestions', {
        productName: suggestion.productName,
        reason: 'Matched blacklist'
      })
    }
    return !isUnhealthy
  })

  logger.info('[AI Shopping] Filtered suggestions', {
    before: suggestions.length,
    after: filtered.length,
    removed: suggestions.length - filtered.length
  })

  return filtered
}

/**
 * Perishable Food Categories
 * Items that should be flagged as perishable for expiration tracking
 */
const PERISHABLE_KEYWORDS = [
  // Fresh Produce
  'lettuce', 'spinach', 'kale', 'arugula', 'salad', 'greens',
  'tomato', 'cucumber', 'bell pepper', 'broccoli', 'cauliflower',
  'carrot', 'celery', 'onion', 'garlic', 'potato',
  'apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry',
  'melon', 'watermelon', 'cantaloupe',
  'avocado', 'mango', 'pineapple',

  // Dairy
  'milk', 'yogurt', 'cheese', 'butter', 'cream', 'sour cream',

  // Meat & Seafood
  'chicken', 'turkey', 'beef', 'pork', 'lamb', 'ground',
  'salmon', 'tuna', 'fish', 'shrimp', 'seafood',
  'sausage', 'bacon',

  // Bakery
  'bread', 'bagel', 'muffin', 'tortilla',

  // Eggs & Deli
  'eggs', 'egg'
]

const NON_PERISHABLE_KEYWORDS = [
  // Canned/Packaged
  'canned', 'dried', 'dry', 'powder',
  'pasta', 'rice', 'grain', 'cereal', 'oats',
  'beans', 'lentils',
  'flour', 'sugar', 'salt',

  // Oils & Condiments
  'oil', 'olive oil', 'coconut oil', 'vinegar',
  'sauce', 'seasoning', 'spice',

  // Nuts & Seeds
  'nuts', 'almond', 'walnut', 'peanut', 'seed',

  // Beverages (shelf-stable)
  'water', 'juice box', 'tea bags', 'coffee'
]

/**
 * Determine if an item is perishable based on product name
 */
function isPerishableItem(productName: string): boolean {
  const normalized = productName.toLowerCase().trim()

  // Check non-perishable first (more specific)
  if (NON_PERISHABLE_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return false
  }

  // Check perishable
  if (PERISHABLE_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return true
  }

  // Default: assume perishable for safety (encourages tracking)
  return true
}

/**
 * Generate health-based shopping suggestions for a patient
 */
export async function generateHealthSuggestions(
  request: HealthSuggestionsRequest & { kitchenMode?: 'self' | 'others' | 'shared' | 'i_shop' | 'delivery' | 'meal_kits' }
): Promise<HealthSuggestionsResponse> {
  try {
    // Check cache
    const cacheKey = `${request.patientId}_${request.userId}_${request.kitchenMode || 'default'}`
    const cached = suggestionsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info('[AI Shopping] Returning cached suggestions', { patientId: request.patientId })
      return cached.data
    }

    logger.info('[AI Shopping] Generating health-based suggestions', {
      patientId: request.patientId,
      kitchenMode: request.kitchenMode
    })

    // Fetch patient data
    const patient = await patientOperations.getPatient(request.patientId) as ExtendedPatientProfile

    logger.info('[AI Shopping] Fetched patient data', {
      patientId: patient.userId,
      hasConditions: !!patient.conditions,
      conditionsCount: patient.conditions?.length || 0,
      conditions: patient.conditions,
      hasDietaryPrefs: !!patient.dietaryPreferences,
      dietaryType: patient.dietaryPreferences?.type,
      hasHealthGoals: !!patient.healthGoals,
      weightGoal: patient.healthGoals?.weightGoal,
      age: patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null,
      kitchenMode: request.kitchenMode
    })

    // Fetch latest vitals if requested
    let latestVitals: any = {}
    if (request.includeVitals !== false) {
      latestVitals = await fetchLatestVitals(request.patientId)
    }

    // Analyze patient health data and generate suggestions
    const analysis = analyzePatientHealth(patient, latestVitals)

    // PHASE 3: Generate AI-powered suggestions with kitchen mode personalization
    const suggestions = await generateAISuggestions(patient, latestVitals, analysis, request.kitchenMode)

    // Group suggestions by category
    const groupedSuggestions = groupSuggestionsByCategory(suggestions)

    // Identify items to avoid
    const itemsToAvoid = generateAvoidanceWarnings(patient, latestVitals, analysis)

    const response: HealthSuggestionsResponse = {
      suggestions,
      groupedSuggestions,
      healthSummary: {
        latestVitals: latestVitals.bloodPressure || latestVitals.bloodGlucose || latestVitals.weight
          ? latestVitals
          : undefined,
        conditions: patient.conditions || [],
        dietaryRestrictions: patient.dietaryPreferences?.restrictions || [],
        allergies: getPatientAllergies(patient),
        goals: patient.healthGoals ? [patient.healthGoals.weightGoal || 'general_health'] : []
      },
      itemsToAvoid,
      generatedAt: new Date(),
      cacheKey
    }

    // Cache the response
    suggestionsCache.set(cacheKey, { data: response, timestamp: Date.now() })

    logger.info('[AI Shopping] Generated suggestions', {
      patientId: request.patientId,
      suggestionCount: suggestions.length,
      groupCount: groupedSuggestions.length
    })

    return response
  } catch (error) {
    logger.error('[AI Shopping] Error generating suggestions', error as Error, { request })
    throw error
  }
}

/**
 * Fetch latest vital signs for patient
 */
async function fetchLatestVitals(patientId: string): Promise<any> {
  try {
    const vitals = await vitalOperations.getVitals(patientId, { limit: 10 })

    const latest: any = {}

    // Find latest blood pressure
    const latestBP = vitals.find(v => v.type === 'blood_pressure')
    if (latestBP && typeof latestBP.value === 'object' && 'systolic' in latestBP.value) {
      const systolic = latestBP.value.systolic
      const diastolic = latestBP.value.diastolic
      latest.bloodPressure = {
        systolic,
        diastolic,
        isAbnormal: systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60
      }
    }

    // Find latest blood glucose
    const latestGlucose = vitals.find(v => v.type === 'blood_sugar')
    if (latestGlucose && typeof latestGlucose.value === 'number') {
      latest.bloodGlucose = {
        value: latestGlucose.value,
        isAbnormal: latestGlucose.value < 70 || latestGlucose.value > 180
      }
    }

    // Find latest weight
    const latestWeight = vitals.find(v => v.type === 'weight')
    if (latestWeight && typeof latestWeight.value === 'number') {
      latest.weight = {
        value: latestWeight.value,
        unit: latestWeight.unit
      }

      // Calculate BMI if height is available (would need patient height)
      // For now, we'll skip BMI calculation
    }

    return latest
  } catch (error) {
    logger.error('[AI Shopping] Error fetching vitals', error as Error, { patientId })
    return {}
  }
}

/**
 * Analyze patient health data to determine needs
 */
function analyzePatientHealth(patient: ExtendedPatientProfile, vitals: any): {
  needs: HealthSuggestionReason[]
  priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'>
} {
  const needs: HealthSuggestionReason[] = []
  const priorities = new Map<HealthSuggestionReason, 'high' | 'medium' | 'low'>()

  // Check vitals
  if (vitals.bloodPressure?.isAbnormal) {
    if (vitals.bloodPressure.systolic > 140 || vitals.bloodPressure.diastolic > 90) {
      needs.push('high_blood_pressure')
      priorities.set('high_blood_pressure', 'high')
    }
  }

  if (vitals.bloodGlucose?.isAbnormal) {
    if (vitals.bloodGlucose.value > 180) {
      needs.push('high_blood_glucose')
      priorities.set('high_blood_glucose', 'high')
    }
  }

  // Check conditions
  if (patient.conditions) {
    if (patient.conditions.includes('diabetes')) {
      needs.push('diabetes')
      priorities.set('diabetes', 'high')
    }
    if (patient.conditions.includes('hypertension')) {
      needs.push('hypertension')
      priorities.set('hypertension', 'high')
    }
    if (patient.conditions.includes('celiac')) {
      needs.push('celiac')
      priorities.set('celiac', 'high')
    }
    if (patient.conditions.includes('heart_disease')) {
      needs.push('heart_disease')
      priorities.set('heart_disease', 'high')
    }
    if (patient.conditions.includes('anemia')) {
      needs.push('anemia')
      priorities.set('anemia', 'medium')
    }
    if (patient.conditions.includes('high_cholesterol')) {
      needs.push('high_cholesterol')
      priorities.set('high_cholesterol', 'medium')
    }
  }

  // Check dietary preferences
  if (patient.dietaryPreferences) {
    if (patient.dietaryPreferences.type === 'vegetarian') {
      needs.push('vegetarian')
      priorities.set('vegetarian', 'medium')
    }
    if (patient.dietaryPreferences.type === 'vegan') {
      needs.push('vegan')
      priorities.set('vegan', 'medium')
    }
    if (patient.dietaryPreferences.type === 'keto') {
      needs.push('keto')
      priorities.set('keto', 'medium')
    }
    if (patient.dietaryPreferences.type === 'paleo') {
      needs.push('paleo')
      priorities.set('paleo', 'medium')
    }
  }

  // Check health goals
  if (patient.healthGoals) {
    if (patient.healthGoals.weightGoal === 'lose') {
      needs.push('weight_loss')
      priorities.set('weight_loss', 'medium')
    }
    if (patient.healthGoals.weightGoal === 'gain') {
      needs.push('weight_gain')
      priorities.set('weight_gain', 'medium')
    }
  }

  // Age-specific needs
  if (patient.dateOfBirth) {
    const age = calculateAge(patient.dateOfBirth)
    // Check for newborn/infant (under 1 year)
    const dobDate = new Date(patient.dateOfBirth)
    const monthsOld = (new Date().getFullYear() - dobDate.getFullYear()) * 12 + (new Date().getMonth() - dobDate.getMonth())
    if (monthsOld < 12) {
      needs.push('newborn_essentials')
      priorities.set('newborn_essentials', 'high')
    } else if (age < 18) {
      needs.push('child_nutrition')
      priorities.set('child_nutrition', 'high')
    }
    if (age >= 65) {
      needs.push('senior_nutrition')
      priorities.set('senior_nutrition', 'medium')
    }
  }

  // Default to general health if no specific needs
  if (needs.length === 0) {
    needs.push('general_health')
    priorities.set('general_health', 'low')
  }

  return { needs, priorities }
}

/**
 * Generate personalized suggestions based purely on Firebase health data
 * No external AI dependencies - uses rule-based logic with patient context
 */
async function generateAISuggestions(
  patient: ExtendedPatientProfile,
  vitals: any,
  analysis: { needs: HealthSuggestionReason[]; priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'> },
  kitchenMode?: 'self' | 'others' | 'shared' | 'i_shop' | 'delivery' | 'meal_kits'
): Promise<HealthBasedSuggestion[]> {
  logger.info('[AI Shopping] Generating Firebase-based suggestions', {
    patientId: patient.userId,
    needs: Array.from(analysis.needs),
    priorities: Array.from(analysis.priorities.entries()),
    vitals: {
      hasBloodPressure: !!vitals.bloodPressure,
      hasBloodGlucose: !!vitals.bloodGlucose,
      hasWeight: !!vitals.weight
    },
    kitchenMode
  })

  // PHASE 3: Use Firebase data to generate personalized rule-based suggestions
  // with kitchenMode personalization
  const suggestions = generateFirebaseBasedSuggestions(patient, vitals, analysis, kitchenMode)

  logger.info('[AI Shopping] Generated suggestions from Firebase data', {
    count: suggestions.length,
    sampleSuggestions: suggestions.slice(0, 3).map(s => s.productName),
    kitchenMode
  })

  return suggestions
}

/**
 * Build comprehensive Gemini prompt combining Firebase health data
 */
function buildGeminiPrompt(
  patient: ExtendedPatientProfile,
  vitals: any,
  analysis: { needs: HealthSuggestionReason[]; priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'> }
): string {
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null
  const ageCategory = age ? (age < 13 ? 'child' : age < 18 ? 'teen' : age < 65 ? 'adult' : 'senior') : 'adult'

  return `You are a personalized nutrition AI assistant helping a family member with their grocery shopping.

**Patient Context:**
- Age: ${age || 'Not specified'} years old (${ageCategory})
- Gender: ${patient.gender || 'Not specified'}
- Medical Conditions: ${patient.conditions?.join(', ') || 'None reported'}
- Dietary Restrictions: ${patient.dietaryRestrictions?.join(', ') || 'None'}
- Allergies: ${patient.allergies?.join(', ') || 'None'}
- Health Goals: ${(Array.isArray(patient.goals) ? patient.goals.join(', ') : '') || 'General health'}

**Current Health Vitals:**
${vitals.bloodPressure ? `- Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg ${vitals.bloodPressure.isAbnormal ? '(ABNORMAL)' : '(Normal)'}` : ''}
${vitals.bloodGlucose ? `- Blood Glucose: ${vitals.bloodGlucose.value} mg/dL ${vitals.bloodGlucose.isAbnormal ? '(ABNORMAL)' : '(Normal)'}` : ''}
${vitals.weight ? `- Weight: ${vitals.weight.value} ${vitals.weight.unit}` : ''}
${vitals.bmi ? `- BMI: ${vitals.bmi}` : ''}

**Health Needs Identified:**
${Array.from(analysis.needs).map(need => `- ${need} (Priority: ${analysis.priorities.get(need)})`).join('\n')}

**Task:**
Generate 15-20 personalized food and ingredient suggestions to fit this family member's specific health needs.

**Requirements:**
1. Suggest BOTH specific food products AND ingredients (e.g., "Bananas", "Fresh Spinach", "Olive Oil")
2. Prioritize items that address the identified health needs
3. Consider age-appropriate nutrition (child vs adult vs senior)
4. Avoid items that conflict with allergies or dietary restrictions
5. Provide clear benefits for each suggestion
6. Include confidence score (0-100) based on how well the item fits the health profile
7. Categorize items correctly: produce, meat, dairy, seafood, pantry, bakery, etc.

**Also provide:**
- List of items to AVOID based on health conditions (e.g., "High-sodium canned soups" for hypertension)
- Mark severity as "critical", "warning", or "info"

Return structured JSON with suggestions and itemsToAvoid arrays.`
}

/**
 * Generate suggestions based purely on Firebase health data
 * Uses patient vitals, conditions, dietary preferences, and goals
 */
function generateFirebaseBasedSuggestions(
  patient: ExtendedPatientProfile,
  vitals: any,
  analysis: { needs: HealthSuggestionReason[]; priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'> },
  kitchenMode?: 'self' | 'others' | 'shared' | 'i_shop' | 'delivery' | 'meal_kits'
): HealthBasedSuggestion[] {
  const suggestions: HealthBasedSuggestion[] = []

  logger.info('[AI Shopping] Processing health needs', {
    needsCount: analysis.needs.length,
    needs: analysis.needs,
    kitchenMode
  })

  for (const need of analysis.needs) {
    const priority = analysis.priorities.get(need) || 'medium'
    const categorySuggestions = getSuggestionsForNeed(need, patient, vitals, priority, kitchenMode)

    if (categorySuggestions.length === 0) {
      logger.warn('[AI Shopping] No suggestions generated for need', { need, priority })
    }

    logger.info('[AI Shopping] Generated suggestions for need', {
      need,
      priority,
      count: categorySuggestions.length,
      products: categorySuggestions.map(s => s.productName)
    })

    suggestions.push(...categorySuggestions)
  }

  // Fallback: if zero suggestions were generated, ensure we return at least general health suggestions
  if (suggestions.length === 0) {
    logger.error('[AI Shopping] Zero suggestions generated from all needs', undefined, {
      needs: analysis.needs ? String(analysis.needs) : 'none',
      patientId: patient.userId
    })

    // Add general health suggestions as fallback
    const fallbackSuggestions = getSuggestionsForNeed('general_health', patient, vitals, 'low')
    suggestions.push(...fallbackSuggestions)

    logger.info('[AI Shopping] Added fallback general health suggestions', {
      count: fallbackSuggestions.length
    })
  }

  logger.info('[AI Shopping] Total suggestions before filtering', { count: suggestions.length })

  // Filter out unhealthy junk food
  const healthySuggestions = filterUnhealthyFoods(suggestions)

  // SAFETY: drop anything that would expose the patient to one of
  // their allergens. Runs AFTER unhealthy-food filtering so the
  // logging count reflects the real after-state.
  const allergies = getPatientAllergies(patient)
  const safeSuggestions = filterAllergens(healthySuggestions, allergies)

  logger.info('[AI Shopping] Total safe suggestions before limit', { count: safeSuggestions.length })

  return safeSuggestions.slice(0, 20) // Limit to top 20
}

/**
 * Get specific suggestions for a health need
 */
function getSuggestionsForNeed(
  need: HealthSuggestionReason,
  patient: ExtendedPatientProfile,
  vitals: any,
  priority: 'high' | 'medium' | 'low',
  kitchenMode?: 'self' | 'others' | 'shared' | 'i_shop' | 'delivery' | 'meal_kits'
): HealthBasedSuggestion[] {
  let suggestions: HealthBasedSuggestion[] = []

  // PHASE 3: Kitchen Mode Personalization Logic
  const isBulkShopping = kitchenMode === 'i_shop' // Bulk items for main shopper
  const isDeliveryMode = kitchenMode === 'delivery' // Quick, ready-to-eat items
  const isMealKitMode = kitchenMode === 'meal_kits' // Simple ingredients for meal kits
  const preferReadyToEat = isDeliveryMode || kitchenMode === 'others' // Less cooking

  switch (need) {
    case 'high_blood_pressure':
    case 'hypertension':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Bananas',
          category: 'produce',
          reason: need,
          reasonText: 'High in potassium, helps lower blood pressure',
          priority,
          benefits: ['Good for blood pressure', 'High in potassium', 'Low in sodium'],
          triggeredBy: { vitalType: 'blood_pressure', vitalValue: vitals.bloodPressure?.systolic },
          suggestedProducts: ['Bananas', 'Plantains'],
          confidence: 95,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Spinach',
          category: 'produce',
          reason: need,
          reasonText: 'Rich in magnesium and potassium, heart-healthy',
          priority,
          benefits: ['Lowers blood pressure', 'Heart-healthy', 'High in nutrients'],
          suggestedProducts: ['Spinach', 'Kale', 'Swiss Chard'],
          confidence: 90,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Salmon',
          category: 'seafood',
          reason: need,
          reasonText: 'Omega-3 fatty acids support heart health',
          priority,
          benefits: ['Omega-3s', 'Heart-healthy', 'Anti-inflammatory'],
          suggestedProducts: ['Salmon', 'Mackerel', 'Sardines'],
          confidence: 88,
          generatedAt: new Date()
        }
      )
      break

    case 'high_blood_glucose':
    case 'diabetes':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Whole Grain Bread',
          category: 'bakery',
          reason: need,
          reasonText: 'Low glycemic index, helps control blood sugar',
          priority,
          benefits: ['Low GI', 'High fiber', 'Slow-release energy'],
          triggeredBy: { vitalType: 'blood_glucose', vitalValue: vitals.bloodGlucose?.value, condition: 'diabetes' },
          suggestedProducts: ['Whole Grain Bread', 'Whole Wheat Bread', '100% Whole Grain'],
          confidence: 92,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Chicken Breast',
          category: 'meat',
          reason: need,
          reasonText: 'High protein, low carbs, helps stabilize blood sugar',
          priority,
          benefits: ['High protein', 'Low carbs', 'Blood sugar friendly'],
          suggestedProducts: ['Chicken Breast', 'Turkey Breast', 'Lean Chicken'],
          confidence: 90,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Broccoli',
          category: 'produce',
          reason: need,
          reasonText: 'Low-carb vegetable, rich in fiber',
          priority,
          benefits: ['Low carbs', 'High fiber', 'Blood sugar control'],
          suggestedProducts: ['Broccoli', 'Cauliflower', 'Brussels Sprouts'],
          confidence: 87,
          generatedAt: new Date()
        }
      )
      break

    case 'high_cholesterol':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Oatmeal',
          category: 'pantry',
          reason: need,
          reasonText: 'Soluble fiber helps lower cholesterol',
          priority,
          benefits: ['Lowers cholesterol', 'High fiber', 'Heart-healthy'],
          suggestedProducts: ['Oatmeal', 'Steel-Cut Oats', 'Rolled Oats'],
          confidence: 93,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Almonds',
          category: 'pantry',
          reason: need,
          reasonText: 'Healthy fats, helps reduce bad cholesterol',
          priority,
          benefits: ['Healthy fats', 'Lowers LDL', 'Nutrient-dense'],
          suggestedProducts: ['Almonds', 'Walnuts', 'Mixed Nuts'],
          confidence: 89,
          generatedAt: new Date()
        }
      )
      break

    case 'weight_loss':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Greek Yogurt',
          category: 'dairy',
          reason: need,
          reasonText: 'High protein, keeps you full longer',
          priority,
          benefits: ['High protein', 'Low calorie', 'Satisfying'],
          triggeredBy: { goal: 'weight_loss' },
          suggestedProducts: ['Greek Yogurt', 'Plain Greek Yogurt', '0% Fat Greek Yogurt'],
          confidence: 91,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Eggs',
          category: 'eggs',
          reason: need,
          reasonText: 'Protein-rich, low-calorie, nutrient-dense',
          priority,
          benefits: ['High protein', 'Low calorie', 'Nutrient-dense'],
          suggestedProducts: ['Eggs', 'Large Eggs', 'Organic Eggs'],
          confidence: 90,
          generatedAt: new Date()
        }
      )
      break

    case 'celiac':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Gluten-Free Bread',
          category: 'bakery',
          reason: need,
          reasonText: 'Safe for celiac disease, no gluten',
          priority,
          benefits: ['Gluten-free', 'Safe for celiac', 'Certified GF'],
          triggeredBy: { condition: 'celiac' },
          suggestedProducts: ['Gluten-Free Bread', 'GF Whole Grain Bread'],
          confidence: 98,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Rice',
          category: 'pantry',
          reason: need,
          reasonText: 'Naturally gluten-free grain',
          priority,
          benefits: ['Gluten-free', 'Versatile', 'Safe'],
          suggestedProducts: ['White Rice', 'Brown Rice', 'Jasmine Rice'],
          confidence: 97,
          generatedAt: new Date()
        }
      )
      break

    case 'newborn_essentials':
      // Check feeding preference from patient profile
      const feedingPref = (patient as any).feedingPreference || ''
      const needsFormula = feedingPref === 'formula' || feedingPref === 'combination' || !feedingPref
      const needsBreastfeeding = feedingPref === 'breastfeeding' || feedingPref === 'combination' || !feedingPref

      // Core essentials every newborn needs
      suggestions.push(
        {
          id: generateId(),
          productName: 'Diapers (Newborn Size)',
          category: 'baby',
          reason: need,
          reasonText: 'Newborns use 8-12 diapers per day',
          priority: 'high',
          benefits: ['Essential', '8-12/day for newborns', 'Stock up'],
          suggestedProducts: ['Newborn Diapers', 'Size N Diapers', 'Preemie Diapers'],
          confidence: 99,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Baby Wipes',
          category: 'baby',
          reason: need,
          reasonText: 'Gentle, fragrance-free wipes for diaper changes',
          priority: 'high',
          benefits: ['Essential', 'Fragrance-free recommended', 'Sensitive skin safe'],
          suggestedProducts: ['Sensitive Baby Wipes', 'Water Wipes', 'Fragrance-Free Wipes'],
          confidence: 99,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Diaper Rash Cream',
          category: 'baby',
          reason: need,
          reasonText: 'Protects against and treats diaper rash',
          priority: 'high',
          benefits: ['Prevents rash', 'Zinc oxide barrier', 'Soothes skin'],
          suggestedProducts: ['Desitin', 'A&D Ointment', 'Aquaphor Baby'],
          confidence: 95,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Baby Wash & Shampoo',
          category: 'baby',
          reason: need,
          reasonText: 'Gentle, tear-free cleanser for newborn skin',
          priority: 'medium',
          benefits: ['Tear-free', 'Hypoallergenic', 'Gentle on skin'],
          suggestedProducts: ['Johnson\'s Baby Wash', 'Cetaphil Baby', 'Aveeno Baby Wash'],
          confidence: 92,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Baby Thermometer',
          category: 'baby',
          reason: need,
          reasonText: 'Rectal thermometer is most accurate for newborns',
          priority: 'high',
          benefits: ['Accurate readings', 'Essential for fever checks', 'Digital recommended'],
          suggestedProducts: ['Digital Rectal Thermometer', 'Infant Thermometer'],
          confidence: 96,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Swaddle Blankets',
          category: 'baby',
          reason: need,
          reasonText: 'Helps newborns sleep by mimicking womb snugness',
          priority: 'medium',
          benefits: ['Improves sleep', 'Reduces startle reflex', 'Soothes baby'],
          suggestedProducts: ['Muslin Swaddle Blankets', 'Halo SleepSack Swaddle', 'SwaddleMe'],
          confidence: 90,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Onesies / Bodysuits',
          category: 'baby',
          reason: need,
          reasonText: 'Newborns need 4-6 outfit changes per day',
          priority: 'medium',
          benefits: ['Snap closure for easy changes', 'Soft cotton', 'Multiple needed'],
          suggestedProducts: ['Newborn Onesies', 'Short-Sleeve Bodysuits', 'Side-Snap Bodysuits'],
          confidence: 93,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Burp Cloths',
          category: 'baby',
          reason: need,
          reasonText: 'Protects clothing during feeding and burping',
          priority: 'medium',
          benefits: ['Absorbent', 'Multiple needed', 'Protects clothing'],
          suggestedProducts: ['Muslin Burp Cloths', 'Terry Cloth Burp Pads'],
          confidence: 88,
          generatedAt: new Date()
        }
      )

      // Formula-specific items
      if (needsFormula) {
        suggestions.push(
          {
            id: generateId(),
            productName: 'Infant Formula',
            category: 'baby',
            reason: need,
            reasonText: 'Iron-fortified formula recommended for bottle-fed newborns',
            priority: 'high',
            benefits: ['Iron-fortified', 'Complete nutrition', 'Pediatrician-approved'],
            suggestedProducts: ['Enfamil NeuroPro', 'Similac Pro-Advance', 'Kirkland Infant Formula'],
            confidence: 97,
            generatedAt: new Date()
          },
          {
            id: generateId(),
            productName: 'Baby Bottles',
            category: 'baby',
            reason: need,
            reasonText: 'Anti-colic bottles reduce gas and fussiness',
            priority: 'high',
            benefits: ['Anti-colic design', 'Slow-flow nipple for newborns', 'BPA-free'],
            suggestedProducts: ['Dr. Brown\'s Bottles', 'Philips Avent', 'Comotomo Bottles'],
            confidence: 95,
            generatedAt: new Date()
          },
          {
            id: generateId(),
            productName: 'Bottle Brush & Drying Rack',
            category: 'baby',
            reason: need,
            reasonText: 'Proper cleaning prevents bacteria buildup',
            priority: 'medium',
            benefits: ['Hygiene essential', 'Reaches all bottle parts', 'Air-dry rack'],
            suggestedProducts: ['OXO Bottle Brush', 'Boon Grass Drying Rack'],
            confidence: 90,
            generatedAt: new Date()
          }
        )
      }

      // Breastfeeding-specific items
      if (needsBreastfeeding) {
        suggestions.push(
          {
            id: generateId(),
            productName: 'Nursing Pads',
            category: 'baby',
            reason: need,
            reasonText: 'Absorbs leaking breast milk between feedings',
            priority: 'medium',
            benefits: ['Prevents leaks', 'Disposable or reusable', 'Comfort'],
            suggestedProducts: ['Lansinoh Nursing Pads', 'Bamboobies Reusable Pads'],
            confidence: 91,
            generatedAt: new Date()
          },
          {
            id: generateId(),
            productName: 'Nipple Cream',
            category: 'baby',
            reason: need,
            reasonText: 'Soothes and heals sore nipples from breastfeeding',
            priority: 'medium',
            benefits: ['Lanolin-based', 'Safe for baby', 'Heals cracking'],
            suggestedProducts: ['Lansinoh Lanolin', 'Earth Mama Nipple Butter', 'Medela Tender Care'],
            confidence: 89,
            generatedAt: new Date()
          }
        )
      }

      // Preemie-specific items
      if ((patient as any).isPreemie) {
        suggestions.push(
          {
            id: generateId(),
            productName: 'Preemie Diapers',
            category: 'baby',
            reason: need,
            reasonText: 'Smaller size for premature babies under 6 lbs',
            priority: 'high',
            benefits: ['Sized for preemies', 'Extra gentle', 'Umbilical cord cutout'],
            suggestedProducts: ['Pampers Preemie Diapers', 'Huggies Little Snugglers Preemie'],
            confidence: 97,
            generatedAt: new Date()
          },
          {
            id: generateId(),
            productName: 'Preemie Clothing',
            category: 'baby',
            reason: need,
            reasonText: 'Standard newborn sizes are too large for preemies',
            priority: 'medium',
            benefits: ['Fits under 5 lbs', 'NICU-friendly snaps', 'Soft fabric'],
            suggestedProducts: ['Preemie Onesies', 'NICU-Friendly Gowns', 'Preemie Sleepers'],
            confidence: 93,
            generatedAt: new Date()
          }
        )
      }
      break

    case 'child_nutrition':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Milk',
          category: 'dairy',
          reason: need,
          reasonText: 'Calcium and vitamin D for growing bones',
          priority,
          benefits: ['Calcium', 'Vitamin D', 'Supports growth'],
          suggestedProducts: ['Whole Milk', '2% Milk', 'Vitamin D Milk'],
          confidence: 94,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Cheese',
          category: 'dairy',
          reason: need,
          reasonText: 'Calcium for bone development',
          priority,
          benefits: ['Calcium', 'Protein', 'Bone health'],
          suggestedProducts: ['Cheddar Cheese', 'Mozzarella', 'String Cheese'],
          confidence: 90,
          generatedAt: new Date()
        }
      )
      break

    case 'vegetarian':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Tofu',
          category: 'dairy',
          reason: need,
          reasonText: 'Plant-based protein alternative',
          priority,
          benefits: ['Plant protein', 'Versatile', 'Low calorie'],
          suggestedProducts: ['Tofu', 'Extra Firm Tofu', 'Silken Tofu'],
          confidence: 92,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Lentils',
          category: 'pantry',
          reason: need,
          reasonText: 'High protein legume, rich in iron',
          priority,
          benefits: ['Plant protein', 'High fiber', 'Iron-rich'],
          suggestedProducts: ['Red Lentils', 'Green Lentils', 'Brown Lentils'],
          confidence: 90,
          generatedAt: new Date()
        }
      )
      break

    case 'general_health':
      suggestions.push(
        {
          id: generateId(),
          productName: 'Apples',
          category: 'produce',
          reason: need,
          reasonText: 'Rich in fiber and antioxidants',
          priority: 'low',
          benefits: ['High fiber', 'Antioxidants', 'Low calorie'],
          suggestedProducts: ['Apples', 'Gala Apples', 'Honeycrisp Apples'],
          confidence: 85,
          generatedAt: new Date()
        },
        {
          id: generateId(),
          productName: 'Carrots',
          category: 'produce',
          reason: need,
          reasonText: 'High in vitamin A, supports vision',
          priority: 'low',
          benefits: ['Vitamin A', 'Eye health', 'Fiber'],
          suggestedProducts: ['Carrots', 'Baby Carrots', 'Organic Carrots'],
          confidence: 83,
          generatedAt: new Date()
        }
      )
      break
  }

  return suggestions
}

/**
 * Group suggestions by health benefit category
 */
function groupSuggestionsByCategory(suggestions: HealthBasedSuggestion[]): HealthSuggestionsGroup[] {
  const groups = new Map<string, HealthSuggestionsGroup>()

  for (const suggestion of suggestions) {
    let categoryName = ''
    let icon = ''

    switch (suggestion.reason) {
      case 'high_blood_pressure':
      case 'hypertension':
        categoryName = 'For Blood Pressure'
        icon = '💓'
        break
      case 'high_blood_glucose':
      case 'diabetes':
        categoryName = 'For Blood Sugar'
        icon = '🩸'
        break
      case 'high_cholesterol':
        categoryName = 'For Cholesterol'
        icon = '❤️'
        break
      case 'weight_loss':
        categoryName = 'For Weight Loss'
        icon = '⚖️'
        break
      case 'weight_gain':
        categoryName = 'For Weight Gain'
        icon = '💪'
        break
      case 'celiac':
        categoryName = 'Gluten-Free Options'
        icon = '🌾'
        break
      case 'child_nutrition':
        categoryName = 'For Growing Kids'
        icon = '👶'
        break
      case 'vegetarian':
        categoryName = 'Plant-Based Proteins'
        icon = '🌱'
        break
      case 'vegan':
        categoryName = 'Vegan Options'
        icon = '🥕'
        break
      default:
        categoryName = 'Healthy Choices'
        icon = '🥗'
    }

    if (!groups.has(categoryName)) {
      groups.set(categoryName, {
        category: categoryName,
        icon,
        suggestions: [],
        priority: suggestion.priority
      })
    }

    groups.get(categoryName)!.suggestions.push(suggestion)
  }

  return Array.from(groups.values())
}

/**
 * Generate warnings for items to avoid
 */
function generateAvoidanceWarnings(
  patient: ExtendedPatientProfile,
  vitals: any,
  analysis: { needs: HealthSuggestionReason[] }
): Array<{ productName: string; reason: string; severity: 'critical' | 'warning' | 'info' }> {
  const warnings: Array<{ productName: string; reason: string; severity: 'critical' | 'warning' | 'info' }> = []

  // Allergies - CRITICAL. Read from canonical foodAllergies + legacy fields.
  for (const allergy of getPatientAllergies(patient)) {
    warnings.push({
      productName: allergy,
      reason: `Severe allergy risk. Avoid all products containing ${allergy}.`,
      severity: 'critical'
    })
  }

  // Condition-specific warnings
  if (analysis.needs.includes('high_blood_pressure') || analysis.needs.includes('hypertension')) {
    warnings.push({
      productName: 'Processed meats',
      reason: 'High in sodium, can raise blood pressure',
      severity: 'warning'
    })
    warnings.push({
      productName: 'Canned soups',
      reason: 'Very high sodium content',
      severity: 'warning'
    })
  }

  if (analysis.needs.includes('diabetes') || analysis.needs.includes('high_blood_glucose')) {
    warnings.push({
      productName: 'Sugary drinks',
      reason: 'Rapid blood sugar spike',
      severity: 'warning'
    })
    warnings.push({
      productName: 'White bread',
      reason: 'High glycemic index, choose whole grain instead',
      severity: 'info'
    })
  }

  if (analysis.needs.includes('celiac')) {
    warnings.push({
      productName: 'Regular bread',
      reason: 'Contains gluten - unsafe for celiac disease',
      severity: 'critical'
    })
    warnings.push({
      productName: 'Regular pasta',
      reason: 'Contains gluten - choose gluten-free alternatives',
      severity: 'critical'
    })
  }

  return warnings
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

/**
 * Map Gemini category string to ProductCategory
 */
function mapToProductCategory(category: string): ProductCategory {
  const normalized = category.toLowerCase().trim()
  const mapping: Record<string, ProductCategory> = {
    'produce': 'produce',
    'fruit': 'produce',
    'fruits': 'produce',
    'vegetable': 'produce',
    'vegetables': 'produce',
    'meat': 'meat',
    'poultry': 'meat',
    'beef': 'meat',
    'chicken': 'meat',
    'pork': 'meat',
    'dairy': 'dairy',
    'milk': 'dairy',
    'cheese': 'dairy',
    'yogurt': 'dairy',
    'bakery': 'bakery',
    'bread': 'bakery',
    'deli': 'deli',
    'eggs': 'eggs',
    'herbs': 'herbs',
    'spices': 'herbs',
    'seafood': 'seafood',
    'fish': 'seafood',
    'frozen': 'frozen',
    'pantry': 'pantry',
    'grains': 'pantry',
    'canned': 'pantry',
    'beverages': 'beverages',
    'drinks': 'beverages',
    'condiments': 'condiments',
    'sauces': 'condiments'
  }

  return mapping[normalized] || 'other'
}

/**
 * Map Gemini reason string to HealthSuggestionReason
 */
function mapToHealthReason(reason: string): HealthSuggestionReason {
  const normalized = reason.toLowerCase().replace(/[_\s-]/g, '')

  if (normalized.includes('bloodpressure') || normalized.includes('hypertension')) return 'high_blood_pressure'
  if (normalized.includes('glucose') || normalized.includes('diabetes')) return 'diabetes'
  if (normalized.includes('cholesterol')) return 'high_cholesterol'
  if (normalized.includes('underweight')) return 'underweight'
  if (normalized.includes('overweight')) return 'overweight'
  if (normalized.includes('celiac') || normalized.includes('gluten')) return 'celiac'
  if (normalized.includes('heart')) return 'heart_disease'
  if (normalized.includes('anemia')) return 'anemia'
  if (normalized.includes('vegetarian')) return 'vegetarian'
  if (normalized.includes('vegan')) return 'vegan'
  if (normalized.includes('keto')) return 'keto'
  if (normalized.includes('paleo')) return 'paleo'
  if (normalized.includes('child')) return 'child_nutrition'
  if (normalized.includes('senior')) return 'senior_nutrition'
  if (normalized.includes('weightloss')) return 'weight_loss'
  if (normalized.includes('weightgain')) return 'weight_gain'

  return 'general_health'
}

/**
 * Extract triggeredBy metadata from reason and vitals
 */
function extractTriggeredBy(reason: string, vitals: any): HealthBasedSuggestion['triggeredBy'] {
  const normalized = reason.toLowerCase()

  if (normalized.includes('blood pressure') || normalized.includes('hypertension')) {
    return {
      vitalType: 'blood_pressure',
      vitalValue: vitals.bloodPressure?.systolic,
      condition: 'hypertension'
    }
  }

  if (normalized.includes('glucose') || normalized.includes('diabetes')) {
    return {
      vitalType: 'blood_glucose',
      vitalValue: vitals.bloodGlucose?.value,
      condition: 'diabetes'
    }
  }

  if (normalized.includes('weight')) {
    return {
      vitalType: 'weight',
      vitalValue: vitals.weight?.value,
      goal: normalized.includes('loss') ? 'weight_loss' : normalized.includes('gain') ? 'weight_gain' : 'maintain'
    }
  }

  return undefined
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `health-suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Clear suggestions cache (useful when patient data changes)
 */
export function clearSuggestionsCache(patientId?: string): void {
  if (patientId) {
    for (const [key] of suggestionsCache) {
      if (key.startsWith(patientId)) {
        suggestionsCache.delete(key)
      }
    }
  } else {
    suggestionsCache.clear()
  }
}
