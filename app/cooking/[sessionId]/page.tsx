'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { CookingTimer } from '@/components/ui/CookingTimer'
import { cookingSessionOperations } from '@/lib/firebase-operations'
import { CookingSession } from '@/types'
import { MEAL_SUGGESTIONS } from '@/lib/meal-suggestions'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

function CookingSessionContent() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<CookingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // Load session
  useEffect(() => {
    async function loadSession() {
      try {
        const sessionData = await cookingSessionOperations.getCookingSession(sessionId)
        setSession(sessionData as CookingSession)
      } catch (error) {
        console.error('Error loading cooking session:', error)
        toast.error('Failed to load cooking session')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadSession()
    }
  }, [sessionId, router])

  // Get recipe details
  const recipe = session ? MEAL_SUGGESTIONS.find(r => r.id === session.recipeId) : null

  const handleNextStep = async () => {
    if (!session || !recipe) return

    const nextStep = session.currentStep + 1

    if (nextStep >= session.totalSteps) {
      // Completed all steps!
      setShowCompletionModal(true)
    } else {
      // Move to next step
      try {
        await cookingSessionOperations.updateCookingSession(sessionId, {
          currentStep: nextStep
        })
        setSession({ ...session, currentStep: nextStep })
      } catch (error) {
        console.error('Error updating step:', error)
        toast.error('Failed to update step')
      }
    }
  }

  const handlePreviousStep = async () => {
    if (!session) return

    const prevStep = Math.max(0, session.currentStep - 1)

    try {
      await cookingSessionOperations.updateCookingSession(sessionId, {
        currentStep: prevStep
      })
      setSession({ ...session, currentStep: prevStep })
    } catch (error) {
      console.error('Error updating step:', error)
      toast.error('Failed to update step')
    }
  }

  const handlePauseSession = async () => {
    if (!session) return

    try {
      await cookingSessionOperations.updateCookingSession(sessionId, {
        status: 'paused',
        pausedAt: new Date()
      })
      toast.success('Session paused')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error pausing session:', error)
      toast.error('Failed to pause session')
    }
  }

  const handleCompleteSession = async () => {
    if (!session) return

    try {
      await cookingSessionOperations.updateCookingSession(sessionId, {
        status: 'completed',
        completedAt: new Date()
      })

      // Redirect to meal logging with recipe data
      const queryParams = new URLSearchParams({
        fromRecipe: 'true',
        recipeId: session.recipeId,
        sessionId: sessionId,
        mealType: session.mealType,
        servings: session.servingSize.toString()
      })

      router.push(`/log-meal?${queryParams.toString()}`)
    } catch (error) {
      console.error('Error completing session:', error)
      toast.error('Failed to complete session')
    }
  }

  const toggleIngredient = (index: number) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-health-bg to-primary-light flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-health-bg to-primary-light flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg p-8 text-center max-w-md">
          <p className="text-foreground mb-4">Cooking session not found</p>
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const currentStepData = session.stepTimers[session.currentStep]
  const progress = ((session.currentStep + 1) / session.totalSteps) * 100

  return (
    <main className="min-h-screen bg-gradient-to-br from-health-bg to-primary-light">
      <PageHeader
        title={`Cooking: ${session.recipeName}`}
        subtitle={`Step ${session.currentStep + 1} of ${session.totalSteps}`}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="bg-background rounded-lg shadow-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-success h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Steps & Timer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Step */}
            <div className="bg-background rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">
                  Step {session.currentStep + 1}
                </h2>
                <span className="text-sm bg-primary-light text-primary px-3 py-1 rounded-full font-medium">
                  {recipe.mealType}
                </span>
              </div>

              <p className="text-lg text-foreground mb-6 leading-relaxed">
                {currentStepData.stepText}
              </p>

              {/* Timer (if step has duration) */}
              {currentStepData.duration && (
                <CookingTimer
                  duration={currentStepData.duration}
                  stepText={currentStepData.stepText}
                  autoStart={false}
                  onComplete={() => toast.success('Timer complete!')}
                />
              )}

              {!currentStepData.duration && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No timer needed for this step. Mark it complete when ready!
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="bg-background rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between space-x-4">
                <button
                  onClick={handlePreviousStep}
                  disabled={session.currentStep === 0}
                  className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <button
                  onClick={handlePauseSession}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  Pause & Save
                </button>

                <button
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium flex items-center space-x-2"
                >
                  <span>{session.currentStep === session.totalSteps - 1 ? 'Complete' : 'Next Step'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Ingredients & Info */}
          <div className="space-y-6">
            {/* Recipe Info */}
            <div className="bg-background rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-foreground mb-4">Recipe Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servings:</span>
                  <span className="font-medium text-foreground">{session.servingSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calories:</span>
                  <span className="font-medium text-foreground">{session.scaledCalories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein:</span>
                  <span className="font-medium text-foreground">{session.scaledMacros.protein}g</span>
                </div>
              </div>
            </div>

            {/* Ingredients Checklist */}
            <div className="bg-background rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-foreground mb-4">Ingredients</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {session.scaledIngredients.map((ingredient, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start space-x-3 p-2 rounded hover:bg-muted cursor-pointer transition-colors ${
                      checkedIngredients.has(idx) ? 'bg-primary-light/30' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedIngredients.has(idx)}
                      onChange={() => toggleIngredient(idx)}
                      className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    />
                    <span className={`text-sm flex-1 ${checkedIngredients.has(idx) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {ingredient}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-foreground mb-4">You Did It!</h2>
            <p className="text-muted-foreground mb-6">
              Congratulations on completing <strong>{session.recipeName}</strong>! Now let's log this delicious meal.
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Meal summary:</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Servings:</span>
                  <span className="font-medium">{session.servingSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Calories:</span>
                  <span className="font-medium">{session.scaledCalories}</span>
                </div>
                <div className="flex justify-between">
                  <span>Protein:</span>
                  <span className="font-medium">{session.scaledMacros.protein}g</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteSession}
              className="w-full px-6 py-3 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium mb-3"
            >
              Take Photo & Log Meal
            </button>

            <button
              onClick={() => setShowCompletionModal(false)}
              className="w-full px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted-hover transition-colors font-medium"
            >
              Continue Cooking
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function CookingSessionPage() {
  return (
    <AuthGuard>
      <CookingSessionContent />
    </AuthGuard>
  )
}
