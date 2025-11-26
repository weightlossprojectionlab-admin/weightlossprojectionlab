'use client'

import { useState } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { MealType } from '@/types/medical'
import toast from 'react-hot-toast'

interface MealLogFormProps {
  patientId: string
  onSuccess?: () => void
}

export function MealLogForm({ patientId, onSuccess }: MealLogFormProps) {
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toast.error('Please describe your meal')
      return
    }

    try {
      setLoading(true)
      await medicalOperations.mealLogs.logMeal(patientId, {
        mealType,
        foodItems: description.split(',').map(item => item.trim()).filter(Boolean),
        description,
        calories: calories ? parseFloat(calories) : undefined,
        loggedAt: new Date().toISOString(),
        consumedAt: new Date().toISOString(),
        tags: []
      })

      toast.success('Meal logged successfully')
      setDescription('')
      setCalories('')
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to log meal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="mealType" className="block text-sm font-medium text-foreground mb-1">
          Meal Type *
        </label>
        <select
          id="mealType"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
          What did you eat? *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Describe your meal or list items separated by commas..."
          required
        />
      </div>

      <div>
        <label htmlFor="calories" className="block text-sm font-medium text-foreground mb-1">
          Calories (optional)
        </label>
        <input
          id="calories"
          type="number"
          step="1"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Estimated calories"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Logging...' : 'Log Meal'}
      </button>
    </form>
  )
}
