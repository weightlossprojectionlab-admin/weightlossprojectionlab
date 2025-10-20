import {
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  calculateOptimalCalories,
  calculateLifestyleImpact,
  calculateOptimalTargets,
  type Gender,
  type ActivityLevel,
  type Units,
  type HealthCondition
} from '@/lib/health-calculations'

describe('health-calculations', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR for male using imperial units', () => {
      const bmr = calculateBMR({
        weight: 180, // lbs
        height: 70, // inches
        age: 30,
        gender: 'male',
        units: 'imperial'
      })

      // Expected: (10 × 81.65 kg) + (6.25 × 177.8 cm) - (5 × 30) + 5
      // = 816.5 + 1111.25 - 150 + 5 = 1782.75 ≈ 1783
      expect(bmr).toBeCloseTo(1783, -1) // Within 10
    })

    it('should calculate BMR for female using imperial units', () => {
      const bmr = calculateBMR({
        weight: 150,
        height: 65,
        age: 28,
        gender: 'female',
        units: 'imperial'
      })

      // Expected: (10 × 68.04 kg) + (6.25 × 165.1 cm) - (5 × 28) - 161
      // = 680.4 + 1031.875 - 140 - 161 = 1411.275 ≈ 1411
      expect(bmr).toBeCloseTo(1411, -1)
    })

    it('should calculate BMR for male using metric units', () => {
      const bmr = calculateBMR({
        weight: 80, // kg
        height: 175, // cm
        age: 35,
        gender: 'male',
        units: 'metric'
      })

      // Expected: (10 × 80) + (6.25 × 175) - (5 × 35) + 5
      // = 800 + 1093.75 - 175 + 5 = 1723.75 ≈ 1724
      expect(bmr).toBeCloseTo(1724, -1)
    })

    it('should calculate BMR for female using metric units', () => {
      const bmr = calculateBMR({
        weight: 60,
        height: 165,
        age: 25,
        gender: 'female',
        units: 'metric'
      })

      // Expected: (10 × 60) + (6.25 × 165) - (5 × 25) - 161
      // = 600 + 1031.25 - 125 - 161 = 1345.25 ≈ 1345
      expect(bmr).toBeCloseTo(1345, -1)
    })

    it('should use average formula for other/prefer-not-to-say gender', () => {
      const bmr = calculateBMR({
        weight: 70,
        height: 170,
        age: 30,
        gender: 'other',
        units: 'metric'
      })

      // Expected: (10 × 70) + (6.25 × 170) - (5 × 30) - 78
      // = 700 + 1062.5 - 150 - 78 = 1534.5 ≈ 1535
      expect(bmr).toBeCloseTo(1535, -1)
    })

    it('should handle edge case: very young person', () => {
      const bmr = calculateBMR({
        weight: 120,
        height: 62,
        age: 18,
        gender: 'female',
        units: 'imperial'
      })

      expect(bmr).toBeGreaterThan(1000)
      expect(bmr).toBeLessThan(2000)
    })

    it('should handle edge case: older person', () => {
      const bmr = calculateBMR({
        weight: 160,
        height: 68,
        age: 65,
        gender: 'male',
        units: 'imperial'
      })

      // Older age should result in lower BMR
      expect(bmr).toBeGreaterThan(1200)
      expect(bmr).toBeLessThan(1800)
    })
  })

  describe('calculateTDEE', () => {
    const baseBMR = 1500

    it('should calculate TDEE for sedentary activity level', () => {
      const tdee = calculateTDEE(baseBMR, 'sedentary')
      expect(tdee).toBe(Math.round(1500 * 1.2)) // 1800
    })

    it('should calculate TDEE for light activity level', () => {
      const tdee = calculateTDEE(baseBMR, 'light')
      expect(tdee).toBe(Math.round(1500 * 1.375)) // 2063
    })

    it('should calculate TDEE for moderate activity level', () => {
      const tdee = calculateTDEE(baseBMR, 'moderate')
      expect(tdee).toBe(Math.round(1500 * 1.55)) // 2325
    })

    it('should calculate TDEE for very-active activity level', () => {
      const tdee = calculateTDEE(baseBMR, 'very-active')
      expect(tdee).toBe(Math.round(1500 * 1.725)) // 2588
    })

    it('should calculate TDEE for extremely-active activity level', () => {
      const tdee = calculateTDEE(baseBMR, 'extremely-active')
      expect(tdee).toBe(Math.round(1500 * 1.9)) // 2850
    })
  })

  describe('calculateBMI', () => {
    it('should calculate BMI using imperial units', () => {
      const bmi = calculateBMI({
        weight: 180, // lbs
        height: 70, // inches
        units: 'imperial'
      })

      // BMI = (weight_lbs / height_in²) × 703
      // = (180 / 4900) × 703 = 25.8
      expect(bmi.value).toBeCloseTo(25.8, 1)
      expect(bmi.category).toBe('overweight')
    })

    it('should calculate BMI using metric units', () => {
      const bmi = calculateBMI({
        weight: 70, // kg
        height: 175, // cm
        units: 'metric'
      })

      // BMI = weight_kg / (height_m²)
      // = 70 / (1.75²) = 70 / 3.0625 = 22.86
      expect(bmi.value).toBeCloseTo(22.9, 1)
      expect(bmi.category).toBe('normal')
    })

    it('should categorize BMI as underweight', () => {
      const bmi = calculateBMI({
        weight: 110,
        height: 70,
        units: 'imperial'
      })

      expect(bmi.value).toBeLessThan(18.5)
      expect(bmi.category).toBe('underweight')
    })

    it('should categorize BMI as normal', () => {
      const bmi = calculateBMI({
        weight: 150,
        height: 70,
        units: 'imperial'
      })

      expect(bmi.value).toBeGreaterThanOrEqual(18.5)
      expect(bmi.value).toBeLessThan(25)
      expect(bmi.category).toBe('normal')
    })

    it('should categorize BMI as overweight', () => {
      const bmi = calculateBMI({
        weight: 180,
        height: 70,
        units: 'imperial'
      })

      expect(bmi.value).toBeGreaterThanOrEqual(25)
      expect(bmi.value).toBeLessThan(30)
      expect(bmi.category).toBe('overweight')
    })

    it('should categorize BMI as obese', () => {
      const bmi = calculateBMI({
        weight: 250,
        height: 70,
        units: 'imperial'
      })

      expect(bmi.value).toBeGreaterThanOrEqual(30)
      expect(bmi.category).toBe('obese')
    })
  })

  describe('calculateOptimalCalories', () => {
    const baseParams = {
      currentWeight: 180,
      height: 70,
      age: 30,
      gender: 'male' as Gender,
      activityLevel: 'moderate' as ActivityLevel,
      primaryGoal: 'lose-weight' as const,
      weeklyWeightLossGoal: 1,
      units: 'imperial' as Units
    }

    it('should calculate optimal calories for weight loss', () => {
      const result = calculateOptimalCalories(baseParams)

      expect(result.dailyCalories).toBeGreaterThan(0)
      expect(result.dailyCalories).toBeLessThan(result.tdee)
      expect(result.weeklyDeficit).toBe(3500) // 1 lb/week = 3500 cal deficit
      expect(result.warnings).toHaveLength(0)
    })

    it('should enforce 1200 calorie minimum for women', () => {
      const result = calculateOptimalCalories({
        ...baseParams,
        gender: 'female',
        currentWeight: 110,
        weeklyWeightLossGoal: 2 // Aggressive goal
      })

      expect(result.dailyCalories).toBeGreaterThanOrEqual(1200)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should enforce 1500 calorie minimum for men', () => {
      const result = calculateOptimalCalories({
        ...baseParams,
        currentWeight: 140,
        weeklyWeightLossGoal: 2.5 // Very aggressive goal
      })

      expect(result.dailyCalories).toBeGreaterThanOrEqual(1500)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should adjust calories for maintain-weight goal', () => {
      const result = calculateOptimalCalories({
        ...baseParams,
        primaryGoal: 'maintain-weight'
      })

      expect(result.dailyCalories).toEqual(result.tdee)
      expect(result.weeklyDeficit).toBe(0)
    })

    it('should adjust calories for gain-muscle goal', () => {
      const result = calculateOptimalCalories({
        ...baseParams,
        primaryGoal: 'gain-muscle'
      })

      expect(result.dailyCalories).toBeGreaterThan(result.tdee)
      expect(result.weeklyDeficit).toBeLessThan(0) // Surplus
    })

    it('should cap weekly deficit at 1000 cal/day (2 lbs/week)', () => {
      const result = calculateOptimalCalories({
        ...baseParams,
        weeklyWeightLossGoal: 5 // Dangerously high goal
      })

      const maxDailyDeficit = 1000
      const actualDeficit = result.tdee - result.dailyCalories
      expect(actualDeficit).toBeLessThanOrEqual(maxDailyDeficit)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle health conditions affecting calorie needs', () => {
      const result = calculateOptimalCalories({
        ...baseParams,
        healthConditions: ['diabetes-type2', 'high-blood-pressure']
      })

      expect(result.dailyCalories).toBeGreaterThan(0)
      // Health conditions may trigger warnings or adjustments
    })
  })

  describe('calculateLifestyleImpact', () => {
    const baseTDEE = 2000

    it('should calculate impact for never smoker with no alcohol', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'never',
        weeklyDrinks: 0
      })

      expect(result.adjustedTDEE).toBe(baseTDEE)
      expect(result.smokingAdjustment).toBe(0)
      expect(result.alcoholCaloriesPerDay).toBe(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should calculate impact for light smoker', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'current-light',
        weeklyDrinks: 0
      })

      expect(result.smokingAdjustment).toBe(200)
      expect(result.adjustedTDEE).toBe(2200) // +200 from smoking
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('smoking')
    })

    it('should calculate impact for heavy smoker', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'current-heavy',
        weeklyDrinks: 0
      })

      expect(result.smokingAdjustment).toBe(300)
      expect(result.adjustedTDEE).toBe(2300)
    })

    it('should calculate alcohol calories', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'never',
        weeklyDrinks: 7 // 1 drink per day
      })

      // 7 drinks × 150 cal = 1050 cal/week = 150 cal/day
      expect(result.alcoholCaloriesPerDay).toBeCloseTo(150, 0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should warn about moderate alcohol consumption', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'never',
        weeklyDrinks: 10
      })

      expect(result.alcoholCaloriesPerDay).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('alcohol'))).toBe(true)
    })

    it('should warn about heavy alcohol consumption', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'never',
        weeklyDrinks: 15
      })

      expect(result.warnings.some(w => w.includes('excessive') || w.includes('heavy'))).toBe(true)
    })

    it('should handle combined smoking and alcohol', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'current-light',
        weeklyDrinks: 7
      })

      expect(result.smokingAdjustment).toBe(200)
      expect(result.alcoholCaloriesPerDay).toBeCloseTo(150, 0)
      expect(result.adjustedTDEE).toBe(2200)
      expect(result.warnings.length).toBeGreaterThanOrEqual(2) // Both smoking and alcohol warnings
    })

    it('should handle recent quit smoker', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'quit-recent',
        weeklyDrinks: 0
      })

      // Recent quitters may have temporary metabolism changes
      expect(result.smokingAdjustment).toBeGreaterThanOrEqual(0)
    })

    it('should handle old quit smoker (no adjustment)', () => {
      const result = calculateLifestyleImpact({
        baseTDEE,
        smoking: 'quit-old',
        weeklyDrinks: 0
      })

      expect(result.smokingAdjustment).toBe(0)
      expect(result.adjustedTDEE).toBe(baseTDEE)
    })
  })

  describe('calculateOptimalTargets', () => {
    const baseParams = {
      currentWeight: 200,
      height: 70,
      age: 35,
      gender: 'male' as Gender,
      activityLevel: 'moderate' as ActivityLevel,
      primaryGoal: 'lose-weight' as const,
      units: 'imperial' as Units
    }

    it('should calculate optimal targets for weight loss', () => {
      const result = calculateOptimalTargets(baseParams)

      expect(result.targetWeight).toBeLessThan(baseParams.currentWeight)
      expect(result.weeklyWeightLossGoal).toBeGreaterThan(0)
      expect(result.weeklyWeightLossGoal).toBeLessThanOrEqual(2) // Max 2 lbs/week
      expect(result.dailySteps).toBeGreaterThan(0)
      expect(result.reasoning.targetWeightReason).toBeDefined()
      expect(result.reasoning.weeklyGoalReason).toBeDefined()
      expect(result.reasoning.stepsReason).toBeDefined()
    })

    it('should set target weight to healthy BMI range', () => {
      const result = calculateOptimalTargets(baseParams)

      const targetBMI = calculateBMI({
        weight: result.targetWeight,
        height: baseParams.height,
        units: baseParams.units
      })

      expect(targetBMI.value).toBeGreaterThanOrEqual(18.5)
      expect(targetBMI.value).toBeLessThan(25)
      expect(targetBMI.category).toBe('normal')
    })

    it('should recommend appropriate weekly loss goal based on current weight', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        currentWeight: 250 // Higher weight
      })

      // Higher weight allows more aggressive loss
      expect(result.weeklyWeightLossGoal).toBeGreaterThanOrEqual(1)
      expect(result.weeklyWeightLossGoal).toBeLessThanOrEqual(2)
    })

    it('should recommend conservative goal for lower excess weight', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        currentWeight: 175 // Only slightly overweight
      })

      // Lower excess weight = more conservative goal
      expect(result.weeklyWeightLossGoal).toBeGreaterThan(0)
      expect(result.weeklyWeightLossGoal).toBeLessThanOrEqual(1.5)
    })

    it('should set appropriate daily steps goal', () => {
      const result = calculateOptimalTargets(baseParams)

      expect(result.dailySteps).toBeGreaterThanOrEqual(5000)
      expect(result.dailySteps).toBeLessThanOrEqual(15000)
    })

    it('should adjust recommendations for sedentary users', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        activityLevel: 'sedentary'
      })

      // Sedentary users should get lower initial step goal
      expect(result.dailySteps).toBeLessThanOrEqual(8000)
    })

    it('should adjust recommendations for very active users', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        activityLevel: 'very-active'
      })

      // Very active users can handle higher step goals
      expect(result.dailySteps).toBeGreaterThanOrEqual(8000)
    })

    it('should handle maintain-weight goal', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        primaryGoal: 'maintain-weight'
      })

      expect(result.targetWeight).toBe(baseParams.currentWeight)
      expect(result.weeklyWeightLossGoal).toBe(0)
    })

    it('should handle gain-muscle goal', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        primaryGoal: 'gain-muscle'
      })

      expect(result.targetWeight).toBeGreaterThanOrEqual(baseParams.currentWeight)
      expect(result.weeklyWeightLossGoal).toBeLessThanOrEqual(0) // Negative = gain
    })

    it('should handle improve-health goal', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        primaryGoal: 'improve-health'
      })

      expect(result.targetWeight).toBeLessThanOrEqual(baseParams.currentWeight)
      expect(result.dailySteps).toBeGreaterThan(0)
    })

    it('should adjust for health conditions', () => {
      const result = calculateOptimalTargets({
        ...baseParams,
        healthConditions: ['diabetes-type2', 'high-blood-pressure']
      })

      // Health conditions may result in more conservative recommendations
      expect(result.weeklyWeightLossGoal).toBeGreaterThan(0)
      expect(result.weeklyWeightLossGoal).toBeLessThanOrEqual(2)
    })

    it('should provide reasoning for all recommendations', () => {
      const result = calculateOptimalTargets(baseParams)

      expect(result.reasoning.targetWeightReason).toContain('BMI')
      expect(result.reasoning.weeklyGoalReason).toBeDefined()
      expect(result.reasoning.weeklyGoalReason.length).toBeGreaterThan(0)
      expect(result.reasoning.stepsReason).toBeDefined()
      expect(result.reasoning.stepsReason.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle metric to imperial conversions correctly', () => {
      const bmiImperial = calculateBMI({
        weight: 180,
        height: 70,
        units: 'imperial'
      })

      const bmiMetric = calculateBMI({
        weight: 81.65, // 180 lbs
        height: 177.8, // 70 inches
        units: 'metric'
      })

      expect(bmiImperial.value).toBeCloseTo(bmiMetric.value, 0.5)
    })

    it('should handle very tall person', () => {
      const bmr = calculateBMR({
        weight: 200,
        height: 78, // 6'6"
        age: 30,
        gender: 'male',
        units: 'imperial'
      })

      expect(bmr).toBeGreaterThan(1500)
      expect(bmr).toBeLessThan(3000)
    })

    it('should handle very short person', () => {
      const bmr = calculateBMR({
        weight: 100,
        height: 58, // 4'10"
        age: 30,
        gender: 'female',
        units: 'imperial'
      })

      expect(bmr).toBeGreaterThan(800)
      expect(bmr).toBeLessThan(1500)
    })

    it('should prevent dangerously low calorie recommendations', () => {
      const result = calculateOptimalCalories({
        currentWeight: 100,
        height: 60,
        age: 25,
        gender: 'female',
        activityLevel: 'sedentary',
        primaryGoal: 'lose-weight',
        weeklyWeightLossGoal: 2,
        units: 'imperial'
      })

      expect(result.dailyCalories).toBeGreaterThanOrEqual(1200)
    })
  })
})
