/**
 * Health & Fitness Calculation Utilities
 * Formulas for BMR, TDEE, weight projections, and nutritional targets
 */

export type ActivityLevel = 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active'
export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say'
export type Units = 'metric' | 'imperial'

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * Most accurate for general population
 */
export function calculateBMR(params: {
  weight: number // kg or lbs
  height: number // cm or inches
  age: number
  gender: Gender
  units: Units
}): number {
  const { weight, height, age, gender, units } = params

  // Convert to metric if needed
  const weightKg = units === 'imperial' ? weight * 0.453592 : weight
  const heightCm = units === 'imperial' ? height * 2.54 : height

  // Mifflin-St Jeor Equation
  // Men: BMR = 10W + 6.25H - 5A + 5
  // Women: BMR = 10W + 6.25H - 5A - 161
  // Other/prefer-not-to-say: Use average

  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age)

  if (gender === 'male') {
    return Math.round(baseBMR + 5)
  } else if (gender === 'female') {
    return Math.round(baseBMR - 161)
  } else {
    // Average of male and female for other/prefer-not-to-say
    return Math.round(baseBMR - 78)
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * BMR multiplied by activity level
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    'sedentary': 1.2,           // Little to no exercise
    'lightly-active': 1.375,    // 1-3 days/week
    'moderately-active': 1.55,  // 3-5 days/week
    'very-active': 1.725,       // 6-7 days/week
    'extremely-active': 1.9     // Athlete level
  }

  return Math.round(bmr * multipliers[activityLevel])
}

/**
 * Calculate daily calorie target based on weight loss goal
 */
export function calculateCalorieTarget(params: {
  tdee: number
  weeklyWeightLossGoal: number // lbs per week (0.5-2 recommended)
  units: Units
}): number {
  const { tdee, weeklyWeightLossGoal, units } = params

  // 1 lb fat = ~3500 calories
  // Weekly deficit = weeklyWeightLossGoal * 3500
  // Daily deficit = weekly / 7

  const weeklyDeficit = weeklyWeightLossGoal * 3500
  const dailyDeficit = weeklyDeficit / 7

  const target = tdee - dailyDeficit

  // Safety limits: Never go below 1200 calories (women) or 1500 (men)
  // Use 1200 as conservative minimum
  return Math.max(1200, Math.round(target))
}

/**
 * Calculate macro targets in grams
 */
export function calculateMacroTargets(params: {
  dailyCalories: number
  proteinPercent: number // 20-35%
  carbsPercent: number   // 45-65%
  fatPercent: number     // 20-35%
}): {
  protein: number // grams
  carbs: number   // grams
  fat: number     // grams
} {
  const { dailyCalories, proteinPercent, carbsPercent, fatPercent } = params

  // Calories per gram: Protein=4, Carbs=4, Fat=9
  return {
    protein: Math.round((dailyCalories * proteinPercent / 100) / 4),
    carbs: Math.round((dailyCalories * carbsPercent / 100) / 4),
    fat: Math.round((dailyCalories * fatPercent / 100) / 9)
  }
}

/**
 * Project weight loss over time
 */
export function projectWeightLoss(params: {
  startWeight: number
  targetWeight: number
  weeklyWeightLossGoal: number
  units: Units
}): {
  estimatedWeeks: number
  estimatedDate: Date
  weeklyProjection: Array<{ week: number; weight: number; date: Date }>
} {
  const { startWeight, targetWeight, weeklyWeightLossGoal } = params

  const totalWeightToLose = startWeight - targetWeight
  const estimatedWeeks = Math.ceil(totalWeightToLose / weeklyWeightLossGoal)

  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + (estimatedWeeks * 7))

  // Generate weekly projection
  const weeklyProjection = []
  for (let week = 0; week <= estimatedWeeks; week++) {
    const projectedWeight = startWeight - (week * weeklyWeightLossGoal)
    const weekDate = new Date()
    weekDate.setDate(weekDate.getDate() + (week * 7))

    weeklyProjection.push({
      week,
      weight: Math.max(targetWeight, Number(projectedWeight.toFixed(1))),
      date: weekDate
    })
  }

  return {
    estimatedWeeks,
    estimatedDate,
    weeklyProjection
  }
}

