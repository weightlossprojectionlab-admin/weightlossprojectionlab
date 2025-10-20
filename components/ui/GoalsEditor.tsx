'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { userProfileOperations } from '@/lib/firebase-operations'
import { calculateBMR, calculateTDEE, calculateCalorieTarget } from '@/lib/health-calculations'
import type { UserProfileData } from '@/hooks/useUserProfile'

interface GoalsEditorProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfileData | null
  currentWeight: number
  onSuccess?: () => void
}

export function GoalsEditor({ isOpen, onClose, userProfile, currentWeight, onSuccess }: GoalsEditorProps) {
  const [loading, setLoading] = useState(false)
  const [targetWeight, setTargetWeight] = useState(0)
  const [weeklyGoal, setWeeklyGoal] = useState(1)
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [showSuggestion, setShowSuggestion] = useState(false)

  // Calculate suggested values based on current weight
  const calculateSuggestions = () => {
    if (!userProfile?.profile || !userProfile?.goals) return null

    const profile = userProfile.profile
    const goals = userProfile.goals

    // Recalculate BMR using current weight instead of start weight
    const bmr = calculateBMR({
      weight: currentWeight,
      height: profile.height,
      age: profile.age,
      gender: profile.gender,
      units: 'imperial' // assuming imperial for now
    })

    // Recalculate TDEE
    const tdee = calculateTDEE(bmr, profile.activityLevel)

    // Calculate new calorie target for same weekly goal
    const suggestedCalories = calculateCalorieTarget({
      tdee,
      weeklyWeightLossGoal: weeklyGoal,
      units: 'imperial'
    })

    return {
      bmr,
      tdee,
      suggestedCalories,
      oldBmr: goals.bmr || 0,
      oldTdee: goals.tdee || 0,
      oldCalories: goals.dailyCalorieGoal
    }
  }

  // Initialize form with current values
  useEffect(() => {
    if (userProfile?.goals) {
      setTargetWeight(userProfile.goals.targetWeight || 0)
      setWeeklyGoal(userProfile.goals.weeklyWeightLossGoal || 1)
      setCalorieGoal(userProfile.goals.dailyCalorieGoal || 2000)
    }
  }, [userProfile])

  const handleRecalculate = () => {
    setShowSuggestion(true)
    const suggestions = calculateSuggestions()
    if (suggestions) {
      setCalorieGoal(suggestions.suggestedCalories)
      toast.success('Goals recalculated based on your current weight!')
    }
  }

  const handleSave = async () => {
    if (!userProfile) return

    setLoading(true)
    try {
      // Recalculate BMR/TDEE with new values
      const suggestions = calculateSuggestions()

      await userProfileOperations.updateUserProfile({
        goals: {
          targetWeight,
          weeklyWeightLossGoal: weeklyGoal,
          dailyCalorieGoal: calorieGoal,
          bmr: suggestions?.bmr,
          tdee: suggestions?.tdee
        }
      })

      toast.success('Goals updated successfully!')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to update goals:', error)
      toast.error('Failed to update goals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const suggestions = calculateSuggestions()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Adjust Your Goals</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Current vs Recalculated */}
          {showSuggestion && suggestions && (
            <div className="bg-accent-light border border-accent rounded-lg p-4">
              <h3 className="font-medium text-accent-dark mb-2">📊 Recalculated Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-accent-dark">BMR:</span>
                  <span className="font-medium text-accent-dark">
                    {suggestions.oldBmr} → {suggestions.bmr} cal/day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-accent-dark">TDEE:</span>
                  <span className="font-medium text-accent-dark">
                    {suggestions.oldTdee} → {suggestions.tdee} cal/day
                  </span>
                </div>
                <p className="text-xs text-accent-dark mt-2">
                  Your metabolism has adjusted as you've lost weight. These new values reflect your current body composition.
                </p>
              </div>
            </div>
          )}

          {/* Recalculate Button */}
          <button
            onClick={handleRecalculate}
            className="btn btn-secondary w-full"
          >
            🔄 Recalculate Based on Current Weight ({currentWeight.toFixed(1)} lbs)
          </button>

          {/* Target Weight */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Weight (lbs)
            </label>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
              className="form-input w-full"
              min="100"
              max="500"
              step="0.1"
            />
          </div>

          {/* Weekly Goal */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Weekly Weight Loss Goal (lbs/week)
            </label>
            <input
              type="range"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(parseFloat(e.target.value))}
              className="w-full"
              min="0.5"
              max="2"
              step="0.1"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>0.5 lbs</span>
              <span className="font-medium text-primary">{weeklyGoal.toFixed(1)} lbs/week</span>
              <span>2 lbs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 0.5-2 lbs/week for sustainable weight loss
            </p>
          </div>

          {/* Daily Calorie Goal - Auto-Calculated Only */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Daily Calorie Goal <span className="text-xs text-muted-foreground">(Auto-Calculated)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={calorieGoal}
                readOnly
                className="form-input w-full bg-muted cursor-not-allowed"
                min="1200"
                max="4000"
                step="50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                🔒 Auto
              </div>
            </div>
            <p className="text-xs text-accent mt-1 flex items-center space-x-1">
              <span>ℹ️</span>
              <span>Calorie goal is automatically calculated based on your BMR, activity level, and weekly weight loss goal. Click "Recalculate" above to update.</span>
            </p>
          </div>

          {/* Safety Warning */}
          {calorieGoal < 1200 && (
            <div className="bg-error-light border border-error rounded-lg p-3">
              <p className="text-xs text-error-dark">
                ⚠️ Warning: Daily intake below 1200 calories is not recommended without medical supervision.
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Summary</h3>
            <div className="space-y-1 text-sm text-foreground">
              <div className="flex justify-between">
                <span>Current Weight:</span>
                <span className="font-medium">{currentWeight.toFixed(1)} lbs</span>
              </div>
              <div className="flex justify-between">
                <span>Target Weight:</span>
                <span className="font-medium">{targetWeight.toFixed(1)} lbs</span>
              </div>
              <div className="flex justify-between">
                <span>Total to Lose:</span>
                <span className="font-medium">{Math.abs(currentWeight - targetWeight).toFixed(1)} lbs</span>
              </div>
              <div className="flex justify-between">
                <span>Weekly Goal:</span>
                <span className="font-medium">{weeklyGoal.toFixed(1)} lbs/week</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Calories:</span>
                <span className="font-medium">{calorieGoal} cal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-6 pt-4 flex space-x-3">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Saving...</span>
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
