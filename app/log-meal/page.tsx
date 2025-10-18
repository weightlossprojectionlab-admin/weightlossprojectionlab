'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { mealLogOperations } from '@/lib/firebase-operations'
import { uploadMealPhoto } from '@/lib/storage-upload'

function LogMealContent() {
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [manualEntry, setManualEntry] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const fileReaderRef = useRef<FileReader | null>(null)

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
    { id: 'snack', label: 'Snack', emoji: '🍎' },
  ] as const

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Abort any pending fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Abort FileReader if still reading
      if (fileReaderRef.current) {
        fileReaderRef.current.abort()
      }

      // Revoke object URL to free memory
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
      }
    }
  }, [imageObjectUrl])

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Please select an image under 10MB.')
      return
    }

    // Clean up previous object URL to prevent memory leak
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl)
    }

    // Create object URL for preview (much lighter than base64)
    const objectUrl = URL.createObjectURL(file)
    setImageObjectUrl(objectUrl)

    // Convert file to base64 for AI analysis only
    const reader = new FileReader()
    fileReaderRef.current = reader

    console.log('Starting FileReader...')

    reader.onloadend = () => {
      const base64Image = reader.result as string

      // Validate that we got a valid base64 string
      if (!base64Image || typeof base64Image !== 'string') {
        console.error('FileReader result is invalid:', base64Image)
        alert('Failed to read image data. Please try again.')
        fileReaderRef.current = null
        return
      }

      console.log('FileReader success, image length:', base64Image.length)
      setCapturedImage(base64Image)
      analyzeImage(base64Image)
      // Clear reference after use
      fileReaderRef.current = null
    }

    reader.onerror = (error) => {
      console.error('FileReader error event:', error)
      console.error('FileReader error details:', {
        error: reader.error,
        errorName: reader.error?.name,
        errorMessage: reader.error?.message,
        readyState: reader.readyState
      })
      alert(`Failed to read image file: ${reader.error?.message || 'Unknown error'}. Please try again.`)
      fileReaderRef.current = null
    }

    reader.onabort = () => {
      console.warn('FileReader aborted')
      fileReaderRef.current = null
    }

    reader.onload = () => {
      console.log('FileReader onload fired')
    }

    console.log('Calling readAsDataURL...')
    reader.readAsDataURL(file)
    console.log('readAsDataURL called, readyState:', reader.readyState)
  }

  const analyzeImage = async (imageData: string) => {
    setAnalyzing(true)

    // Create AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      console.log('🔍 Starting AI analysis...')
      console.log('Image data length:', imageData.length)
      console.log('Image data prefix:', imageData.substring(0, 30))
      console.log('Meal type:', selectedMealType)

      const response = await fetch('/api/ai/analyze-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          mealType: selectedMealType
        }),
        signal: abortController.signal
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Analysis request failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('Analysis result:', result)

      if (result.success) {
        console.log('✅ Analysis successful:', result.data)
        setAiAnalysis(result.data)
      } else {
        console.error('❌ Analysis failed:', result.error)
        throw new Error(result.error || 'Analysis failed')
      }

    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Analysis request aborted')
        return
      }

      console.error('💥 Analysis error:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or enter manually.`)
    } finally {
      setAnalyzing(false)
      abortControllerRef.current = null
    }
  }

  const saveMeal = async () => {
    try {
      console.log('💾 Starting meal save...')

      let photoUrl: string | undefined = undefined

      // Upload photo to Firebase Storage if we have one
      if (capturedImage) {
        console.log('📤 Uploading photo to Storage...')
        try {
          photoUrl = await uploadMealPhoto(capturedImage)
          console.log('✅ Photo uploaded:', photoUrl)
        } catch (uploadError) {
          console.error('❌ Photo upload failed:', uploadError)
          // Continue saving even if photo upload fails
          alert('Photo upload failed, but saving meal data anyway.')
        }
      }

      // Save to Firebase using real API
      console.log('💾 Saving meal log to Firestore...')
      const response = await mealLogOperations.createMealLog({
        mealType: selectedMealType,
        photoUrl: photoUrl || undefined,
        aiAnalysis: aiAnalysis || undefined,
        manualEntries: manualEntry ? [{ food: 'Manual entry', calories: 0, quantity: '1 serving' }] : undefined,
        loggedAt: new Date().toISOString()
      })

      console.log('✅ Meal logged successfully:', response.data)
      alert('Meal logged successfully!')

      // Clean up and reset form
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
        setImageObjectUrl(null)
      }
      setCapturedImage(null)
      setAiAnalysis(null)
      setManualEntry(false)

    } catch (error) {
      console.error('💥 Save error:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      alert(`Failed to save meal: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
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
                    src={imageObjectUrl || capturedImage}
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
