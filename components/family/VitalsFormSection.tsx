'use client'

/**
 * Reusable Vitals Form Section
 * Collects height, weight, activity level, and goals
 * Used in: Family Member Creation, Onboarding, Vitals Wizard
 */

interface VitalsFormData {
  heightFeet: string
  heightInches: string
  heightCm: string
  currentWeight: string
  weightUnit: 'lbs' | 'kg'
  heightUnit: 'imperial' | 'metric'
  activityLevel: '' | 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
  targetWeight: string
  weightGoal: '' | 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'
}

interface VitalsFormSectionProps {
  data: VitalsFormData
  onChange: (updates: Partial<VitalsFormData>) => void
  required?: boolean
  showGoals?: boolean
  hideHeight?: boolean
}

export function VitalsFormSection({
  data,
  onChange,
  required = false,
  showGoals = false,
  hideHeight = false
}: VitalsFormSectionProps) {
  // Calculate BMI and healthy weight range
  function calculateBMI() {
    if (!data.currentWeight) return null

    let heightInInches = 0
    if (data.heightUnit === 'imperial' && data.heightFeet) {
      heightInInches = (parseInt(data.heightFeet) || 0) * 12 + (parseInt(data.heightInches) || 0)
    } else if (data.heightUnit === 'metric' && data.heightCm) {
      heightInInches = parseFloat(data.heightCm) / 2.54
    }

    if (heightInInches === 0) return null

    const weightInLbs = data.weightUnit === 'kg' ? parseFloat(data.currentWeight) * 2.20462 : parseFloat(data.currentWeight)
    const bmi = (weightInLbs / (heightInInches * heightInInches)) * 703

    // Calculate healthy weight range (BMI 18.5-24.9)
    const minHealthyWeight = ((18.5 * heightInInches * heightInInches) / 703)
    const maxHealthyWeight = ((24.9 * heightInInches * heightInInches) / 703)

    // Convert back to user's preferred unit
    const minWeight = data.weightUnit === 'kg' ? minHealthyWeight / 2.20462 : minHealthyWeight
    const maxWeight = data.weightUnit === 'kg' ? maxHealthyWeight / 2.20462 : maxHealthyWeight

    return { bmi, minWeight, maxWeight }
  }

  const bmiData = calculateBMI()

  // Get AI suggestion for target weight
  function getTargetWeightSuggestion() {
    if (!bmiData) return null

    const currentWeight = parseFloat(data.currentWeight)
    const { bmi, minWeight, maxWeight } = bmiData

    if (bmi < 18.5) {
      // Underweight - suggest gaining to minimum healthy weight
      return {
        target: Math.round(minWeight * 10) / 10,
        reason: `Your BMI (${bmi.toFixed(1)}) indicates underweight. Aim for ${Math.round(minWeight)}-${Math.round(maxWeight)} ${data.weightUnit} for optimal health.`
      }
    } else if (bmi >= 25 && bmi < 30) {
      // Overweight - suggest midpoint of healthy range
      const target = (minWeight + maxWeight) / 2
      return {
        target: Math.round(target * 10) / 10,
        reason: `Your BMI (${bmi.toFixed(1)}) indicates overweight. Aim for ${Math.round(minWeight)}-${Math.round(maxWeight)} ${data.weightUnit} for optimal health.`
      }
    } else if (bmi >= 30) {
      // Obese - suggest 10% weight loss initially
      const target = currentWeight * 0.9
      return {
        target: Math.round(target * 10) / 10,
        reason: `Your BMI (${bmi.toFixed(1)}) indicates obesity. Start with a 10% weight loss goal to ${Math.round(target)} ${data.weightUnit}, then reassess.`
      }
    } else {
      // Healthy weight - suggest maintaining
      return {
        target: currentWeight,
        reason: `Your BMI (${bmi.toFixed(1)}) is in the healthy range! Focus on maintaining your current weight.`
      }
    }
  }

  const suggestion = getTargetWeightSuggestion()

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="border-b border-border pb-2">
        <h3 className="text-lg font-semibold text-foreground">Health Vitals</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {required ? 'Required for accurate health tracking' : 'Optional but recommended for better insights'}
        </p>
      </div>

      {/* Unit Toggle */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Measurement System
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ heightUnit: 'imperial', weightUnit: 'lbs' })}
            className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
              data.heightUnit === 'imperial'
                ? 'border-primary bg-primary-light text-primary-dark'
                : 'border-border hover:border-border dark:hover:border-gray-600'
            }`}
          >
            Imperial (ft/lbs)
          </button>
          <button
            type="button"
            onClick={() => onChange({ heightUnit: 'metric', weightUnit: 'kg' })}
            className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
              data.heightUnit === 'metric'
                ? 'border-primary bg-primary-light text-primary-dark'
                : 'border-border hover:border-border dark:hover:border-gray-600'
            }`}
          >
            Metric (cm/kg)
          </button>
        </div>
      </div>

      {/* Height */}
      {!hideHeight && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Height {required && <span className="text-error">*</span>}
          </label>
          {data.heightUnit === 'imperial' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Feet</label>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={data.heightFeet}
                  onChange={(e) => onChange({ heightFeet: e.target.value })}
                  placeholder="5"
                  required={required}
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Inches</label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={data.heightInches}
                  onChange={(e) => onChange({ heightInches: e.target.value })}
                  placeholder="8"
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                />
              </div>
            </div>
          ) : (
            <div>
              <input
                type="number"
                min="50"
                max="250"
                step="0.1"
                value={data.heightCm}
                onChange={(e) => onChange({ heightCm: e.target.value })}
                placeholder="170"
                required={required}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
              />
              <p className="text-xs text-muted-foreground mt-1">Centimeters</p>
            </div>
          )}
        </div>
      )}

      {/* Current Weight */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Current Weight {required && <span className="text-error">*</span>}
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            step="0.1"
            value={data.currentWeight}
            onChange={(e) => onChange({ currentWeight: e.target.value })}
            placeholder={data.weightUnit === 'lbs' ? '150' : '68'}
            required={required}
            className="flex-1 px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
          />
          <div className="px-4 py-2 bg-muted rounded-lg flex items-center text-foreground font-medium">
            {data.weightUnit}
          </div>
        </div>

        {/* AI Health Analysis */}
        {suggestion && (
          <div className="mt-3 p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">AI Health Analysis</div>
                <p className="text-sm text-foreground/80 leading-relaxed">{suggestion.reason}</p>
                {suggestion.target !== parseFloat(data.currentWeight) && (
                  <button
                    type="button"
                    onClick={() => onChange({
                      targetWeight: suggestion.target.toString(),
                      weightGoal: suggestion.target > parseFloat(data.currentWeight) ? 'gain-muscle' : 'lose-weight'
                    })}
                    className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Set target to {Math.round(suggestion.target)} {data.weightUnit}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Level */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Activity Level {required && <span className="text-error">*</span>}
        </label>
        <select
          value={data.activityLevel}
          onChange={(e) => onChange({ activityLevel: e.target.value as any })}
          required={required}
          className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
        >
          <option value="">Select activity level</option>
          <option value="sedentary">Sedentary (little to no exercise)</option>
          <option value="light">Light (exercise 1-3 days/week)</option>
          <option value="moderate">Moderate (exercise 3-5 days/week)</option>
          <option value="active">Active (exercise 6-7 days/week)</option>
          <option value="very-active">Very Active (intense exercise daily)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Helps calculate calorie and nutrition goals
        </p>
      </div>

      {/* Goals (Optional Section) */}
      {showGoals && (
        <>
          <div className="border-t border-border pt-4 mt-6">
            <h4 className="text-md font-semibold text-foreground mb-1">Goals (Optional)</h4>
            <p className="text-sm text-muted-foreground">Set health and weight goals</p>
          </div>

          {/* Weight Goal */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Weight Goal
            </label>
            <select
              value={data.weightGoal}
              onChange={(e) => onChange({ weightGoal: e.target.value as any })}
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            >
              <option value="">Select a goal</option>
              <option value="lose-weight">Lose Weight</option>
              <option value="maintain-weight">Maintain Weight</option>
              <option value="gain-muscle">Gain Muscle</option>
              <option value="improve-health">Improve Health</option>
            </select>
          </div>

          {/* Target Weight */}
          {data.weightGoal && data.weightGoal !== 'maintain-weight' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Target Weight
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={data.targetWeight}
                  onChange={(e) => onChange({ targetWeight: e.target.value })}
                  placeholder={data.weightUnit === 'lbs' ? '140' : '63'}
                  className="flex-1 px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                />
                <div className="px-4 py-2 bg-muted rounded-lg flex items-center text-foreground font-medium">
                  {data.weightUnit}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
