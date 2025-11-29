/**
 * Medical Recipe Engine
 *
 * Core safety filtering logic for recipe suggestions based on:
 * - Medical conditions (CKD, diabetes, hypertension, cancer, etc.)
 * - Current vitals (blood pressure, blood sugar trends)
 * - Medications and prescribedFor conditions
 * - Lab results and nutrition restrictions
 * - Health questionnaire responses
 *
 * CRITICAL: Recipes must be medically safe BEFORE inventory optimization
 */

import type { MealSuggestion } from './meal-suggestions'
import type { PatientProfile, PatientMedication, VitalSign } from '@/types/medical'
import { logger } from './logger'

// ==================== MEDICAL CONSTRAINTS ====================

export interface MedicalRecipeConstraints {
  // Kidney Disease (CKD)
  sodiumLimitMg?: number // mg/day (typically 1500-2300)
  potassiumLimitMg?: number // mg/day (typically 2000-3000 for advanced CKD)
  phosphorusLimitMg?: number // mg/day (typically <1000 for advanced CKD)
  proteinLimitG?: number // g/day (based on GFR: 0.6-0.8 g/kg)
  fluidLimitMl?: number // mL/day (for dialysis patients)

  // Diabetes
  carbLimitG?: number // g/meal
  sugarLimitG?: number // g/meal
  requiresLowGI?: boolean // Low glycemic index foods
  fiberMinG?: number // Minimum fiber for blood sugar control

  // Hypertension / Heart Disease
  saturatedFatLimitG?: number // g/day
  cholesterolLimitMg?: number // mg/day
  transFatLimitG?: number // g/day (should be 0)

  // Cancer Treatment
  requiresSoftFoods?: boolean // Easy to chew/swallow
  avoidStrongFlavors?: boolean // For taste changes
  requiresHighCalorie?: boolean // Prevent weight loss
  requiresHighProtein?: boolean // Muscle preservation
  avoidRawFoods?: boolean // Immunocompromised
  metalTasteWorkarounds?: boolean // Use plastic utensils, citrus

  // Allergies & Intolerances
  allergens: string[] // dairy, gluten, nuts, shellfish, soy, eggs, fish

  // Weight Management
  calorieTarget?: number // Daily calorie goal
  requiresWeightLoss?: boolean // BMI > 25
  requiresWeightGain?: boolean // Underweight

  // Vitals-Based
  requiresBloodSugarControl?: boolean // Recent high readings
  requiresBPControl?: boolean // Elevated blood pressure
  requiresCholesterolControl?: boolean // High LDL
}

export interface MedicalRecipeSafetyResult {
  isSafe: boolean
  warnings: string[]
  violations: string[]
  score: number // 0-100, higher is safer
  badges: RecipeSafetyBadge[]
}

export interface RecipeSafetyBadge {
  type: 'safe' | 'warning' | 'danger' | 'info'
  label: string
  tooltip: string
}

// ==================== CONSTRAINT BUILDING ====================

/**
 * Build medical constraints from patient health profile
 */
export function buildMedicalConstraints(
  patient: PatientProfile,
  medications: PatientMedication[],
  recentVitals: VitalSign[],
  questionnaireResponses?: Record<string, any>
): MedicalRecipeConstraints {
  const constraints: MedicalRecipeConstraints = {
    allergens: []
  }

  // Extract conditions from patient profile
  // Note: healthConditions not in PatientProfile type - would need to fetch separately
  const conditions: string[] = [] // TODO: Fetch conditions from separate collection

  // Process each condition
  conditions.forEach((condition: string) => {
    switch (condition) {
      case 'kidney-disease-ckd':
        applyCKDConstraints(constraints, questionnaireResponses)
        break
      case 'diabetes-type-1':
      case 'diabetes-type-2':
      case 'pre-diabetes':
        applyDiabetesConstraints(constraints, questionnaireResponses, recentVitals)
        break
      case 'hypertension-high-blood-pressure':
      case 'heart-disease':
        applyHeartConstraints(constraints, recentVitals)
        break
      case 'cancer-active-or-recent-treatment':
        applyCancerConstraints(constraints, questionnaireResponses)
        break
      case 'high-cholesterol':
        applyCholesterolConstraints(constraints, recentVitals)
        break
    }
  })

  // Extract conditions from medications (prescribedFor)
  medications.forEach(med => {
    if (med.prescribedFor) {
      // Infer constraints from medication indications
      inferConstraintsFromMedication(constraints, med)
    }
  })

  // Weight management from patient goals
  if (patient.goals?.targetWeight && patient.goals?.startWeight) {
    const needsWeightLoss = patient.goals.startWeight > patient.goals.targetWeight
    const needsWeightGain = patient.goals.startWeight < patient.goals.targetWeight

    constraints.requiresWeightLoss = needsWeightLoss
    constraints.requiresWeightGain = needsWeightGain

    if (patient.goals.dailyCalorieGoal) {
      constraints.calorieTarget = patient.goals.dailyCalorieGoal
    }
  }

  logger.debug('[Medical Recipe Engine] Built constraints', {
    patientId: patient.id,
    conditions: conditions.length,
    medications: medications.length,
    constraints
  })

  return constraints
}

