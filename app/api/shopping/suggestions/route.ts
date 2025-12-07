/**
 * API Route: Health-Based Shopping Suggestions
 *
 * Server-side endpoint for generating AI-powered shopping suggestions
 * Uses Gemini AI with Firebase health data
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { patientOperations, vitalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import type {
  HealthBasedSuggestion,
  HealthSuggestionReason,
  ProductCategory
} from '@/types/shopping'
import type { PatientProfile } from '@/types/medical'

// Initialize Gemini AI (server-side only)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

/**
 * Gemini AI schema for shopping suggestions
 */
const shoppingSuggestionsSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    suggestions: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          productName: { type: SchemaType.STRING as const },
          category: { type: SchemaType.STRING as const },
          reason: { type: SchemaType.STRING as const },
          reasonText: { type: SchemaType.STRING as const },
          priority: { type: SchemaType.STRING as const },
          benefits: {
            type: SchemaType.ARRAY as const,
            items: { type: SchemaType.STRING as const }
          },
          suggestedProducts: {
            type: SchemaType.ARRAY as const,
            items: { type: SchemaType.STRING as const }
          },
          confidence: { type: SchemaType.NUMBER as const }
        },
        required: ['productName', 'category', 'reason', 'reasonText', 'priority', 'benefits', 'confidence']
      }
    },
    itemsToAvoid: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          productName: { type: SchemaType.STRING as const },
          reason: { type: SchemaType.STRING as const },
          severity: { type: SchemaType.STRING as const }
        },
        required: ['productName', 'reason', 'severity']
      }
    }
  },
  required: ['suggestions']
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, userId } = body

    if (!patientId || !userId) {
      return NextResponse.json(
        { error: 'Missing patientId or userId' },
        { status: 400 }
      )
    }

    logger.info('[AI Shopping API] Generating suggestions', { patientId })

    // Fetch patient data
    const patient = await patientOperations.getPatient(patientId)

    // Fetch latest vitals
    const vitals = await fetchLatestVitals(patientId)

    // Analyze health needs
    const analysis = analyzePatientHealth(patient, vitals)

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(patient, vitals, analysis)

    logger.info('[AI Shopping API] Generated suggestions', { count: suggestions.length })

    return NextResponse.json({
      success: true,
      suggestions,
      healthSummary: {
        latestVitals: vitals.bloodPressure || vitals.bloodGlucose || vitals.weight
          ? vitals
          : undefined,
        conditions: patient.conditions || [],
        dietaryRestrictions: patient.dietaryPreferences?.restrictions || [],
        allergies: patient.dietaryPreferences?.allergies || patient.allergies || [],
        goals: patient.healthGoals ? [patient.healthGoals.weightGoal || 'general_health'] : []
      }
    })
  } catch (error) {
    logger.error('[AI Shopping API] Error', error as Error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Fetch latest vitals for patient
 */
async function fetchLatestVitals(patientId: string): Promise<any> {
  try {
    const vitals = await vitalOperations.getVitals(patientId, { limit: 10 })

    const latest: any = {}

    // Find latest blood pressure
    const latestBP = vitals.find(v => v.type === 'blood_pressure')
    if (latestBP && typeof latestBP.value === 'object' && 'systolic' in latestBP.value) {
      const bpValue = latestBP.value as { systolic: number; diastolic: number }
      latest.bloodPressure = {
        systolic: bpValue.systolic,
        diastolic: bpValue.diastolic,
        isAbnormal: bpValue.systolic > 130 || bpValue.diastolic > 80
      }
    }

    // Find latest blood glucose
    const latestGlucose = vitals.find(v => v.type === 'blood_glucose')
    if (latestGlucose && typeof latestGlucose.value === 'number') {
      latest.bloodGlucose = {
        value: latestGlucose.value,
        isAbnormal: latestGlucose.value > 140 || latestGlucose.value < 70
      }
    }

    // Find latest weight
    const latestWeight = vitals.find(v => v.type === 'weight')
    if (latestWeight && typeof latestWeight.value === 'number') {
      latest.weight = {
        value: latestWeight.value,
        unit: latestWeight.unit || 'lbs'
      }
    }

    // Calculate BMI if we have weight and height
    const latestHeight = vitals.find(v => v.type === 'height')
    if (latestWeight && latestHeight && typeof latestWeight.value === 'number' && typeof latestHeight.value === 'number') {
      const weightKg = latestWeight.unit === 'kg' ? latestWeight.value : latestWeight.value * 0.453592
      const heightM = latestHeight.unit === 'm' ? latestHeight.value : latestHeight.value * 0.0254
      latest.bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10
    }

    return latest
  } catch (error) {
    logger.error('[AI Shopping API] Error fetching vitals', error as Error, { patientId })
    return {}
  }
}

/**
 * Analyze patient health data to identify needs
 */
function analyzePatientHealth(
  patient: PatientProfile,
  vitals: any
): { needs: HealthSuggestionReason[]; priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'> } {
  const needs: HealthSuggestionReason[] = []
  const priorities = new Map<HealthSuggestionReason, 'high' | 'medium' | 'low'>()

  // Check vitals
  if (vitals.bloodPressure?.isAbnormal) {
    needs.push('high_blood_pressure')
    priorities.set('high_blood_pressure', 'high')
  }

  if (vitals.bloodGlucose?.isAbnormal) {
    needs.push('high_blood_glucose')
    priorities.set('high_blood_glucose', 'high')
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
    if (age < 18) {
      needs.push('child_nutrition')
      priorities.set('child_nutrition', 'high')
    }
    if (age >= 65) {
      needs.push('senior_nutrition')
      priorities.set('senior_nutrition', 'medium')
    }
  }

  // Default to general health
  if (needs.length === 0) {
    needs.push('general_health')
    priorities.set('general_health', 'low')
  }

  return { needs, priorities }
}

/**
 * Generate AI-powered suggestions using Gemini
 */
async function generateAISuggestions(
  patient: PatientProfile,
  vitals: any,
  analysis: { needs: HealthSuggestionReason[]; priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'> }
): Promise<HealthBasedSuggestion[]> {
  if (!GEMINI_API_KEY) {
    logger.warn('[AI Shopping API] No Gemini API key, using fallback')
    return []
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: shoppingSuggestionsSchema
      }
    })

    const prompt = buildGeminiPrompt(patient, vitals, analysis)

    logger.info('[AI Shopping API] Calling Gemini AI')
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const aiResponse = JSON.parse(text)

    const suggestions: HealthBasedSuggestion[] = aiResponse.suggestions.map((s: any) => ({
      id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productName: s.productName,
      category: mapToProductCategory(s.category),
      reason: mapToHealthReason(s.reason),
      reasonText: s.reasonText,
      priority: s.priority as 'high' | 'medium' | 'low',
      benefits: s.benefits,
      suggestedProducts: s.suggestedProducts || [s.productName],
      confidence: s.confidence,
      generatedAt: new Date()
    }))

    logger.info('[AI Shopping API] Gemini returned suggestions', { count: suggestions.length })
    return suggestions.slice(0, 20)
  } catch (error) {
    logger.error('[AI Shopping API] Gemini error', error as Error)
    return []
  }
}

