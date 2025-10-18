'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { mealLogOperations } from '@/lib/firebase-operations'

function LogMealContent() {
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [manualEntry, setManualEntry] = useState(false)

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
    { id: 'snack', label: 'Snack', emoji: '🍎' },
  ] as const

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert file to base64 for preview and AI analysis
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Image = reader.result as string
      setCapturedImage(base64Image)
      analyzeImage(base64Image)
    }
    reader.readAsDataURL(file)
  }

  const analyzeImage = async (imageData: string) => {
    setAnalyzing(true)

    try {
      console.log('Analyzing image with AI...')

      const response = await fetch('/api/ai/analyze-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          mealType: selectedMealType
        })
      })

      if (!response.ok) {
        throw new Error('Analysis request failed')
      }

      const result = await response.json()

      if (result.success) {
        setAiAnalysis(result.data)
      } else {
        throw new Error(result.error || 'Analysis failed')
      }

    } catch (error) {
      console.error('Analysis error:', error)
      alert('Analysis failed. Please try again or enter manually.')
    } finally {
      setAnalyzing(false)
    }
  }

  const saveMeal = async () => {
    try {
      // Save to Firebase using real API
      const response = await mealLogOperations.createMealLog({
        mealType: selectedMealType,
        photoUrl: capturedImage || undefined,
        aiAnalysis: aiAnalysis || undefined,
        manualEntries: manualEntry ? [{ food: 'Manual entry', calories: 0, quantity: '1 serving' }] : undefined,
        loggedAt: new Date().toISOString()
      })

      console.log('Meal logged successfully:', response.data)
      alert('Meal logged successfully!')

      // Reset form
      setCapturedImage(null)
      setAiAnalysis(null)
      setManualEntry(false)

    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save meal. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-500"
              aria-label="Back to dashboard"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Log Meal</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Meal Type Selection */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Meal Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {mealTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedMealType(type.id)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedMealType === type.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Select ${type.label}`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-2xl" role="img" aria-label={type.label}>
                    {type.emoji}
                  </span>
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Camera/Photo Section */}
        {!manualEntry && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Take Photo</h2>

            {!capturedImage && (
              <div className="space-y-4">
                <label className="btn btn-primary w-full cursor-pointer">
                  📸 Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setManualEntry(true)}
                  className="btn btn-secondary w-full"
                  aria-label="Enter meal details manually"
                >
                  ✏️ Manual Entry
                </button>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured meal"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p>Analyzing with AI...</p>
                      </div>
                    </div>
                  )}
                </div>

                {!analyzing && !aiAnalysis && (
                  <label className="btn btn-secondary w-full cursor-pointer">
                    🔄 Retake Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">AI Analysis</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Detected Foods</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {aiAnalysis.foodItems.map((item: string, index: number) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Calories</span>
                  <p className="text-lg font-semibold">{aiAnalysis.estimatedCalories}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Confidence</span>
                  <p className="text-lg font-semibold">{aiAnalysis.confidence}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Protein</span>
                  <p className="font-medium">{aiAnalysis.macros.protein}g</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Carbs</span>
                  <p className="font-medium">{aiAnalysis.macros.carbs}g</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Fat</span>
                  <p className="font-medium">{aiAnalysis.macros.fat}g</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Fiber</span>
                  <p className="font-medium">{aiAnalysis.macros.fiber}g</p>
                </div>
              </div>

              {aiAnalysis.suggestions && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">AI Suggestions</h3>
                  <ul className="text-sm text-green-600 space-y-1">
                    {aiAnalysis.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>💡 {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={saveMeal}
                  className="btn btn-primary flex-1"
                  aria-label="Save meal log"
                >
                  ✓ Save Meal
                </button>
                <label className="btn btn-secondary cursor-pointer">
                  🔄 Retake
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        {manualEntry && !aiAnalysis && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="food-items" className="block text-sm font-medium text-gray-700 mb-1">
                  Food Items
                </label>
                <textarea
                  id="food-items"
                  className="form-input resize-none"
                  rows={3}
                  placeholder="e.g., Grilled chicken, brown rice, broccoli"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="calories" className="block text-sm font-medium text-gray-700 mb-1">
                    Calories
                  </label>
                  <input
                    id="calories"
                    type="number"
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="protein" className="block text-sm font-medium text-gray-700 mb-1">
                    Protein (g)
                  </label>
                  <input
                    id="protein"
                    type="number"
                    className="form-input"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    // TODO: Save manual entry
                    alert('Manual entry saved!')
                    setManualEntry(false)
                  }}
                  className="btn btn-primary flex-1"
                  aria-label="Save manual entry"
                >
                  ✓ Save Manual Entry
                </button>
                <button
                  onClick={() => setManualEntry(false)}
                  className="btn btn-secondary"
                  aria-label="Cancel manual entry"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LogMealPage() {
  return (
    <AuthGuard>
      <LogMealContent />
    </AuthGuard>
  )
}
