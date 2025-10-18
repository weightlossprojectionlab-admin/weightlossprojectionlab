'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { mealLogOperations } from '@/lib/firebase-operations'
import { checkCameraPermission, requestCameraPermission, getSettingsInstructions, isMobile } from '@/lib/permissions'
import { debugCamera } from '@/lib/camera-debug'

function LogMealContent() {
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null)
  const [showPermissionHelp, setShowPermissionHelp] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
    { id: 'snack', label: 'Snack', emoji: '🍎' },
  ] as const

  const startCamera = async () => {
    setCameraPermissionError(null)
    setShowPermissionHelp(false)

    try {
      // Run diagnostics in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Running camera diagnostics...')
        const diagnostics = await debugCamera.runFullDiagnostics()
        console.log('📋 Diagnostics report:', debugCamera.generateReport())

        // Show diagnostics errors if any
        if (diagnostics.errors.length > 0) {
          console.error('⚠️ Camera diagnostics found issues:', diagnostics.errors)
        }
      }

      // First, check camera permission status
      const permissionCheck = await checkCameraPermission()

      // If unsupported, show error
      if (permissionCheck.status === 'unsupported') {
        setCameraPermissionError(permissionCheck.message)
        setManualEntry(true) // Auto-switch to manual entry
        return
      }

      // If denied, show help message with settings instructions
      if (permissionCheck.status === 'denied') {
        const instructions = getSettingsInstructions('camera')
        setCameraPermissionError(
          `Camera access was denied.\n\nTo enable camera access:\n${instructions}`
        )
        setShowPermissionHelp(true)
        return
      }

      // Request camera permission
      const result = await requestCameraPermission()

      if (!result.granted) {
        // Permission denied
        const instructions = getSettingsInstructions('camera')
        setCameraPermissionError(
          result.error || 'Camera access denied. Please enable camera access in your device settings.'
        )
        setShowPermissionHelp(true)

        // Show detailed instructions for mobile
        if (isMobile()) {
          setTimeout(() => {
            setCameraPermissionError(
              `${result.error}\n\nTo enable camera:\n${instructions}`
            )
          }, 1000)
        }
        return
      }

      // Permission granted, set up video stream
      if (videoRef.current && result.stream) {
        videoRef.current.srcObject = result.stream
        // Ensure video plays (important for iOS)
        try {
          await videoRef.current.play()
          setCameraActive(true)
          console.log('✅ Camera started successfully')
        } catch (playError) {
          console.error('Video play error:', playError)
          setCameraPermissionError('Camera stream obtained but video failed to play. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraPermissionError('Unable to access camera. Please try manual entry.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        stopCamera()
        analyzeImage(imageData)
      }
    }
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

  const retakePhoto = () => {
    setCapturedImage(null)
    setAiAnalysis(null)
    startCamera()
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

        {/* Camera Permission Error */}
        {cameraPermissionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">Camera Access Required</h3>
                <p className="text-sm text-red-700 whitespace-pre-line">{cameraPermissionError}</p>
                {showPermissionHelp && (
                  <button
                    onClick={() => setManualEntry(true)}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 underline"
                  >
                    Use manual entry instead
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Camera/Photo Section */}
        {!manualEntry && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Take Photo</h2>

            {!cameraActive && !capturedImage && (
              <div className="space-y-4">
                <button
                  onClick={startCamera}
                  className="btn btn-primary w-full"
                  aria-label="Start camera to take photo"
                >
                  📸 Open Camera
                </button>
                <button
                  onClick={() => setManualEntry(true)}
                  className="btn btn-secondary w-full"
                  aria-label="Enter meal details manually"
                >
                  ✏️ Manual Entry
                </button>
              </div>
            )}

            {cameraActive && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                    aria-label="Camera preview"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-lg"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={capturePhoto}
                    className="btn btn-primary flex-1"
                    aria-label="Capture photo"
                  >
                    📷 Capture
                  </button>
                  <button
                    onClick={stopCamera}
                    className="btn btn-secondary"
                    aria-label="Cancel camera"
                  >
                    ✕
                  </button>
                </div>
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
                  <button
                    onClick={retakePhoto}
                    className="btn btn-secondary w-full"
                    aria-label="Retake photo"
                  >
                    🔄 Retake Photo
                  </button>
                )}
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
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
                <button
                  onClick={retakePhoto}
                  className="btn btn-secondary"
                  aria-label="Retake photo"
                >
                  🔄 Retake
                </button>
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