/**
 * Calculate Body Mass Index (BMI)
 */
export function calculateBMI(params: {
  weight: number
  height: number
  units: Units
}): {
  bmi: number
  category: 'underweight' | 'normal' | 'overweight' | 'obese'
} {
  const { weight, height, units } = params

  let bmi: number
  if (units === 'metric') {
    // BMI = weight (kg) / (height (m))^2
    const heightM = height / 100
    bmi = weight / (heightM * heightM)
  } else {
    // BMI = (weight (lbs) / (height (in))^2) * 703
    bmi = (weight / (height * height)) * 703
  }

  bmi = Number(bmi.toFixed(1))

  let category: 'underweight' | 'normal' | 'overweight' | 'obese'
  if (bmi < 18.5) category = 'underweight'
  else if (bmi < 25) category = 'normal'
  else if (bmi < 30) category = 'overweight'
  else category = 'obese'

  return { bmi, category }
}

/**
 * Calculate recommended daily water intake (in oz or ml)
 */
export function calculateWaterIntake(params: {
  weight: number
  activityLevel: ActivityLevel
  units: Units
}): number {
  const { weight, activityLevel, units } = params

  // Basic rule: 0.5-1 oz per lb (or ~30-40ml per kg)
  const weightLbs = units === 'imperial' ? weight : weight * 2.20462

  let baseOz = weightLbs * 0.67 // Base: 2/3 oz per lb

  // Add for activity level
  const activityBonus: Record<ActivityLevel, number> = {
    'sedentary': 0,
    'lightly-active': 8,
    'moderately-active': 16,
    'very-active': 24,
    'extremely-active': 32
  }

  const totalOz = baseOz + activityBonus[activityLevel]

  return units === 'metric'
    ? Math.round(totalOz * 29.5735) // Convert to ml
    : Math.round(totalOz)
}

/**
 * Get recommended macro split based on goal
 */
export function getRecommendedMacros(goal: 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'): {
  protein: number
  carbs: number
  fat: number
} {
  const macroSplits = {
    'lose-weight': { protein: 30, carbs: 40, fat: 30 },       // Higher protein, moderate carbs
    'maintain-weight': { protein: 25, carbs: 45, fat: 30 },    // Balanced
    'gain-muscle': { protein: 35, carbs: 40, fat: 25 },       // High protein
    'improve-health': { protein: 25, carbs: 45, fat: 30 }      // Balanced
  }

  return macroSplits[goal]
}

/**
 * Calculate deficit/surplus needed for goal
 */
export function calculateCaloricAdjustment(params: {
  currentWeight: number
  targetWeight: number
  weeklyGoal: number // positive for loss, negative for gain
  units: Units
}): {
  weeklyDeficit: number
  dailyDeficit: number
  isDeficit: boolean
} {
  const { weeklyGoal } = params

  const weeklyDeficit = weeklyGoal * 3500
  const dailyDeficit = weeklyDeficit / 7

  return {
    weeklyDeficit: Math.abs(weeklyDeficit),
    dailyDeficit: Math.abs(dailyDeficit),
    isDeficit: weeklyGoal > 0 // True if losing weight
  }
}

/**
 * Get health risk profile based on BMI and demographics
 * Returns likely health conditions to pre-select for accountability
 */