/**
 * Apply CKD-specific constraints from questionnaire
 */
function applyCKDConstraints(
  constraints: MedicalRecipeConstraints,
  responses?: Record<string, any>
) {
  if (!responses) {
    // Default conservative limits for CKD
    constraints.sodiumLimitMg = 1500
    constraints.potassiumLimitMg = 2000
    constraints.phosphorusLimitMg = 1000
    constraints.proteinLimitG = 50 // Conservative default
    return
  }

  // Use questionnaire responses for precise limits
  if (responses.ckd_sodium_limit) {
    constraints.sodiumLimitMg = responses.ckd_sodium_limit
  } else {
    constraints.sodiumLimitMg = 1500 // Default for CKD
  }

  if (responses.ckd_potassium_limit) {
    constraints.potassiumLimitMg = responses.ckd_potassium_limit
  } else if (responses.ckd_stage === 'stage-4' || responses.ckd_stage === 'stage-5') {
    constraints.potassiumLimitMg = 2000 // Advanced CKD
  }

  if (responses.ckd_phosphorus_restriction === 'yes') {
    constraints.phosphorusLimitMg = 1000
  }

  if (responses.ckd_on_dialysis !== 'no') {
    constraints.proteinLimitG = 84 // 1.2 g/kg for 70kg person on dialysis
    constraints.fluidLimitMl = 1000 // Strict fluid restriction
  } else if (responses.ckd_gfr && responses.ckd_gfr < 60) {
    // Calculate protein based on GFR
    constraints.proteinLimitG = 56 // 0.8 g/kg for 70kg person
  }
}

/**
 * Apply diabetes constraints
 */
function applyDiabetesConstraints(
  constraints: MedicalRecipeConstraints,
  responses?: Record<string, any>,
  vitals?: VitalSign[]
) {
  constraints.requiresLowGI = true
  constraints.carbLimitG = 45 // Per meal
  constraints.sugarLimitG = 15 // Per meal
  constraints.fiberMinG = 5 // Per meal

  // Check recent blood sugar vitals
  if (vitals) {
    const recentBloodSugar = vitals
      .filter(v => v.type === 'blood_sugar')
      .slice(0, 5) // Last 5 readings

    const avgBloodSugar = recentBloodSugar.reduce((sum, v) =>
      sum + (typeof v.value === 'number' ? v.value : 0), 0
    ) / (recentBloodSugar.length || 1)

    if (avgBloodSugar > 140) {
      // Tighter control needed
      constraints.requiresBloodSugarControl = true
      constraints.carbLimitG = 30 // Stricter limit
      constraints.sugarLimitG = 10
    }
  }
}

/**
 * Apply hypertension/heart disease constraints
 */
function applyHeartConstraints(
  constraints: MedicalRecipeConstraints,
  vitals?: VitalSign[]
) {
  constraints.sodiumLimitMg = Math.min(constraints.sodiumLimitMg || 1500, 1500)
  constraints.saturatedFatLimitG = 13 // <7% of 2000 cal diet
  constraints.cholesterolLimitMg = 200
  constraints.transFatLimitG = 0

  // Check recent BP vitals
  if (vitals) {
    const recentBP = vitals
      .filter(v => v.type === 'blood_pressure')
      .slice(0, 5)

    const hasElevatedBP = recentBP.some(v => {
      if (typeof v.value === 'object' && 'systolic' in v.value) {
        return v.value.systolic >= 140 || v.value.diastolic >= 90
      }
      return false
    })

    if (hasElevatedBP) {
      constraints.requiresBPControl = true
      constraints.sodiumLimitMg = 1200 // Extra strict
    }
  }
}

/**
 * Apply cancer treatment constraints
 */
function applyCancerConstraints(
  constraints: MedicalRecipeConstraints,
  responses?: Record<string, any>
) {
  if (!responses) {
    // Conservative defaults
    constraints.requiresSoftFoods = true
    constraints.avoidStrongFlavors = true
    return
  }

  // Active treatment requires special considerations
  if (responses.cancer_treatment_status?.includes('active')) {
    constraints.avoidRawFoods = true // Immunocompromised
  }

  // Poor appetite requires calorie-dense foods
  if (responses.cancer_appetite === 'very-poor' || responses.cancer_appetite === 'no-appetite') {
    constraints.requiresHighCalorie = true
    constraints.requiresSoftFoods = true
  }

  // Nausea requires bland foods
  if (responses.cancer_nausea === 'frequent' || responses.cancer_nausea === 'severe') {
    constraints.avoidStrongFlavors = true
    constraints.requiresSoftFoods = true
  }

  // Taste changes
  if (responses.cancer_taste_changes?.includes('metallic-taste')) {
    constraints.metalTasteWorkarounds = true
  }

  // Weight loss requires high protein/calorie
  if (responses.cancer_weight_loss === 'moderate' || responses.cancer_weight_loss === 'severe') {
    constraints.requiresHighProtein = true
    constraints.requiresHighCalorie = true
  }
}