/**
 * Build Gemini prompt
 */
function buildGeminiPrompt(
  patient: PatientProfile,
  vitals: any,
  analysis: { needs: HealthSuggestionReason[]; priorities: Map<HealthSuggestionReason, 'high' | 'medium' | 'low'> }
): string {
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null

  return `You are a personalized nutrition AI assistant helping a family member with their grocery shopping.

**Patient Context:**
- Age: ${age || 'Not specified'} years old
- Gender: ${patient.gender || 'Not specified'}
- Medical Conditions: ${patient.conditions?.join(', ') || 'None'}
- Dietary Restrictions: ${patient.dietaryPreferences?.restrictions?.join(', ') || 'None'}
- Allergies: ${patient.dietaryPreferences?.allergies?.join(', ') || patient.allergies?.join(', ') || 'None'}
- Health Goals: ${patient.healthGoals?.weightGoal || 'general health'}

**Current Health Vitals:**
${vitals.bloodPressure ? `- Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg ${vitals.bloodPressure.isAbnormal ? '(ABNORMAL)' : ''}` : ''}
${vitals.bloodGlucose ? `- Blood Glucose: ${vitals.bloodGlucose.value} mg/dL ${vitals.bloodGlucose.isAbnormal ? '(ABNORMAL)' : ''}` : ''}
${vitals.weight ? `- Weight: ${vitals.weight.value} ${vitals.weight.unit}` : ''}
${vitals.bmi ? `- BMI: ${vitals.bmi}` : ''}

**Health Needs Identified:**
${Array.from(analysis.needs).map(need => `- ${need} (Priority: ${analysis.priorities.get(need)})`).join('\n')}

**Task:**
Generate 15-20 personalized food and ingredient suggestions.

**Requirements:**
1. Suggest BOTH products AND ingredients (e.g., "Bananas", "Fresh Spinach", "Olive Oil")
2. Prioritize items addressing the health needs
3. Consider age-appropriate nutrition
4. Avoid allergy conflicts
5. Provide clear benefits
6. Include confidence score (0-100)
7. Categorize correctly: produce, meat, dairy, seafood, pantry, bakery, etc.

Return structured JSON with suggestions and itemsToAvoid arrays.`
}

/**
 * Helper functions
 */
function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  const ageDiff = Date.now() - dob.getTime()
  const ageDate = new Date(ageDiff)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}

function mapToProductCategory(category: string): ProductCategory {
  const normalized = category.toLowerCase().trim()
  const mapping: Record<string, ProductCategory> = {
    'produce': 'produce',
    'fruit': 'produce',
    'vegetable': 'produce',
    'meat': 'meat',
    'dairy': 'dairy',
    'seafood': 'seafood',
    'pantry': 'pantry',
    'bakery': 'bakery',
    'frozen': 'frozen',
    'beverages': 'beverages'
  }
  return mapping[normalized] || 'other'
}

function mapToHealthReason(reason: string): HealthSuggestionReason {
  const normalized = reason.toLowerCase().replace(/[_\s-]/g, '')

  if (normalized.includes('bloodpressure') || normalized.includes('hypertension')) return 'high_blood_pressure'
  if (normalized.includes('glucose') || normalized.includes('diabetes')) return 'diabetes'
  if (normalized.includes('cholesterol')) return 'high_cholesterol'
  if (normalized.includes('weightloss')) return 'weight_loss'
  if (normalized.includes('weightgain')) return 'weight_gain'
  if (normalized.includes('child')) return 'child_nutrition'
  if (normalized.includes('senior')) return 'senior_nutrition'

  return 'general_health'
}
