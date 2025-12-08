'use client'

import { useState } from 'react'
import { useMealCapture } from '@/hooks/useMealCapture'
import { useMealAnalysis } from '@/hooks/useMealAnalysis'
import { useMealSave } from '@/hooks/useMealSave'
import { MealType } from '@/types/medical'
import toast from 'react-hot-toast'

interface MealLogFormProps {
  patientId: string
  patientName?: string
  onSuccess?: () => void
}

export function MealLogForm({ patientId, patientName, onSuccess }: MealLogFormProps) {
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [usePhotoMode, setUsePhotoMode] = useState(false)

  // Use new DRY hooks
  const {
    capturedImage,
    imageObjectUrl,
    uploading,
    uploadProgress,
    capturePhoto,
    uploadPhoto,
    clearPhoto
  } = useMealCapture()

  const {
    aiAnalysis,
    analyzing,
    analyzeMeal,
    clearAnalysis
  } = useMealAnalysis()

  const { saving, saveMeal } = useMealSave()

  const loading = saving || uploading

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Capture photo and auto-analyze
    await capturePhoto(file, (imageData) => {
      analyzeMeal(imageData, mealType)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Photo mode: require photo and analysis
    if (usePhotoMode) {
      if (!capturedImage) {
        toast.error('Please capture a photo of the meal')
        return
      }

      // Upload photo first
      const photoUrl = await uploadPhoto()

      // Save with AI analysis
      await saveMeal({
        mealType,
        photoUrl,
        aiAnalysis,
        patientId,
        patientName,
        onSuccess: () => {
          clearPhoto()
          clearAnalysis()
          onSuccess?.()
        }
      })
      return
    }

    // Manual mode: require description
    if (!description.trim()) {
      toast.error('Please describe your meal')
      return
    }

    // Save manual entry
    await saveMeal({
      mealType,
      aiAnalysis: null,
      patientId,
      patientName,
      notes: `${description}${calories ? ` (${calories} cal)` : ''}`,
      onSuccess: () => {
        setDescription('')
        setCalories('')
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          type="button"
          onClick={() => setUsePhotoMode(false)}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            !usePhotoMode
              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-foreground'
          }`}
        >
          ✍️ Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setUsePhotoMode(true)}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            usePhotoMode
              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-foreground'
          }`}
        >
          📸 Photo + AI
        </button>
      </div>

      {/* Meal Type */}
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

      {/* Photo Mode */}
      {usePhotoMode && (
        <>
          {/* Photo Capture */}
          {!capturedImage && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Capture Meal Photo *
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="w-full px-3 py-2 border border-border rounded-lg"
              />
            </div>
          )}

          {/* Photo Preview */}
          {imageObjectUrl && (
            <div className="relative">
              <img
                src={imageObjectUrl}
                alt="Meal preview"
                className="w-full rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => {
                  clearPhoto()
                  clearAnalysis()
                }}
                className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          )}

          {/* AI Analysis Status */}
          {analyzing && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                🔍 Analyzing meal with AI...
              </p>
            </div>
          )}

          {/* AI Results */}
          {aiAnalysis && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                ✅ AI Analysis Complete
              </p>
              <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                <p>📊 {aiAnalysis.totalCalories} calories</p>
                <p>
                  🍗 Protein: {aiAnalysis.totalMacros.protein}g |
                  🍞 Carbs: {aiAnalysis.totalMacros.carbs}g |
                  🥑 Fat: {aiAnalysis.totalMacros.fat}g
                </p>
                <p>🥗 Items: {aiAnalysis.foodItems.map(item => item.name).join(', ')}</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {uploadProgress}
              </p>
            </div>
          )}
        </>
      )}

      {/* Manual Mode */}
      {!usePhotoMode && (
        <>
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
        </>
      )}

      {/* Submit Button */}
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