/**
 * Apply cholesterol constraints
 */
function applyCholesterolConstraints(
  constraints: MedicalRecipeConstraints,
  vitals?: VitalSign[]
) {
  constraints.saturatedFatLimitG = Math.min(constraints.saturatedFatLimitG || 13, 13)
  constraints.cholesterolLimitMg = Math.min(constraints.cholesterolLimitMg || 200, 200)
  constraints.transFatLimitG = 0
  constraints.requiresCholesterolControl = true
}

/**
 * Infer constraints from medication indication
 */
function inferConstraintsFromMedication(
  constraints: MedicalRecipeConstraints,
  medication: PatientMedication
) {
  const condition = medication.prescribedFor?.toLowerCase() || ''

  if (condition.includes('diabetes')) {
    constraints.requiresLowGI = true
  }

  if (condition.includes('hypertension') || condition.includes('blood pressure')) {
    constraints.sodiumLimitMg = Math.min(constraints.sodiumLimitMg || 1500, 1500)
    constraints.requiresBPControl = true
  }

  if (condition.includes('cholesterol')) {
    constraints.saturatedFatLimitG = Math.min(constraints.saturatedFatLimitG || 13, 13)
    constraints.requiresCholesterolControl = true
  }

  if (condition.includes('kidney')) {
    constraints.sodiumLimitMg = Math.min(constraints.sodiumLimitMg || 1500, 1500)
  }
}

// ==================== RECIPE SAFETY EVALUATION ====================

/**
 * Evaluate recipe safety against medical constraints
 */