export function getHealthRiskProfile(params: {
  bmi: number
  gender: Gender
  age: number
}): {
  riskLevel: 'low' | 'moderate' | 'high' | 'severe'
  bmiCategory: string
  likelyConditions: string[]
  otherConditions: string[]
  warnings: string[]
} {
  const { bmi, gender, age } = params

  const allConditions = [
    'Type 2 Diabetes',
    'Type 1 Diabetes',
    'High Blood Pressure',
    'High Cholesterol',
    'Heart Disease',
    'PCOS',
    'Thyroid Issues',
    'Kidney Disease',
    'Pregnancy/Nursing',
    'Eating Disorder History'
  ]

  const likelyConditions: string[] = []
  const warnings: string[] = []
  let riskLevel: 'low' | 'moderate' | 'high' | 'severe' = 'low'
  let bmiCategory = ''

  // Categorize BMI
  if (bmi < 18.5) {
    bmiCategory = 'Underweight'
    riskLevel = 'moderate'
    warnings.push('Underweight status increases risk of nutrient deficiencies and bone loss')
  } else if (bmi < 25) {
    bmiCategory = 'Normal Weight'
    riskLevel = 'low'
  } else if (bmi < 30) {
    bmiCategory = 'Overweight'
    riskLevel = 'moderate'
    likelyConditions.push('High Blood Pressure', 'High Cholesterol')
    warnings.push('Overweight status (BMI 25-29.9) increases cardiovascular disease risk by 30-40%')
  } else if (bmi < 35) {
    bmiCategory = 'Class I Obesity'
    riskLevel = 'high'
    likelyConditions.push('High Blood Pressure', 'High Cholesterol', 'Type 2 Diabetes')
    warnings.push('Class I Obesity (BMI 30-34.9) significantly increases risk of chronic disease')
    warnings.push('~50% of people at this BMI have high blood pressure')
  } else if (bmi < 40) {
    bmiCategory = 'Class II Obesity'
    riskLevel = 'high'
    likelyConditions.push('High Blood Pressure', 'High Cholesterol', 'Type 2 Diabetes', 'Thyroid Issues')
    if (gender === 'female') {
      likelyConditions.push('PCOS')
    }
    warnings.push('Class II Obesity (BMI 35-39.9) requires medical supervision for safe weight loss')
    warnings.push('~65% of people at this BMI have type 2 diabetes')
  } else {
    bmiCategory = 'Class III Obesity'
    riskLevel = 'severe'
    likelyConditions.push('High Blood Pressure', 'High Cholesterol', 'Type 2 Diabetes', 'Thyroid Issues', 'Heart Disease')
    if (gender === 'female') {
      likelyConditions.push('PCOS')
    }
    warnings.push('Class III Obesity (BMI ≥40) requires immediate medical supervision')
    warnings.push('~75% of people at this BMI have multiple chronic conditions')
    warnings.push('Please consult with a healthcare provider before starting any weight loss program')
  }

  // Filter out likely conditions from the full list
  const otherConditions = allConditions.filter(c => !likelyConditions.includes(c))

  return {
    riskLevel,
    bmiCategory,
    likelyConditions,
    otherConditions,
    warnings
  }
}

/**
 * Calculate lifestyle impact on metabolism and calorie needs
 */
export function calculateLifestyleImpact(params: {
  baseTDEE: number
  smoking: 'never' | 'quit-recent' | 'quit-old' | 'current-light' | 'current-heavy'
  weeklyDrinks: number
}): {
  adjustedTDEE: number
  smokingAdjustment: number
  alcoholCaloriesPerDay: number
  warnings: string[]
} {
  const { baseTDEE, smoking, weeklyDrinks } = params
  const warnings: string[] = []
  let smokingAdjustment = 0

  // Smoking impact on metabolism
  if (smoking === 'current-light') {
    smokingAdjustment = 200
    warnings.push('Smoking increases metabolism by ~200 cal/day. If you quit, expect 5-8 lb weight gain.')
  } else if (smoking === 'current-heavy') {
    smokingAdjustment = 300
    warnings.push('Heavy smoking increases metabolism by ~300 cal/day. Quitting will slow metabolism significantly.')
  } else if (smoking === 'quit-recent') {
    smokingAdjustment = -200
    warnings.push('Recent smoking cessation has lowered your metabolism by ~200 cal/day compared to when smoking.')
  }

  const adjustedTDEE = baseTDEE + smokingAdjustment

  // Alcohol calories (not typically tracked in meals)
  const alcoholCaloriesPerDay = (weeklyDrinks * 150) / 7

  if (weeklyDrinks > 0) {
    warnings.push(
      `Alcohol consumption adds ~${Math.round(alcoholCaloriesPerDay)} hidden calories per day (${weeklyDrinks} drinks/week × 150 cal)`
    )
  }

  if (weeklyDrinks > 14) {
    warnings.push('Heavy alcohol use (>14 drinks/week) inhibits fat burning and may require medical attention.')
  }

  return {
    adjustedTDEE,
    smokingAdjustment,
    alcoholCaloriesPerDay,
    warnings
  }
}