export function evaluateRecipeSafety(
  recipe: MealSuggestion,
  constraints: MedicalRecipeConstraints
): MedicalRecipeSafetyResult {
  const warnings: string[] = []
  const violations: string[] = []
  const badges: RecipeSafetyBadge[] = []
  let score = 100

  // Check allergens (CRITICAL - immediate violation)
  if (constraints.allergens.length > 0) {
    const hasAllergen = recipe.allergens.some(a => constraints.allergens.includes(a))
    if (hasAllergen) {
      violations.push(`Contains allergen: ${recipe.allergens.filter(a => constraints.allergens.includes(a)).join(', ')}`)
      score = 0
      return { isSafe: false, warnings, violations, score, badges }
    }
  }

  // Sodium check (CRITICAL for CKD/hypertension)
  if (constraints.sodiumLimitMg) {
    const sodiumPerMeal = constraints.sodiumLimitMg / 3 // Divide daily limit by 3 meals
    const recipeSodium = recipe.macros.sodium || 0

    if (recipeSodium > sodiumPerMeal) {
      violations.push(`Sodium: ${recipeSodium}mg exceeds your limit of ${Math.round(sodiumPerMeal)}mg per meal`)
      score -= 40
    } else if (recipeSodium > sodiumPerMeal * 0.8) {
      warnings.push(`High sodium: ${recipeSodium}mg (80% of your limit)`)
      score -= 15
      badges.push({
        type: 'warning',
        label: 'High Sodium',
        tooltip: `${recipeSodium}mg sodium (limit: ${Math.round(sodiumPerMeal)}mg/meal)`
      })
    } else {
      badges.push({
        type: 'safe',
        label: 'Low Sodium',
        tooltip: `${recipeSodium}mg sodium - safe for your limit`
      })
    }
  }

  // Potassium check (CRITICAL for advanced CKD)
  if (constraints.potassiumLimitMg && recipe.macros.potassium) {
    const potassiumPerMeal = constraints.potassiumLimitMg / 3
    const recipePotassium = recipe.macros.potassium

    if (recipePotassium > potassiumPerMeal) {
      violations.push(`Potassium: ${recipePotassium}mg exceeds your limit of ${Math.round(potassiumPerMeal)}mg per meal`)
      score -= 40
    } else if (recipePotassium > potassiumPerMeal * 0.8) {
      warnings.push(`High potassium: ${recipePotassium}mg`)
      score -= 10
    }
  }

  // Phosphorus check (for advanced CKD)
  if (constraints.phosphorusLimitMg && recipe.macros.potassium) {
    const phosphorusPerMeal = constraints.phosphorusLimitMg / 3
    const recipePhosphorus = recipe.macros.potassium // Note: Most recipes don't track phosphorus separately

    if (recipePhosphorus > phosphorusPerMeal) {
      warnings.push(`May be high in phosphorus - take binder with meal`)
      score -= 5
    }
  }

  // Carb/sugar check (for diabetes)
  if (constraints.carbLimitG) {
    const recipeCarbs = recipe.macros.carbs

    if (recipeCarbs > constraints.carbLimitG) {
      violations.push(`Carbs: ${recipeCarbs}g exceeds your limit of ${constraints.carbLimitG}g per meal`)
      score -= 30
    } else if (recipeCarbs < constraints.carbLimitG * 0.7) {
      badges.push({
        type: 'safe',
        label: 'Low Carb',
        tooltip: `${recipeCarbs}g carbs - good for blood sugar control`
      })
    }
  }

  if (constraints.sugarLimitG && recipe.macros.sugars) {
    if (recipe.macros.sugars > constraints.sugarLimitG) {
      violations.push(`Sugar: ${recipe.macros.sugars}g exceeds limit of ${constraints.sugarLimitG}g`)
      score -= 25
    }
  }

  if (constraints.requiresLowGI) {
    // Heuristic: High sugar or refined carbs = high GI
    const hasHighGI = (recipe.macros.sugars || 0) > 20 ||
      recipe.ingredients.some(i =>
        i.toLowerCase().includes('white rice') ||
        i.toLowerCase().includes('white bread') ||
        i.toLowerCase().includes('sugar')
      )

    if (hasHighGI) {
      warnings.push('May have high glycemic index - could spike blood sugar')
      score -= 15
    } else {
      badges.push({
        type: 'safe',
        label: 'Diabetes-Friendly',
        tooltip: 'Low glycemic index - won\'t spike blood sugar'
      })
    }
  }

  // Saturated fat check (heart disease)
  if (constraints.saturatedFatLimitG && recipe.macros.saturatedFat) {
    const satFatPerMeal = constraints.saturatedFatLimitG / 3
    if (recipe.macros.saturatedFat > satFatPerMeal) {
      violations.push(`Saturated fat: ${recipe.macros.saturatedFat}g exceeds limit`)
      score -= 20
    }
  }

  // Calorie check (weight management)
  if (constraints.calorieTarget) {
    const caloriePerMeal = constraints.calorieTarget / 3
    const recipeCalories = recipe.calories

    if (constraints.requiresWeightLoss && recipeCalories > caloriePerMeal * 1.2) {
      warnings.push(`High calorie: ${recipeCalories} cal (target: ${Math.round(caloriePerMeal)} cal/meal)`)
      score -= 10
    } else if (constraints.requiresWeightGain && recipeCalories < caloriePerMeal * 0.8) {
      warnings.push('Low calorie - may not support weight gain goals')
      score -= 5
    }
  }

  // Cancer treatment considerations
  if (constraints.requiresSoftFoods && recipe.requiresCooking) {
    const hasCrunchyFoods = recipe.ingredients.some(i =>
      i.toLowerCase().includes('crispy') ||
      i.toLowerCase().includes('crunchy') ||
      i.toLowerCase().includes('raw')
    )
    if (hasCrunchyFoods) {
      warnings.push('May be difficult to chew - consider softer alternatives')
      score -= 10
    }
  }

  if (constraints.avoidRawFoods) {
    const hasRawFoods = recipe.ingredients.some(i =>
      i.toLowerCase().includes('raw') ||
      i.toLowerCase().includes('fresh salad')
    )
    if (hasRawFoods) {
      violations.push('Contains raw foods - not safe for immunocompromised')
      score -= 30
    }
  }

  // Determine overall safety
  const isSafe = violations.length === 0 && score >= 60

  // Add condition-specific badges
  if (isSafe) {
    if (constraints.sodiumLimitMg && constraints.potassiumLimitMg) {
      badges.push({
        type: 'safe',
        label: '✓ CKD-Safe',
        tooltip: 'Safe sodium and potassium levels for kidney disease'
      })
    }
    if (constraints.requiresLowGI) {
      badges.push({
        type: 'safe',
        label: '✓ Diabetes-Friendly',
        tooltip: 'Low glycemic index and controlled carbs'
      })
    }
  }

  return { isSafe, warnings, violations, score: Math.max(0, score), badges }
}

/**
 * Filter recipes to only safe options
 */
export function filterSafeRecipes(
  recipes: MealSuggestion[],
  constraints: MedicalRecipeConstraints
): Array<MealSuggestion & { safetyResult: MedicalRecipeSafetyResult }> {
  return recipes
    .map(recipe => ({
      ...recipe,
      safetyResult: evaluateRecipeSafety(recipe, constraints)
    }))
    .filter(r => r.safetyResult.isSafe)
    .sort((a, b) => b.safetyResult.score - a.safetyResult.score)
}