/**
 * Auto-calculate optimal weight loss targets (Expert-Prescription Model)
 * Removes user control to prevent unrealistic goals and ensure safe, evidence-based targets
 */
export function calculateOptimalTargets(params: {
  currentWeight: number
  height: number
  age: number
  gender: Gender
  activityLevel: ActivityLevel
  primaryGoal: 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'
  healthConditions?: string[]
  units: Units
}): {
  targetWeight: number
  weeklyWeightLossGoal: number
  dailySteps: number
  reasoning: {
    targetWeightReason: string
    weeklyGoalReason: string
    stepsReason: string
  }
} {
  const { currentWeight, height, age, gender, activityLevel, primaryGoal, healthConditions = [], units } = params

  // Calculate current BMI
  const { bmi, category } = calculateBMI({ weight: currentWeight, height, units })

  // 1. AUTO-CALCULATE TARGET WEIGHT
  let targetWeight: number
  let targetWeightReason: string

  if (category === 'obese' || category === 'overweight') {
    // Goal: Reach healthy BMI (24.9) - upper end of normal range
    if (units === 'imperial') {
      // BMI = (weight (lbs) / (height (in))^2) * 703
      // Solve for weight: weight = (BMI * height^2) / 703
      targetWeight = Math.round((24.9 * height * height) / 703)
    } else {
      // BMI = weight (kg) / (height (m))^2
      // Solve for weight: weight = BMI * height^2
      const heightM = height / 100
      targetWeight = Math.round(24.9 * heightM * heightM)
    }
    targetWeightReason = `Based on your current BMI of ${bmi} (${category}), your target weight is set to achieve a healthy BMI of 24.9.`
  } else if (category === 'normal') {
    // Maintain or slight improvement for body composition
    const improvementTarget = currentWeight * 0.95 // 5% reduction for body composition
    targetWeight = Math.round(improvementTarget)
    targetWeightReason = `Your BMI (${bmi}) is already in the healthy range. Target is set for body composition improvement.`
  } else {
    // Underweight - maintain or gain
    targetWeight = Math.round(currentWeight * 1.05)
    targetWeightReason = `Your BMI (${bmi}) indicates you're underweight. Target is set to reach a healthier weight.`
  }

  // 2. AUTO-CALCULATE WEEKLY WEIGHT LOSS GOAL
  let weeklyWeightLossGoal: number
  let weeklyGoalReason: string

  if (primaryGoal === 'lose-weight' && (category === 'obese' || category === 'overweight')) {
    // Base rate on BMI category
    let baseRate = 1.0 // Default: 1 lb/week

    if (bmi >= 40) {
      // Class III Obesity: Can safely lose 2 lbs/week initially
      baseRate = 2.0
    } else if (bmi >= 35) {
      // Class II Obesity: 1.5-2 lbs/week
      baseRate = 1.5
    } else if (bmi >= 30) {
      // Class I Obesity: 1-1.5 lbs/week
      baseRate = 1.25
    } else if (bmi >= 25) {
      // Overweight: 0.5-1 lb/week
      baseRate = 0.75
    }

    // Adjust for age (older = slower is safer)
    if (age >= 60) {
      baseRate *= 0.75
      weeklyGoalReason = `Set to ${baseRate.toFixed(1)} lbs/week based on your BMI (${bmi}), adjusted slower for age 60+.`
    } else if (age >= 50) {
      baseRate *= 0.85
      weeklyGoalReason = `Set to ${baseRate.toFixed(1)} lbs/week based on your BMI (${bmi}), adjusted for age 50+.`
    } else {
      weeklyGoalReason = `Set to ${baseRate.toFixed(1)} lbs/week based on your BMI category (${category}).`
    }

    // Adjust for high-risk health conditions (slower is safer)
    const highRiskConditions = ['Type 2 Diabetes', 'Type 1 Diabetes', 'Heart Disease', 'Kidney Disease']
    const hasHighRiskCondition = healthConditions.some(c => highRiskConditions.includes(c))

    if (hasHighRiskCondition) {
      baseRate *= 0.75
      weeklyGoalReason += ` Reduced to ${baseRate.toFixed(1)} lbs/week due to health conditions requiring medical supervision.`
    }

    // Round to nearest 0.5
    weeklyWeightLossGoal = Math.round(baseRate * 2) / 2
    weeklyWeightLossGoal = Math.max(0.5, Math.min(2.0, weeklyWeightLossGoal)) // Clamp to 0.5-2 lbs/week

  } else if (primaryGoal === 'maintain-weight') {
    weeklyWeightLossGoal = 0
    weeklyGoalReason = 'Set to 0 lbs/week for weight maintenance goal.'
  } else if (primaryGoal === 'gain-muscle') {
    weeklyWeightLossGoal = -0.5 // Slight gain for muscle building
    weeklyGoalReason = 'Set to gain 0.5 lbs/week for lean muscle building with minimal fat gain.'
  } else {
    weeklyWeightLossGoal = 0.5 // Conservative default
    weeklyGoalReason = 'Set to 0.5 lbs/week for gradual, sustainable improvement.'
  }

  // 3. AUTO-CALCULATE DAILY STEP GOAL
  let dailySteps: number
  let stepsReason: string

  // Base step targets by activity level
  const baseStepsByActivity: Record<ActivityLevel, number> = {
    'sedentary': 6000,           // Starting point for sedentary
    'lightly-active': 8000,      // Some movement
    'moderately-active': 10000,  // Standard recommendation
    'very-active': 12000,        // Active lifestyle
    'extremely-active': 15000    // Athlete level
  }

  dailySteps = baseStepsByActivity[activityLevel]

  // Adjust for weight (heavier people need lower initial targets to prevent injury)
  const weightLbs = units === 'imperial' ? currentWeight : currentWeight * 2.20462

  if (weightLbs > 250) {
    dailySteps = Math.round(dailySteps * 0.7) // 30% reduction for obesity safety
    stepsReason = `Set to ${dailySteps.toLocaleString()} steps/day based on your activity level (${activityLevel}), adjusted lower for joint protection at current weight.`
  } else if (weightLbs > 200) {
    dailySteps = Math.round(dailySteps * 0.85) // 15% reduction
    stepsReason = `Set to ${dailySteps.toLocaleString()} steps/day based on your activity level (${activityLevel}), slightly reduced for safety at current weight.`
  } else {
    stepsReason = `Set to ${dailySteps.toLocaleString()} steps/day based on your activity level (${activityLevel}).`
  }

  // Adjust for age (older people need lower initial targets)
  if (age >= 65) {
    dailySteps = Math.round(dailySteps * 0.8)
    stepsReason += ` Adjusted for age 65+ to prevent overexertion.`
  } else if (age >= 55) {
    dailySteps = Math.round(dailySteps * 0.9)
    stepsReason += ` Adjusted for age 55+.`
  }

  return {
    targetWeight,
    weeklyWeightLossGoal,
    dailySteps,
    reasoning: {
      targetWeightReason,
      weeklyGoalReason,
      stepsReason
    }
  }
}
